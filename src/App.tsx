/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Header } from './components/Header.tsx';
import { SearchInput } from './components/SearchInput.tsx';
import { TelemetryBar } from './components/TelemetryBar.tsx';
import { ProfileCard } from './components/ProfileCard.tsx';
import { RepoList } from './components/RepoList.tsx';
import { BookmarksView } from './components/BookmarksView.tsx';
import { AnalyticsView } from './components/AnalyticsView.tsx';
import { CompareView } from './components/CompareView.tsx';
import { ProfileQueryResult, BookmarkedProfileRecord } from './types/github.ts';
import { AlertCircle, Loader2, Sparkles, HelpCircle } from 'lucide-react';

function GitHubFinderContent() {
  const { user, idToken } = useAuth();
  const [activeTab, setActiveTab] = useState<'search' | 'bookmarks' | 'analytics' | 'compare'>('search');
  const [currentUsername, setCurrentUsername] = useState<string>('Dan Abramov');
  const [profileResult, setProfileResult] = useState<ProfileQueryResult | null>(null);
  const [isSearchLoading, setIsSearchLoading] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Bookmarks state
  const [bookmarks, setBookmarks] = useState<BookmarkedProfileRecord[]>([]);
  const [isBookmarkLoading, setIsBookmarkLoading] = useState<boolean>(false);
  const [isCurrentBookmarked, setIsCurrentBookmarked] = useState<boolean>(false);
  const [currentBookmarkId, setCurrentBookmarkId] = useState<number | undefined>(undefined);

  // Fetch bookmarks
  const fetchBookmarks = async () => {
    try {
      const headers: Record<string, string> = {};
      if (idToken) {
        headers.Authorization = `Bearer ${idToken}`;
      }
      const res = await fetch('/api/bookmarks', { headers });
      if (res.ok) {
        const data = await res.json();
        setBookmarks(data);
      }
    } catch (err) {
      console.error('Failed to fetch bookmarks:', err);
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, [idToken]);

  // Check bookmark status whenever profile or bookmarks change
  useEffect(() => {
    if (profileResult?.data) {
      const found = bookmarks.find((b) => b.profileId === profileResult.data.id);
      if (found) {
        setIsCurrentBookmarked(true);
        setCurrentBookmarkId(found.id);
      } else {
        setIsCurrentBookmarked(false);
        setCurrentBookmarkId(undefined);
      }
    }
  }, [profileResult, bookmarks]);

  // Execute Search / Load Profile with intelligent name catching
  const handleSearch = async (queryInput: string, forceFresh = false) => {
    const cleanQuery = queryInput.trim();
    if (!cleanQuery) return;

    setIsSearchLoading(true);
    setSearchError(null);
    setCurrentUsername(cleanQuery);

    try {
      const queryUrl = `/api/github/user/${encodeURIComponent(cleanQuery)}${
        forceFresh ? '?force=true' : ''
      }`;
      const res = await fetch(queryUrl);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch user profile');
      }

      setProfileResult(json);
      setActiveTab('search');
    } catch (err: any) {
      setSearchError(err.message || 'An error occurred while querying GitHub');
    } finally {
      setIsSearchLoading(false);
    }
  };

  // Initial load with famous developer Dan Abramov (testing name resolution)
  useEffect(() => {
    handleSearch('Dan Abramov');
  }, []);

  // Bookmark Toggle
  const handleToggleBookmark = async (tags: string[], notes: string) => {
    if (!profileResult?.data) return;

    setIsBookmarkLoading(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (idToken) headers.Authorization = `Bearer ${idToken}`;

      if (isCurrentBookmarked && currentBookmarkId) {
        // Remove bookmark
        const res = await fetch(`/api/bookmarks/${currentBookmarkId}`, {
          method: 'DELETE',
          headers,
        });
        if (res.ok) {
          setIsCurrentBookmarked(false);
          setCurrentBookmarkId(undefined);
          await fetchBookmarks();
        }
      } else {
        // Add bookmark
        const res = await fetch('/api/bookmarks', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            profileId: profileResult.data.id,
            tags,
            notes,
          }),
        });
        if (res.ok) {
          const created = await res.json();
          setIsCurrentBookmarked(true);
          setCurrentBookmarkId(created.id);
          await fetchBookmarks();
        }
      }
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    } finally {
      setIsBookmarkLoading(false);
    }
  };

  // Bookmark Update
  const handleUpdateBookmark = async (id: number, notes: string, tags: string[]) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (idToken) headers.Authorization = `Bearer ${idToken}`;

      const res = await fetch(`/api/bookmarks/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ notes, tags }),
      });
      if (res.ok) {
        await fetchBookmarks();
      }
    } catch (err) {
      console.error('Failed to update bookmark:', err);
    }
  };

  // Bookmark Delete
  const handleDeleteBookmark = async (id: number) => {
    try {
      const headers: Record<string, string> = {};
      if (idToken) headers.Authorization = `Bearer ${idToken}`;

      const res = await fetch(`/api/bookmarks/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        await fetchBookmarks();
      }
    } catch (err) {
      console.error('Failed to delete bookmark:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0817] text-purple-100 flex flex-col selection:bg-purple-500/40 selection:text-white">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        bookmarksCount={bookmarks.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'search' && (
          <div>
            {/* Search Input Bar */}
            <SearchInput
              onSearch={handleSearch}
              isLoading={isSearchLoading}
              currentUsername={currentUsername}
            />

            {/* Error Message with Help Suggestions */}
            {searchError && (
              <div className="max-w-3xl mx-auto mb-8 p-5 rounded-2xl bg-[#260f1b]/90 border border-rose-800/80 text-rose-300 text-xs shadow-xl space-y-2">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-rose-200 text-sm">Account Verification Error</h4>
                    <p className="mt-0.5 opacity-90 leading-relaxed">{searchError}</p>
                  </div>
                </div>

                <div className="pt-2 pl-8 border-t border-rose-900/50 flex items-center gap-2 text-rose-300/80">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>
                    Tip: Try searching with their full name (e.g. "Dan Abramov") or exact GitHub @handle (e.g. "gaearon").
                  </span>
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isSearchLoading && !profileResult && (
              <div className="text-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-purple-400 mx-auto mb-3" />
                <p className="text-sm text-purple-300 font-mono">
                  Catching authentic GitHub account & querying Cloud SQL Cache...
                </p>
              </div>
            )}

            {/* Profile Result Display */}
            {profileResult && (
              <div className="animate-in fade-in duration-300">
                {/* Telemetry and Cache Hit Bar */}
                <TelemetryBar
                  result={profileResult}
                  onRefreshFresh={() => handleSearch(profileResult.data.username, true)}
                  isLoading={isSearchLoading}
                />

                {/* Profile Card */}
                <ProfileCard
                  profile={profileResult.data}
                  isBookmarked={isCurrentBookmarked}
                  onToggleBookmark={handleToggleBookmark}
                  isBookmarkLoading={isBookmarkLoading}
                />

                {/* Repositories Grid */}
                <RepoList
                  repositories={profileResult.data.repositories || []}
                  username={profileResult.data.username}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'bookmarks' && (
          <BookmarksView
            bookmarks={bookmarks}
            onSelectUser={(username) => handleSearch(username)}
            onUpdateBookmark={handleUpdateBookmark}
            onDeleteBookmark={handleDeleteBookmark}
            isLoading={isBookmarkLoading}
          />
        )}

        {activeTab === 'compare' && (
          <CompareView onSelectUser={(username) => handleSearch(username)} />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView onSelectUser={(username) => handleSearch(username)} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-950/80 bg-[#080511] py-6 text-center text-xs text-purple-400/60">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>GitHub Profile Finder • Powered by Cloud SQL PostgreSQL & GitHub REST API</span>
          <div className="flex items-center gap-4 text-purple-300/60">
            <span>Verified Identity Resolver</span>
            <span>•</span>
            <span>PostgreSQL Cache</span>
            <span>•</span>
            <span>Zero False Data</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <GitHubFinderContent />
    </AuthProvider>
  );
}
