import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Database,
  Zap,
  Clock,
  TrendingUp,
  Search,
  Server,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { SearchTelemetryStats } from '../types/github.ts';

interface AnalyticsViewProps {
  onSelectUser: (username: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onSelectUser }) => {
  const [stats, setStats] = useState<SearchTelemetryStats | null>(null);
  const [cachedProfiles, setCachedProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const [statsRes, profilesRes] = await Promise.all([
        fetch('/api/analytics'),
        fetch('/api/cached-profiles'),
      ]);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (profilesRes.ok) {
        const profilesData = await profilesRes.json();
        setCachedProfiles(profilesData);
      }
    } catch (err) {
      console.error('Failed to load telemetry stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#120b24]/90 border border-purple-900/60 p-6 rounded-3xl shadow-xl purple-glow">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Cache Telemetry & Database Analytics
            </h1>
          </div>
          <p className="text-xs text-purple-300/70 mt-1">
            Real-time performance audit of the Cloud SQL PostgreSQL read-through cache layer.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-purple-200 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/60 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Searches */}
        <div className="bg-[#140e26]/90 border border-purple-900/60 rounded-3xl p-5 shadow-lg flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-purple-500/15 text-purple-400">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">
              {stats?.totalSearches.toLocaleString() || '0'}
            </div>
            <div className="text-xs text-purple-300/80 font-medium">Total Queries Executed</div>
          </div>
        </div>

        {/* Cache Hit Ratio */}
        <div className="bg-[#140e26]/90 border border-purple-900/60 rounded-3xl p-5 shadow-lg flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {stats ? `${stats.cacheHitRatio}%` : '0%'}
            </div>
            <div className="text-xs text-purple-300/80 font-medium">
              Cache Hit Ratio ({stats?.cacheHits || 0} hits)
            </div>
          </div>
        </div>

        {/* Avg Response Latency */}
        <div className="bg-[#140e26]/90 border border-purple-900/60 rounded-3xl p-5 shadow-lg flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-amber-500/15 text-amber-400">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">
              {stats ? `${stats.averageResponseTimeMs} ms` : '0 ms'}
            </div>
            <div className="text-xs text-purple-300/80 font-medium">Avg Response Latency</div>
          </div>
        </div>

        {/* Cached Profiles Count */}
        <div className="bg-[#140e26]/90 border border-purple-900/60 rounded-3xl p-5 shadow-lg flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-fuchsia-500/15 text-fuchsia-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">
              {stats?.cachedProfilesCount.toLocaleString() || '0'}
            </div>
            <div className="text-xs text-purple-300/80 font-medium">Profiles in PostgreSQL</div>
          </div>
        </div>
      </div>

      {/* Latency Comparison Visual */}
      <div className="bg-[#120b24]/90 border border-purple-900/60 rounded-3xl p-6 shadow-xl space-y-4 purple-glow">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-400" />
          Read-Through Cache Speedup (PostgreSQL vs GitHub REST API)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* PostgreSQL Local Cache */}
          <div className="bg-purple-950/40 border border-purple-700/60 rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-purple-300 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-purple-400" />
                PostgreSQL Local Cache Hit
              </span>
              <span className="font-mono text-emerald-400 font-bold">~8 - 25 ms</span>
            </div>
            <div className="h-3 w-full bg-[#1b1136] rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full w-[8%]" />
            </div>
            <p className="text-[11px] text-purple-200/80 mt-2">
              Sub-millisecond query time via Cloud SQL indexed columns. Bypasses GitHub API rate limits.
            </p>
          </div>

          {/* GitHub Remote REST API */}
          <div className="bg-[#1b1136]/50 border border-purple-800/40 rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-fuchsia-300 flex items-center gap-1.5">
                <Server className="w-4 h-4 text-fuchsia-400" />
                GitHub Remote REST API
              </span>
              <span className="font-mono text-fuchsia-300 font-bold">~320 - 650 ms</span>
            </div>
            <div className="h-3 w-full bg-[#140e26] rounded-full overflow-hidden">
              <div className="h-full bg-fuchsia-500 rounded-full w-[95%]" />
            </div>
            <p className="text-[11px] text-purple-300/70 mt-2">
              Subject to WAN network roundtrips, TLS negotiation, and strict 60 req/hr unauthenticated caps.
            </p>
          </div>
        </div>
      </div>

      {/* Two columns: Recent Search Logs & Cached Profiles Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Search Logs */}
        <div className="bg-[#140e26]/90 border border-purple-900/60 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              Recent Query Telemetry
            </h3>
            <span className="text-[11px] text-purple-400/70 font-mono">search_logs table</span>
          </div>

          {stats?.recentSearches.length === 0 ? (
            <p className="text-xs text-purple-400/60 py-6 text-center">No search logs recorded yet.</p>
          ) : (
            <div className="divide-y divide-purple-950/80 text-xs">
              {stats?.recentSearches.map((log, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectUser(log.username)}
                      className="font-mono text-purple-200 hover:text-white transition-colors font-medium cursor-pointer"
                    >
                      @{log.username}
                    </button>
                    {log.wasCacheHit ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-950/70 text-purple-300 border border-purple-700/60">
                        Cache Hit
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-fuchsia-950/70 text-fuchsia-300 border border-fuchsia-800/50">
                        API Fetch
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-purple-400/80 font-mono text-[11px]">
                    <span className="text-amber-400 font-semibold">{log.responseTimeMs}ms</span>
                    <span className="text-purple-400/60">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cached Profiles in Database */}
        <div className="bg-[#140e26]/90 border border-purple-900/60 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              Cached in PostgreSQL ({cachedProfiles.length})
            </h3>
            <span className="text-[11px] text-purple-400/70 font-mono">Instant Load</span>
          </div>

          {cachedProfiles.length === 0 ? (
            <p className="text-xs text-purple-400/60 py-6 text-center">
              No profiles cached yet. Search for any user to seed the database!
            </p>
          ) : (
            <div className="divide-y divide-purple-950/80 text-xs max-h-[360px] overflow-y-auto pr-1">
              {cachedProfiles.map((p) => (
                <div
                  key={p.username}
                  onClick={() => onSelectUser(p.username)}
                  className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-purple-950/50 px-2 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={p.avatarUrl}
                      alt={p.username}
                      className="w-7 h-7 rounded-full border border-purple-700/80 object-cover"
                    />
                    <div>
                      <span className="font-medium text-purple-100 group-hover:text-purple-300 transition-colors">
                        {p.name || p.username}
                      </span>
                      <span className="text-purple-400/70 font-mono ml-1.5 text-[11px]">
                        @{p.username}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-purple-400/80 font-mono text-[11px]">
                    <span>{p.publicRepos} repos</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-purple-400 group-hover:text-white transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
