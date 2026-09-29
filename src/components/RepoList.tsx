import React, { useState, useMemo } from 'react';
import {
  Star,
  GitFork,
  BookMarked,
  Filter,
  ArrowUpDown,
  ExternalLink,
  Code2,
} from 'lucide-react';
import { CachedRepoData } from '../types/github.ts';
import { getLanguageColor } from '../lib/colors.ts';

interface RepoListProps {
  repositories: CachedRepoData[];
  username: string;
}

export const RepoList: React.FC<RepoListProps> = ({ repositories }) => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'stars' | 'forks' | 'updated'>('stars');

  // Extract unique languages and language distribution percentages
  const { languages, languageStats } = useMemo(() => {
    const langCount: Record<string, number> = {};
    let totalWithLang = 0;

    repositories.forEach((repo) => {
      if (repo.language) {
        langCount[repo.language] = (langCount[repo.language] || 0) + 1;
        totalWithLang++;
      }
    });

    const stats = Object.entries(langCount)
      .map(([lang, count]) => ({
        language: lang,
        count,
        percent: Math.round((count / (totalWithLang || 1)) * 100),
        color: getLanguageColor(lang),
      }))
      .sort((a, b) => b.count - a.count);

    const langs = ['ALL', ...Object.keys(langCount).sort()];
    return { languages: langs, languageStats: stats };
  }, [repositories]);

  // Filter & sort repositories
  const filteredRepos = useMemo(() => {
    let list = [...repositories];

    if (selectedLanguage !== 'ALL') {
      list = list.filter((r) => r.language === selectedLanguage);
    }

    list.sort((a, b) => {
      if (sortBy === 'stars') return b.stargazersCount - a.stargazersCount;
      if (sortBy === 'forks') return b.forksCount - a.forksCount;
      if (sortBy === 'updated') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      return 0;
    });

    return list;
  }, [repositories, selectedLanguage, sortBy]);

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k';
    }
    return count.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-purple-400" />
            Top & Pinned Repositories
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/60">
              {repositories.length} cached
            </span>
          </h2>
          <p className="text-xs text-purple-300/70 mt-0.5">
            Indexed in Cloud SQL PostgreSQL for instant retrieval
          </p>
        </div>

        {/* Filter and Sort Toolbar */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
          {/* Language filter dropdown */}
          <div className="flex items-center gap-1.5 bg-[#140e26] border border-purple-800/60 rounded-xl px-3 py-2 text-xs text-purple-200">
            <Filter className="w-3.5 h-3.5 text-purple-400" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-transparent text-purple-100 focus:outline-none cursor-pointer text-xs"
            >
              {languages.map((lang) => (
                <option key={lang} value={lang} className="bg-[#120b24] text-white">
                  {lang === 'ALL' ? 'All Languages' : lang}
                </option>
              ))}
            </select>
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-1.5 bg-[#140e26] border border-purple-800/60 rounded-xl px-3 py-2 text-xs text-purple-200">
            <ArrowUpDown className="w-3.5 h-3.5 text-purple-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-purple-100 focus:outline-none cursor-pointer text-xs"
            >
              <option value="stars" className="bg-[#120b24] text-white">Most Stars</option>
              <option value="forks" className="bg-[#120b24] text-white">Most Forks</option>
              <option value="updated" className="bg-[#120b24] text-white">Recently Updated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Language Breakdown Bar */}
      {languageStats.length > 0 && (
        <div className="bg-[#120b24]/90 border border-purple-900/60 rounded-2xl p-4 space-y-3 purple-glow">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-purple-200 flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-purple-400" />
              Developer Language Distribution
            </span>
            <span className="text-[11px] text-purple-400/80">Based on cached repositories</span>
          </div>

          {/* Multi-segment progress bar */}
          <div className="h-2.5 w-full bg-[#1b1136] rounded-full flex overflow-hidden">
            {languageStats.map((item) => (
              <div
                key={item.language}
                style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                className="h-full transition-all"
                title={`${item.language}: ${item.percent}%`}
              />
            ))}
          </div>

          {/* Language Legend */}
          <div className="flex items-center gap-3.5 flex-wrap text-xs text-purple-300 pt-1">
            {languageStats.map((item) => (
              <button
                key={item.language}
                onClick={() => setSelectedLanguage(selectedLanguage === item.language ? 'ALL' : item.language)}
                className={`flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer ${
                  selectedLanguage === item.language ? 'font-bold text-white' : ''
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.language}</span>
                <span className="text-purple-400 font-mono text-[11px]">{item.percent}%</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Repositories Grid */}
      {filteredRepos.length === 0 ? (
        <div className="text-center py-12 bg-[#120b24]/60 rounded-2xl border border-purple-900/40">
          <BookMarked className="w-8 h-8 text-purple-600 mx-auto mb-2" />
          <p className="text-sm text-purple-300/70">No repositories found matching the filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRepos.map((repo) => (
            <div
              key={repo.id}
              className="group bg-[#140e26]/90 hover:bg-[#181130] border border-purple-900/50 hover:border-purple-600/70 rounded-2xl p-5 transition-all shadow-lg flex flex-col justify-between"
            >
              <div>
                {/* Repo Title & Link */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={repo.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-white text-base group-hover:text-purple-300 transition-colors flex items-center gap-1.5"
                    >
                      <span className="truncate max-w-[240px] sm:max-w-[300px]">{repo.name}</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    {repo.isFork && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-950/80 text-purple-300 border border-purple-800/60">
                        Fork
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-purple-200/80 mt-2 line-clamp-2 leading-relaxed">
                  {repo.description || 'No description provided.'}
                </p>

                {/* Topics / Tags */}
                {repo.topics && repo.topics.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-3">
                    {repo.topics.slice(0, 4).map((topic) => (
                      <span
                        key={topic}
                        className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-purple-950/60 text-purple-300 border border-purple-800/40"
                      >
                        #{topic}
                      </span>
                    ))}
                    {repo.topics.length > 4 && (
                      <span className="text-[11px] text-purple-400/80 font-mono">
                        +{repo.topics.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Footer Meta: Language, Stars, Forks */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-purple-950/80 text-xs text-purple-300/80">
                <div className="flex items-center gap-4">
                  {repo.language && (
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: getLanguageColor(repo.language) }}
                      />
                      <span className="font-medium text-purple-200">{repo.language}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-purple-200" title={`${repo.stargazersCount} stargazers`}>
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                    <span className="font-mono">{formatCount(repo.stargazersCount)}</span>
                  </div>

                  <div className="flex items-center gap-1 text-purple-200" title={`${repo.forksCount} forks`}>
                    <GitFork className="w-3.5 h-3.5 text-purple-400" />
                    <span className="font-mono">{formatCount(repo.forksCount)}</span>
                  </div>
                </div>

                <span className="text-[11px] text-purple-400/70 font-mono">
                  {new Date(repo.updatedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
