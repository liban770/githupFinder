import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

// Users table (Firebase Auth linked)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Cached GitHub Profiles
export const githubProfiles = pgTable(
  'github_profiles',
  {
    id: serial('id').primaryKey(),
    githubId: integer('github_id').notNull(),
    username: varchar('username', { length: 100 }).notNull().unique(),
    name: varchar('name', { length: 255 }),
    avatarUrl: text('avatar_url').notNull(),
    bio: text('bio'),
    company: varchar('company', { length: 255 }),
    blog: text('blog'),
    location: varchar('location', { length: 255 }),
    email: varchar('email', { length: 255 }),
    publicRepos: integer('public_repos').notNull().default(0),
    publicGists: integer('public_gists').notNull().default(0),
    followers: integer('followers').notNull().default(0),
    following: integer('following').notNull().default(0),
    rawPayload: jsonb('raw_payload'),
    cachedAt: timestamp('cached_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_github_profiles_username').on(table.username),
  ]
);

// Top/Pinned Repositories for a cached user
export const githubRepositories = pgTable(
  'github_repositories',
  {
    id: serial('id').primaryKey(),
    profileId: integer('profile_id')
      .notNull()
      .references(() => githubProfiles.id, { onDelete: 'cascade' }),
    githubRepoId: integer('github_repo_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    description: text('description'),
    htmlUrl: text('html_url').notNull(),
    stargazersCount: integer('stargazers_count').notNull().default(0),
    forksCount: integer('forks_count').notNull().default(0),
    language: varchar('language', { length: 100 }),
    topics: jsonb('topics').$type<string[]>().default([]),
    isFork: boolean('is_fork').default(false),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_github_repos_profile_id').on(table.profileId),
  ]
);

// Search Log / Analytics
export const searchLogs = pgTable('search_logs', {
  id: serial('id').primaryKey(),
  queriedUsername: varchar('queried_username', { length: 100 }).notNull(),
  wasCacheHit: boolean('was_cache_hit').notNull().default(false),
  responseTimeMs: integer('response_time_ms').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// User Bookmarks (For saving favorite profiles locally)
export const bookmarkedProfiles = pgTable('bookmarked_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  profileId: integer('profile_id')
    .notNull()
    .references(() => githubProfiles.id, { onDelete: 'cascade' }),
  tags: jsonb('tags').$type<string[]>().default([]),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  bookmarks: many(bookmarkedProfiles),
}));

export const githubProfilesRelations = relations(githubProfiles, ({ many }) => ({
  repositories: many(githubRepositories),
  bookmarks: many(bookmarkedProfiles),
}));

export const githubRepositoriesRelations = relations(githubRepositories, ({ one }) => ({
  profile: one(githubProfiles, {
    fields: [githubRepositories.profileId],
    references: [githubProfiles.id],
  }),
}));

export const bookmarkedProfilesRelations = relations(bookmarkedProfiles, ({ one }) => ({
  user: one(users, {
    fields: [bookmarkedProfiles.userId],
    references: [users.id],
  }),
  profile: one(githubProfiles, {
    fields: [bookmarkedProfiles.profileId],
    references: [githubProfiles.id],
  }),
}));
