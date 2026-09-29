import { eq, desc, sql, count } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  githubProfiles,
  githubRepositories,
  searchLogs,
  bookmarkedProfiles,
  users,
} from '../db/schema.ts';
import { GitHubService } from './github.service.ts';
import {
  CachedProfileData,
  CachedRepoData,
  ProfileQueryResult,
  SearchTelemetryStats,
  BookmarkedProfileRecord,
} from '../types/github.ts';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export class ProfileService {
  /**
   * Read-through cache fetch for a GitHub user profile
   */
  static async getProfile(username: string, forceFresh = false): Promise<ProfileQueryResult> {
    const startTime = Date.now();
    const cleanQuery = username.trim().replace(/^@/, '');

    if (!cleanQuery) {
      throw new Error('Please enter a developer name or GitHub username.');
    }

    // 1. Check local Cloud SQL cache (match by username OR full name)
    let cachedProfile: CachedProfileData | null = null;
    try {
      const profileRow = await db
        .select()
        .from(githubProfiles)
        .where(
          sql`LOWER(${githubProfiles.username}) = LOWER(${cleanQuery}) OR LOWER(${githubProfiles.name}) = LOWER(${cleanQuery})`
        )
        .limit(1);

      if (profileRow.length > 0) {
        const repoRows = await db
          .select()
          .from(githubRepositories)
          .where(eq(githubRepositories.profileId, profileRow[0].id))
          .orderBy(desc(githubRepositories.stargazersCount));

        cachedProfile = {
          ...profileRow[0],
          cachedAt: profileRow[0].cachedAt?.toISOString() || new Date().toISOString(),
          updatedAt: profileRow[0].updatedAt?.toISOString() || new Date().toISOString(),
          repositories: repoRows.map((r) => ({
            id: r.id,
            profileId: r.profileId,
            githubRepoId: r.githubRepoId,
            name: r.name,
            fullName: r.fullName,
            description: r.description,
            htmlUrl: r.htmlUrl,
            stargazersCount: r.stargazersCount,
            forksCount: r.forksCount,
            language: r.language,
            topics: (r.topics as string[]) || [],
            isFork: r.isFork || false,
            updatedAt: r.updatedAt?.toISOString() || new Date().toISOString(),
          })),
        };
      }
    } catch (dbErr) {
      console.warn('Database cache read warning:', dbErr);
    }

    const isFresh =
      cachedProfile &&
      Date.now() - new Date(cachedProfile.cachedAt).getTime() < CACHE_TTL_MS;

    // Cache Hit & Fresh (unless user explicitly requested force fresh)
    if (cachedProfile && isFresh && !forceFresh) {
      const responseTimeMs = Date.now() - startTime;

      // Asynchronously log search telemetry
      this.logSearch(cleanQuery, true, responseTimeMs).catch(() => {});

      return {
        data: cachedProfile,
        source: 'database',
        responseTimeMs,
        matchedFromQuery:
          cachedProfile.username.toLowerCase() !== cleanQuery.toLowerCase()
            ? cleanQuery
            : undefined,
      };
    }

    // 2. Fetch fresh data from GitHub REST API
    try {
      const { user, rateLimit, matchedFromQuery } = await GitHubService.fetchUserProfile(cleanQuery);
      const repos = await GitHubService.fetchTopRepos(user.login);
      const normalizedUsername = user.login.toLowerCase();

      // 3. Upsert Profile into PostgreSQL
      const [savedProfile] = await db
        .insert(githubProfiles)
        .values({
          githubId: user.id,
          username: normalizedUsername,
          name: user.name,
          avatarUrl: user.avatar_url,
          bio: user.bio,
          company: user.company,
          blog: user.blog,
          location: user.location,
          email: user.email,
          publicRepos: user.public_repos,
          publicGists: user.public_gists,
          followers: user.followers,
          following: user.following,
          rawPayload: user,
          cachedAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: githubProfiles.username,
          set: {
            githubId: user.id,
            name: user.name,
            avatarUrl: user.avatar_url,
            bio: user.bio,
            company: user.company,
            blog: user.blog,
            location: user.location,
            email: user.email,
            publicRepos: user.public_repos,
            publicGists: user.public_gists,
            followers: user.followers,
            following: user.following,
            rawPayload: user,
            cachedAt: new Date(),
            updatedAt: new Date(),
          },
        })
        .returning();

      // Upsert/Refresh repositories
      if (repos.length > 0) {
        await db
          .delete(githubRepositories)
          .where(eq(githubRepositories.profileId, savedProfile.id));

        const reposToInsert = repos.map((r) => ({
          profileId: savedProfile.id,
          githubRepoId: r.id,
          name: r.name,
          fullName: r.full_name,
          description: r.description,
          htmlUrl: r.html_url,
          stargazersCount: r.stargazers_count,
          forksCount: r.forks_count,
          language: r.language,
          topics: r.topics || [],
          isFork: r.fork || false,
          updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
        }));

        await db.insert(githubRepositories).values(reposToInsert);
      }

      // Re-fetch formatted repositories
      const updatedRepos = await db
        .select()
        .from(githubRepositories)
        .where(eq(githubRepositories.profileId, savedProfile.id))
        .orderBy(desc(githubRepositories.stargazersCount));

      const responseTimeMs = Date.now() - startTime;
      await this.logSearch(cleanQuery, false, responseTimeMs);

      const formattedResult: CachedProfileData = {
        ...savedProfile,
        cachedAt: savedProfile.cachedAt?.toISOString() || new Date().toISOString(),
        updatedAt: savedProfile.updatedAt?.toISOString() || new Date().toISOString(),
        repositories: updatedRepos.map((r) => ({
          id: r.id,
          profileId: r.profileId,
          githubRepoId: r.githubRepoId,
          name: r.name,
          fullName: r.fullName,
          description: r.description,
          htmlUrl: r.htmlUrl,
          stargazersCount: r.stargazersCount,
          forksCount: r.forksCount,
          language: r.language,
          topics: (r.topics as string[]) || [],
          isFork: r.isFork || false,
          updatedAt: r.updatedAt?.toISOString() || new Date().toISOString(),
        })),
      };

      return {
        data: formattedResult,
        source: 'api',
        responseTimeMs,
        rateLimit,
        matchedFromQuery,
      };
    } catch (fetchErr: any) {
      if (cachedProfile) {
        const responseTimeMs = Date.now() - startTime;
        console.warn(
          `Serving STALE_FALLBACK for ${cleanQuery} due to GitHub error:`,
          fetchErr.message
        );
        return {
          data: cachedProfile,
          source: 'stale_fallback',
          responseTimeMs,
        };
      }

      if (fetchErr.message === 'USER_NOT_FOUND') {
        throw new Error(
          `No authentic GitHub developer account was found matching "${cleanQuery}". Please check the spelling or search by their exact @username.`
        );
      }

      if (fetchErr.message?.startsWith('RATE_LIMIT_EXCEEDED')) {
        const resetInfo = fetchErr.message.split(':')[1] || 'later';
        throw new Error(
          `GitHub API rate limit exhausted. Resets at ${resetInfo}. (Tip: cached profiles still load instantly!)`
        );
      }

      throw fetchErr;
    }
  }

  /**
   * Log search analytics
   */
  private static async logSearch(
    queriedUsername: string,
    wasCacheHit: boolean,
    responseTimeMs: number
  ) {
    try {
      await db.insert(searchLogs).values({
        queriedUsername,
        wasCacheHit,
        responseTimeMs,
      });
    } catch (err) {
      console.error('Failed to log search telemetry:', err);
    }
  }

  /**
   * Get telemetry analytics
   */
  static async getTelemetryStats(): Promise<SearchTelemetryStats> {
    try {
      const [totalSearchesResult] = await db
        .select({ count: count() })
        .from(searchLogs);
      const totalSearches = Number(totalSearchesResult?.count || 0);

      const [cacheHitsResult] = await db
        .select({ count: count() })
        .from(searchLogs)
        .where(eq(searchLogs.wasCacheHit, true));
      const cacheHits = Number(cacheHitsResult?.count || 0);
      const cacheMisses = totalSearches - cacheHits;

      const cacheHitRatio =
        totalSearches > 0 ? Math.round((cacheHits / totalSearches) * 100) : 0;

      const [avgTimeResult] = await db
        .select({
          avg: sql<number>`COALESCE(AVG(${searchLogs.responseTimeMs}), 0)`,
        })
        .from(searchLogs);
      const averageResponseTimeMs = Math.round(Number(avgTimeResult?.avg || 0));

      const [profilesCountResult] = await db
        .select({ count: count() })
        .from(githubProfiles);
      const cachedProfilesCount = Number(profilesCountResult?.count || 0);

      const recentLogs = await db
        .select()
        .from(searchLogs)
        .orderBy(desc(searchLogs.createdAt))
        .limit(10);

      return {
        totalSearches,
        cacheHits,
        cacheMisses,
        cacheHitRatio,
        averageResponseTimeMs,
        cachedProfilesCount,
        recentSearches: recentLogs.map((l) => ({
          username: l.queriedUsername,
          wasCacheHit: l.wasCacheHit,
          responseTimeMs: l.responseTimeMs,
          createdAt: l.createdAt?.toISOString() || new Date().toISOString(),
        })),
      };
    } catch (error) {
      console.error('Failed to fetch telemetry:', error);
      return {
        totalSearches: 0,
        cacheHits: 0,
        cacheMisses: 0,
        cacheHitRatio: 0,
        averageResponseTimeMs: 0,
        cachedProfilesCount: 0,
        recentSearches: [],
      };
    }
  }

  /**
   * Get all cached profiles in PostgreSQL database
   */
  static async getCachedProfilesList(): Promise<
    { username: string; name: string | null; avatarUrl: string; followers: number; publicRepos: number; cachedAt: string }[]
  > {
    try {
      const rows = await db
        .select({
          username: githubProfiles.username,
          name: githubProfiles.name,
          avatarUrl: githubProfiles.avatarUrl,
          followers: githubProfiles.followers,
          publicRepos: githubProfiles.publicRepos,
          cachedAt: githubProfiles.cachedAt,
        })
        .from(githubProfiles)
        .orderBy(desc(githubProfiles.updatedAt))
        .limit(20);

      return rows.map((r) => ({
        ...r,
        cachedAt: r.cachedAt?.toISOString() || new Date().toISOString(),
      }));
    } catch (err) {
      console.error('Failed to get cached profiles list:', err);
      return [];
    }
  }

  /**
   * Bookmarks management
   */
  static async getBookmarks(userUid?: string): Promise<BookmarkedProfileRecord[]> {
    try {
      let query = db
        .select({
          bookmark: bookmarkedProfiles,
          profile: githubProfiles,
        })
        .from(bookmarkedProfiles)
        .innerJoin(
          githubProfiles,
          eq(bookmarkedProfiles.profileId, githubProfiles.id)
        );

      let targetUserId: number | undefined;
      if (userUid) {
        const userRecord = await db
          .select()
          .from(users)
          .where(eq(users.uid, userUid))
          .limit(1);
        if (userRecord.length > 0) {
          targetUserId = userRecord[0].id;
        }
      }

      const rows = await (targetUserId
        ? query
            .where(eq(bookmarkedProfiles.userId, targetUserId))
            .orderBy(desc(bookmarkedProfiles.createdAt))
        : query.orderBy(desc(bookmarkedProfiles.createdAt)));

      const results: BookmarkedProfileRecord[] = [];

      for (const row of rows) {
        const repos = await db
          .select()
          .from(githubRepositories)
          .where(eq(githubRepositories.profileId, row.profile.id))
          .orderBy(desc(githubRepositories.stargazersCount))
          .limit(6);

        results.push({
          id: row.bookmark.id,
          userId: row.bookmark.userId,
          profileId: row.bookmark.profileId,
          tags: (row.bookmark.tags as string[]) || [],
          notes: row.bookmark.notes,
          createdAt: row.bookmark.createdAt?.toISOString() || new Date().toISOString(),
          profile: {
            ...row.profile,
            cachedAt: row.profile.cachedAt?.toISOString() || new Date().toISOString(),
            updatedAt: row.profile.updatedAt?.toISOString() || new Date().toISOString(),
            repositories: repos.map((r) => ({
              id: r.id,
              profileId: r.profileId,
              githubRepoId: r.githubRepoId,
              name: r.name,
              fullName: r.fullName,
              description: r.description,
              htmlUrl: r.htmlUrl,
              stargazersCount: r.stargazersCount,
              forksCount: r.forksCount,
              language: r.language,
              topics: (r.topics as string[]) || [],
              isFork: r.isFork || false,
              updatedAt: r.updatedAt?.toISOString() || new Date().toISOString(),
            })),
          },
        });
      }

      return results;
    } catch (err) {
      console.error('Failed to get bookmarks:', err);
      return [];
    }
  }

  static async addBookmark(
    profileId: number,
    userUid?: string,
    notes?: string,
    tags?: string[]
  ) {
    let targetUserId: number | null = null;
    if (userUid) {
      const userRecord = await db
        .select()
        .from(users)
        .where(eq(users.uid, userUid))
        .limit(1);
      if (userRecord.length > 0) {
        targetUserId = userRecord[0].id;
      }
    }

    const [created] = await db
      .insert(bookmarkedProfiles)
      .values({
        userId: targetUserId,
        profileId,
        notes: notes || '',
        tags: tags || [],
      })
      .returning();

    return created;
  }

  static async updateBookmark(
    bookmarkId: number,
    notes?: string,
    tags?: string[]
  ) {
    const [updated] = await db
      .update(bookmarkedProfiles)
      .set({
        notes: notes !== undefined ? notes : undefined,
        tags: tags !== undefined ? tags : undefined,
      })
      .where(eq(bookmarkedProfiles.id, bookmarkId))
      .returning();

    return updated;
  }

  static async removeBookmark(bookmarkId: number) {
    await db
      .delete(bookmarkedProfiles)
      .where(eq(bookmarkedProfiles.id, bookmarkId));
    return { success: true };
  }

  static async checkIsBookmarked(profileId: number, userUid?: string): Promise<{ isBookmarked: boolean; bookmarkId?: number }> {
    let targetUserId: number | undefined;
    if (userUid) {
      const userRecord = await db
        .select()
        .from(users)
        .where(eq(users.uid, userUid))
        .limit(1);
      if (userRecord.length > 0) {
        targetUserId = userRecord[0].id;
      }
    }

    const rows = await db
      .select()
      .from(bookmarkedProfiles)
      .where(
        targetUserId
          ? sql`${bookmarkedProfiles.profileId} = ${profileId} AND ${bookmarkedProfiles.userId} = ${targetUserId}`
          : eq(bookmarkedProfiles.profileId, profileId)
      )
      .limit(1);

    if (rows.length > 0) {
      return { isBookmarked: true, bookmarkId: rows[0].id };
    }
    return { isBookmarked: false };
  }
}
