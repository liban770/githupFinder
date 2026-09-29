import { GitHubUserResponse, GitHubRepoResponse } from '../types/github.ts';

const GITHUB_API_URL = 'https://api.github.com';

export interface GitHubRateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

export class GitHubService {
  private static getHeaders() {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'GitHub-Profile-Finder-AIS',
    };

    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    return headers;
  }

  static parseRateLimit(headers: Headers): GitHubRateLimitInfo {
    const limit = parseInt(headers.get('x-ratelimit-limit') || '60', 10);
    const remaining = parseInt(headers.get('x-ratelimit-remaining') || '60', 10);
    const reset = parseInt(headers.get('x-ratelimit-reset') || '0', 10);

    return { limit, remaining, reset };
  }

  /**
   * Search GitHub User by username, real full name, or search query.
   * Catches authentic GitHub accounts and rejects non-existent or false accounts.
   */
  static async fetchUserProfile(query: string): Promise<{
    user: GitHubUserResponse;
    rateLimit: GitHubRateLimitInfo;
    matchedFromQuery?: string;
  }> {
    const cleanQuery = query.trim().replace(/^@/, '');
    if (!cleanQuery) {
      throw new Error('INVALID_USERNAME');
    }

    const isValidHandle = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(cleanQuery);

    // If it's a valid handle shape, try direct fetch first
    if (isValidHandle) {
      try {
        const res = await fetch(`${GITHUB_API_URL}/users/${encodeURIComponent(cleanQuery)}`, {
          headers: this.getHeaders(),
        });

        const rateLimit = this.parseRateLimit(res.headers);

        if (res.status === 403 || res.status === 429) {
          const resetDate = rateLimit.reset ? new Date(rateLimit.reset * 1000).toLocaleTimeString() : 'soon';
          throw new Error(`RATE_LIMIT_EXCEEDED:${resetDate}`);
        }

        if (res.ok) {
          const user = (await res.json()) as GitHubUserResponse;
          return { user, rateLimit };
        }
      } catch (err: any) {
        if (err.message?.startsWith('RATE_LIMIT_EXCEEDED')) throw err;
        // Proceed to fallback search
      }
    }

    // Fallback: Smart GitHub User Search (catches real names, typos, or full names like "Dan Abramov", "Guido van Rossum")
    const searchRes = await fetch(
      `${GITHUB_API_URL}/search/users?q=${encodeURIComponent(cleanQuery)}&per_page=5`,
      { headers: this.getHeaders() }
    );

    const rateLimit = this.parseRateLimit(searchRes.headers);

    if (searchRes.status === 403 || searchRes.status === 429) {
      const resetDate = rateLimit.reset ? new Date(rateLimit.reset * 1000).toLocaleTimeString() : 'soon';
      throw new Error(`RATE_LIMIT_EXCEEDED:${resetDate}`);
    }

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.items && searchData.items.length > 0) {
        const bestMatchLogin = searchData.items[0].login;
        // Fetch full verified profile for top match
        const profileRes = await fetch(`${GITHUB_API_URL}/users/${encodeURIComponent(bestMatchLogin)}`, {
          headers: this.getHeaders(),
        });
        if (profileRes.ok) {
          const user = (await profileRes.json()) as GitHubUserResponse;
          return {
            user,
            rateLimit: this.parseRateLimit(profileRes.headers),
            matchedFromQuery: cleanQuery,
          };
        }
      }
    }

    throw new Error('USER_NOT_FOUND');
  }

  static async fetchTopRepos(username: string): Promise<GitHubRepoResponse[]> {
    const cleanUsername = username.trim().replace(/^@/, '');
    try {
      const res = await fetch(
        `${GITHUB_API_URL}/users/${encodeURIComponent(cleanUsername)}/repos?sort=updated&per_page=12`,
        { headers: this.getHeaders() }
      );

      if (!res.ok) {
        return [];
      }

      const repos = (await res.json()) as GitHubRepoResponse[];
      return repos;
    } catch (err) {
      console.error('Failed to fetch repositories for', cleanUsername, err);
      return [];
    }
  }

  static async checkRateLimit(): Promise<GitHubRateLimitInfo> {
    try {
      const res = await fetch(`${GITHUB_API_URL}/rate_limit`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const core = data.resources?.core || {};
        return {
          limit: core.limit ?? 60,
          remaining: core.remaining ?? 60,
          reset: core.reset ?? Math.floor(Date.now() / 1000) + 3600,
        };
      }
    } catch (e) {
      console.warn('Could not fetch rate limit directly:', e);
    }

    return {
      limit: 60,
      remaining: 60,
      reset: Math.floor(Date.now() / 1000) + 3600,
    };
  }

  static async searchUsers(query: string): Promise<{ login: string; avatar_url: string }[]> {
    const cleanQuery = query.trim().replace(/^@/, '');
    if (!cleanQuery || cleanQuery.length < 2) return [];

    try {
      const res = await fetch(
        `${GITHUB_API_URL}/search/users?q=${encodeURIComponent(cleanQuery)}&per_page=8`,
        { headers: this.getHeaders() }
      );
      if (!res.ok) return [];

      const data = await res.json();
      return (data.items || []).map((item: any) => ({
        login: item.login,
        avatar_url: item.avatar_url,
      }));
    } catch {
      return [];
    }
  }
}
