export interface GitHubUserResponse {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  twitter_username?: string | null;
  html_url?: string;
  created_at?: string;
}

export interface GitHubRepoResponse {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics?: string[];
  fork: boolean;
  updated_at?: string;
  open_issues_count?: number;
  default_branch?: string;
}

export interface CachedProfileData {
  id: number;
  githubId: number;
  username: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  publicRepos: number;
  publicGists: number;
  followers: number;
  following: number;
  rawPayload: any;
  cachedAt: string;
  updatedAt: string;
  repositories: CachedRepoData[];
}

export interface CachedRepoData {
  id: number;
  profileId: number;
  githubRepoId: number;
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  stargazersCount: number;
  forksCount: number;
  language: string | null;
  topics: string[];
  isFork: boolean;
  updatedAt: string;
}

export interface ProfileQueryResult {
  data: CachedProfileData;
  source: 'database' | 'api' | 'stale_fallback';
  responseTimeMs: number;
  matchedFromQuery?: string;
  rateLimit?: {
    remaining: number;
    limit: number;
    reset: number;
  };
}

export interface BookmarkedProfileRecord {
  id: number;
  userId?: number | null;
  profileId: number;
  tags: string[];
  notes: string | null;
  createdAt: string;
  profile: CachedProfileData;
}

export interface SearchTelemetryStats {
  totalSearches: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRatio: number;
  averageResponseTimeMs: number;
  cachedProfilesCount: number;
  recentSearches: {
    username: string;
    wasCacheHit: boolean;
    responseTimeMs: number;
    createdAt: string;
  }[];
}
