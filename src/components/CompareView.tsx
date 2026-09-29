import React, { useState } from 'react';
import { Scale, Loader2, ExternalLink, Trophy, CheckCircle2 } from 'lucide-react';
import { CachedProfileData } from '../types/github.ts';

interface CompareViewProps {
  onSelectUser: (username: string) => void;
}

export const CompareView: React.FC<CompareViewProps> = ({ onSelectUser }) => {
  const [user1Query, setUser1Query] = useState('Dan Abramov');
  const [user2Query, setUser2Query] = useState('Evan You');

  const [profile1, setProfile1] = useState<CachedProfileData | null>(null);
  const [profile2, setProfile2] = useState<CachedProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user1Query.trim() || !user2Query.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const [res1, res2] = await Promise.all([
        fetch(`/api/github/user/${encodeURIComponent(user1Query.trim())}`),
        fetch(`/api/github/user/${encodeURIComponent(user2Query.trim())}`),
      ]);

      if (!res1.ok) {
        const err = await res1.json();
        throw new Error(`Developer 1 (${user1Query}): ${err.error || 'Failed to fetch'}`);
      }
      if (!res2.ok) {
        const err = await res2.json();
        throw new Error(`Developer 2 (${user2Query}): ${err.error || 'Failed to fetch'}`);
      }

      const data1 = await res1.json();
      const data2 = await res2.json();

      setProfile1(data1.data);
      setProfile2(data2.data);
    } catch (err: any) {
      setError(err.message || 'Comparison failed');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    handleCompare();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-[#120b24]/90 border border-purple-900/60 p-6 rounded-3xl shadow-xl purple-glow">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
            <Scale className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Compare Developers</h1>
        </div>
        <p className="text-xs text-purple-300/70">
          Search any two developer names or usernames to compare their verified GitHub profiles.
        </p>

        {/* Inputs */}
        <form onSubmit={handleCompare} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="relative">
            <label className="block text-xs font-medium text-purple-300 mb-1">
              Developer 1 (Name or @handle)
            </label>
            <input
              type="text"
              value={user1Query}
              onChange={(e) => setUser1Query(e.target.value)}
              placeholder="e.g. Dan Abramov or gaearon"
              className="w-full px-4 py-3 bg-[#191130] border border-purple-800/80 rounded-xl text-sm text-white placeholder-purple-400/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          <div className="relative">
            <label className="block text-xs font-medium text-purple-300 mb-1">
              Developer 2 (Name or @handle)
            </label>
            <input
              type="text"
              value={user2Query}
              onChange={(e) => setUser2Query(e.target.value)}
              placeholder="e.g. Evan You or yyx990803"
              className="w-full px-4 py-3 bg-[#191130] border border-purple-800/80 rounded-xl text-sm text-white placeholder-purple-400/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing verified profiles...</span>
                </>
              ) : (
                <>
                  <Scale className="w-4 h-4" />
                  <span>Compare Metrics</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-2xl text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Comparison Cards */}
      {profile1 && profile2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Developer 1 Card */}
          <div className="bg-[#140e26]/90 border border-purple-900/60 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={profile1.avatarUrl}
                  alt={profile1.username}
                  className="w-16 h-16 rounded-2xl border-2 border-purple-700/80 object-cover"
                />
                <div>
                  <h3 className="text-xl font-bold text-white">{profile1.name || profile1.username}</h3>
                  <button
                    onClick={() => onSelectUser(profile1.username)}
                    className="text-xs font-mono text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    @{profile1.username}
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {profile1.followers > profile2.followers && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  Followers Leader
                </span>
              )}
            </div>

            {profile1.bio && <p className="text-xs text-purple-200/80">{profile1.bio}</p>}

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-[#1a1133] p-3 rounded-2xl border border-purple-800/40">
                <span className="text-[11px] text-purple-300/80 block">Followers</span>
                <span className="text-lg font-bold font-mono text-white">
                  {profile1.followers.toLocaleString()}
                </span>
              </div>
              <div className="bg-[#1a1133] p-3 rounded-2xl border border-purple-800/40">
                <span className="text-[11px] text-purple-300/80 block">Public Repos</span>
                <span className="text-lg font-bold font-mono text-white">
                  {profile1.publicRepos.toLocaleString()}
                </span>
              </div>
              <div className="bg-[#1a1133] p-3 rounded-2xl border border-purple-800/40">
                <span className="text-[11px] text-purple-300/80 block">Following</span>
                <span className="text-lg font-bold font-mono text-white">
                  {profile1.following.toLocaleString()}
                </span>
              </div>
              <div className="bg-[#1a1133] p-3 rounded-2xl border border-purple-800/40">
                <span className="text-[11px] text-purple-300/80 block">Public Gists</span>
                <span className="text-lg font-bold font-mono text-white">
                  {profile1.publicGists.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Top Repos */}
            <div className="space-y-2 pt-2 border-t border-purple-950/80">
              <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                Top Pinned Repositories
              </h4>
              <div className="space-y-1.5">
                {profile1.repositories.slice(0, 4).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between text-xs p-2.5 bg-[#120b24] rounded-xl border border-purple-900/60"
                  >
                    <span className="font-medium text-purple-200 truncate max-w-[180px]">
                      {r.name}
                    </span>
                    <span className="font-mono text-purple-400 text-[11px]">
                      ⭐ {r.stargazersCount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Developer 2 Card */}
          <div className="bg-[#140e26]/90 border border-purple-900/60 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={profile2.avatarUrl}
                  alt={profile2.username}
                  className="w-16 h-16 rounded-2xl border-2 border-purple-700/80 object-cover"
                />
                <div>
                  <h3 className="text-xl font-bold text-white">{profile2.name || profile2.username}</h3>
                  <button
                    onClick={() => onSelectUser(profile2.username)}
                    className="text-xs font-mono text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    @{profile2.username}
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {profile2.followers > profile1.followers && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  Followers Leader
                </span>
              )}
            </div>

            {profile2.bio && <p className="text-xs text-purple-200/80">{profile2.bio}</p>}

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-[#1a1133] p-3 rounded-2xl border border-purple-800/40">
                <span className="text-[11px] text-purple-300/80 block">Followers</span>
                <span className="text-lg font-bold font-mono text-white">
                  {profile2.followers.toLocaleString()}
                </span>
              </div>
              <div className="bg-[#1a1133] p-3 rounded-2xl border border-purple-800/40">
                <span className="text-[11px] text-purple-300/80 block">Public Repos</span>
                <span className="text-lg font-bold font-mono text-white">
                  {profile2.publicRepos.toLocaleString()}
                </span>
              </div>
              <div className="bg-[#1a1133] p-3 rounded-2xl border border-purple-800/40">
                <span className="text-[11px] text-purple-300/80 block">Following</span>
                <span className="text-lg font-bold font-mono text-white">
                  {profile2.following.toLocaleString()}
                </span>
              </div>
              <div className="bg-[#1a1133] p-3 rounded-2xl border border-purple-800/40">
                <span className="text-[11px] text-purple-300/80 block">Public Gists</span>
                <span className="text-lg font-bold font-mono text-white">
                  {profile2.publicGists.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Top Repos */}
            <div className="space-y-2 pt-2 border-t border-purple-950/80">
              <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                Top Pinned Repositories
              </h4>
              <div className="space-y-1.5">
                {profile2.repositories.slice(0, 4).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between text-xs p-2.5 bg-[#120b24] rounded-xl border border-purple-900/60"
                  >
                    <span className="font-medium text-purple-200 truncate max-w-[180px]">
                      {r.name}
                    </span>
                    <span className="font-mono text-purple-400 text-[11px]">
                      ⭐ {r.stargazersCount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
