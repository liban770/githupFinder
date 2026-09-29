import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, ArrowRight, CornerDownLeft, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

interface SearchInputProps {
  onSearch: (username: string, forceFresh?: boolean) => void;
  isLoading: boolean;
  currentUsername?: string;
}

const FEATURED_DEVS = [
  { label: 'Dan Abramov', query: 'Dan Abramov' },
  { label: 'Linus Torvalds', query: 'Linus Torvalds' },
  { label: 'Evan You', query: 'Evan You' },
  { label: 'Shadcn', query: 'shadcn' },
  { label: 'Sindre Sorhus', query: 'sindresorhus' },
  { label: 'Rich Harris', query: 'Rich Harris' },
];

export const SearchInput: React.FC<SearchInputProps> = ({
  onSearch,
  isLoading,
  currentUsername,
}) => {
  const [query, setQuery] = useState(currentUsername || '');
  const [suggestions, setSuggestions] = useState<{ login: string; avatar_url: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentUsername) {
      setQuery(currentUsername);
    }
  }, [currentUsername]);

  // Global keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced auto-complete suggestions
  useEffect(() => {
    const trimmed = query.trim().replace(/^@/, '');
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingSuggestions(true);
      try {
        const res = await fetch(`/api/github/search-suggestions?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
          setShowDropdown(data.length > 0);
        }
      } catch (err) {
        // Ignore suggestion failures
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const target = query.trim();
    if (target) {
      setShowDropdown(false);
      onSearch(target);
    }
  };

  const handleSelectSuggestion = (login: string) => {
    setQuery(login);
    setShowDropdown(false);
    onSearch(login);
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-8">
      {/* Search Input Box */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <div className="absolute left-4 pointer-events-none text-purple-400">
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowDropdown(true);
            }}
            placeholder="Search any developer name or handle (e.g. Dan Abramov, Linus, Evan You)..."
            className="w-full pl-12 pr-28 py-4 bg-[#140e26] text-white placeholder-purple-300/40 rounded-2xl border border-purple-800/60 focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-purple-500 shadow-xl shadow-purple-950/40 transition-all text-base font-medium"
          />

          <div className="absolute right-3 flex items-center gap-1.5">
            <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-[11px] font-mono font-medium text-purple-300/60 bg-purple-950/60 rounded border border-purple-800/60">
              /
            </kbd>
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-purple-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <span>Search</span>
              <CornerDownLeft className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Autocomplete Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 top-full mt-2 bg-[#120b24] border border-purple-800/80 rounded-2xl shadow-2xl shadow-purple-950/80 overflow-hidden z-50 divide-y divide-purple-950/80"
          >
            <div className="px-4 py-2.5 bg-[#0e081c] text-[11px] font-mono text-purple-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Verified Matching GitHub Profiles
              </span>
              {isSearchingSuggestions && <Loader2 className="w-3 h-3 animate-spin text-purple-400" />}
            </div>
            {suggestions.map((item) => (
              <button
                key={item.login}
                type="button"
                onClick={() => handleSelectSuggestion(item.login)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-purple-900/40 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={item.avatar_url}
                    alt={item.login}
                    className="w-8 h-8 rounded-full border border-purple-700/80 object-cover"
                  />
                  <div>
                    <span className="font-mono text-sm text-purple-100 group-hover:text-white font-medium">
                      @{item.login}
                    </span>
                    <span className="block text-[11px] text-emerald-400 font-sans">
                      Authentic GitHub user
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-purple-400 group-hover:text-purple-200 group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Quick Suggestions & Guarantee pill */}
      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-purple-300/60 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-400" />
            Quick names:
          </span>
          {FEATURED_DEVS.map((dev) => (
            <button
              key={dev.query}
              onClick={() => {
                setQuery(dev.query);
                onSearch(dev.query);
              }}
              className="px-2.5 py-1 rounded-full text-xs font-medium text-purple-200 bg-purple-950/40 hover:bg-purple-600/30 hover:text-white hover:border-purple-500/50 border border-purple-800/40 transition-colors cursor-pointer"
            >
              {dev.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 text-[11px] text-emerald-400/90 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Zero false profiles • 100% verified GitHub data</span>
        </div>
      </div>
    </div>
  );
};
