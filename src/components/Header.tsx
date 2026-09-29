import React, { useEffect, useState } from 'react';
import {
  Github,
  Database,
  Bookmark,
  BarChart3,
  Search,
  Scale,
  LogIn,
  LogOut,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface HeaderProps {
  activeTab: 'search' | 'bookmarks' | 'analytics' | 'compare';
  setActiveTab: (tab: 'search' | 'bookmarks' | 'analytics' | 'compare') => void;
  bookmarksCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  bookmarksCount,
}) => {
  const { user, signInWithGoogle, signOut } = useAuth();
  const [rateLimit, setRateLimit] = useState<{ remaining: number; limit: number; reset: number } | null>(null);

  useEffect(() => {
    const fetchRateLimit = async () => {
      try {
        const res = await fetch('/api/github/rate-limit');
        if (res.ok) {
          const data = await res.json();
          setRateLimit(data);
        }
      } catch (err) {
        console.warn('Could not fetch rate limit:', err);
      }
    };

    fetchRateLimit();
    const interval = setInterval(fetchRateLimit, 45000);
    return () => clearInterval(interval);
  }, []);

  const isRateWarning = rateLimit && rateLimit.remaining < 15;

  return (
    <header className="sticky top-0 z-40 bg-[#0e091b]/95 backdrop-blur-md border-b border-purple-950/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('search')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-violet-600 p-0.5 shadow-lg shadow-purple-600/30">
              <div className="w-full h-full bg-[#0c0817] rounded-[10px] flex items-center justify-center">
                <Github className="w-5 h-5 text-purple-200" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-lg tracking-tight">GitHub Profile Finder</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  <Database className="w-3 h-3 text-purple-400" />
                  PostgreSQL
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified Info
                </span>
              </div>
              <p className="text-xs text-purple-300/70 hidden sm:block">
                Name & Handle Resolver • Authenticated GitHub Data • Instant Cloud SQL Cache
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1.5">
            <button
              onClick={() => setActiveTab('search')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'search'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-semibold'
                  : 'text-purple-200/70 hover:text-white hover:bg-purple-950/50'
              }`}
            >
              <Search className="w-4 h-4" />
              Explorer
            </button>

            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'bookmarks'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-semibold'
                  : 'text-purple-200/70 hover:text-white hover:bg-purple-950/50'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              Saved Bookmarks
              {bookmarksCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs font-semibold bg-purple-300/20 text-purple-200">
                  {bookmarksCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('compare')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'compare'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-semibold'
                  : 'text-purple-200/70 hover:text-white hover:bg-purple-950/50'
              }`}
            >
              <Scale className="w-4 h-4" />
              Compare
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'analytics'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-semibold'
                  : 'text-purple-200/70 hover:text-white hover:bg-purple-950/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Telemetry
            </button>
          </nav>

          {/* Rate limit status & Auth */}
          <div className="flex items-center gap-3">
            {/* Rate Limit Pill */}
            {rateLimit && (
              <div
                title={`GitHub API Rate Limit: ${rateLimit.remaining}/${rateLimit.limit} remaining`}
                className={`hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-mono ${
                  isRateWarning
                    ? 'bg-amber-950/40 text-amber-300 border-amber-800/50'
                    : 'bg-purple-950/40 text-purple-200 border-purple-800/40'
                }`}
              >
                <Zap className={`w-3.5 h-3.5 ${isRateWarning ? 'text-amber-400 animate-pulse' : 'text-purple-400'}`} />
                <span>API:</span>
                <span className="font-semibold text-white">{rateLimit.remaining}</span>
                <span className="text-purple-400">/</span>
                <span className="text-purple-400">{rateLimit.limit}</span>
              </div>
            )}

            {/* Auth Button */}
            {user ? (
              <div className="flex items-center gap-2.5 bg-purple-950/50 pl-2 pr-1.5 py-1 rounded-full border border-purple-800/60">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-6 h-6 rounded-full border border-purple-400"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-medium text-purple-100 hidden sm:inline max-w-[120px] truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <button
                  onClick={signOut}
                  title="Sign out"
                  className="p-1 text-purple-400 hover:text-rose-400 rounded-full hover:bg-purple-900/40 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 transition-all active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign in with Google
              </button>
            )}
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-purple-950/70 text-xs">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-1 py-1 px-2 rounded ${activeTab === 'search' ? 'text-purple-300 font-semibold' : 'text-purple-400/70'}`}
          >
            <Search className="w-3.5 h-3.5" />
            Explorer
          </button>
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex items-center gap-1 py-1 px-2 rounded ${activeTab === 'bookmarks' ? 'text-purple-300 font-semibold' : 'text-purple-400/70'}`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            Bookmarks ({bookmarksCount})
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`flex items-center gap-1 py-1 px-2 rounded ${activeTab === 'compare' ? 'text-purple-300 font-semibold' : 'text-purple-400/70'}`}
          >
            <Scale className="w-3.5 h-3.5" />
            Compare
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1 py-1 px-2 rounded ${activeTab === 'analytics' ? 'text-purple-300 font-semibold' : 'text-purple-400/70'}`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Telemetry
          </button>
        </div>
      </div>
    </header>
  );
};
