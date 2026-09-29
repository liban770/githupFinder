import React from 'react';
import { Database, Globe, AlertTriangle, RefreshCw, Clock, Zap, CheckCircle2 } from 'lucide-react';
import { ProfileQueryResult } from '../types/github.ts';

interface TelemetryBarProps {
  result: ProfileQueryResult;
  onRefreshFresh: () => void;
  isLoading: boolean;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  result,
  onRefreshFresh,
  isLoading,
}) => {
  const { source, responseTimeMs, data, matchedFromQuery } = result;

  const cachedDate = new Date(data.cachedAt);
  const cacheAgeMinutes = Math.floor((Date.now() - cachedDate.getTime()) / 60000);

  const getSourceBadge = () => {
    switch (source) {
      case 'database':
        return {
          icon: <Database className="w-4 h-4 text-purple-400" />,
          title: 'PostgreSQL Cache Hit',
          bg: 'bg-purple-950/40 border-purple-800/60 text-purple-200',
          desc: 'Instant delivery from Cloud SQL cache. Zero GitHub rate-limit quota consumed.',
        };
      case 'api':
        return {
          icon: <Globe className="w-4 h-4 text-fuchsia-400" />,
          title: 'Fresh GitHub REST API',
          bg: 'bg-fuchsia-950/30 border-fuchsia-800/50 text-fuchsia-200',
          desc: 'Fetched directly from GitHub API and persisted to PostgreSQL database.',
        };
      case 'stale_fallback':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
          title: 'Stale Fallback Active',
          bg: 'bg-amber-950/40 border-amber-800/60 text-amber-300',
          desc: 'GitHub API throttled/down. Seamlessly serving stored profile snapshot.',
        };
    }
  };

  const badge = getSourceBadge();

  return (
    <div className="space-y-2 mb-6">
      {/* Resolved Name Match Alert if user searched a real name */}
      {matchedFromQuery && (
        <div className="bg-purple-950/50 border border-purple-700/60 text-purple-200 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Name Resolution: Searched <span className="font-semibold text-white">"{matchedFromQuery}"</span> → Caught authentic GitHub developer <span className="font-mono text-purple-300 font-bold">@{data.username}</span> {data.name ? `(${data.name})` : ''}
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40 hidden sm:inline">
            Verified Record
          </span>
        </div>
      )}

      {/* Cache & Telemetry Bar */}
      <div className={`w-full rounded-2xl border p-3.5 sm:p-4 transition-all ${badge.bg}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Left: Source Icon and Info */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-black/40 border border-white/10">
              {badge.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm tracking-wide text-white">{badge.title}</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-black/40 border border-purple-500/30 text-purple-300">
                  <Zap className="w-3 h-3 text-yellow-400" />
                  {responseTimeMs} ms
                </span>
                {source === 'database' && (
                  <span className="text-xs text-emerald-400 font-medium">
                    (~96% faster than remote API)
                  </span>
                )}
              </div>
              <p className="text-xs text-purple-200/80 mt-0.5">{badge.desc}</p>
            </div>
          </div>

          {/* Right: Cache Time and Revalidate Action */}
          <div className="flex items-center gap-3 self-end sm:self-auto text-xs">
            <div className="flex items-center gap-1.5 text-purple-300/80 font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {cacheAgeMinutes === 0
                  ? 'Cached just now'
                  : `Cached ${cacheAgeMinutes}m ago`}
              </span>
              <span className="opacity-50">• TTL 1h</span>
            </div>

            <button
              onClick={onRefreshFresh}
              disabled={isLoading}
              title="Fetch fresh snapshot directly from GitHub API and update PostgreSQL database"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 active:scale-95 text-white font-medium transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Revalidate</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
