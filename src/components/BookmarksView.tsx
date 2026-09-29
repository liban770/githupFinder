import React, { useState, useMemo } from 'react';
import {
  Bookmark,
  Search,
  Tag,
  Trash2,
  Edit3,
  Check,
  Download,
  Users,
  BookOpen,
  ArrowRight,
  FolderOpen,
} from 'lucide-react';
import { BookmarkedProfileRecord } from '../types/github.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface BookmarksViewProps {
  bookmarks: BookmarkedProfileRecord[];
  onSelectUser: (username: string) => void;
  onUpdateBookmark: (id: number, notes: string, tags: string[]) => Promise<void>;
  onDeleteBookmark: (id: number) => Promise<void>;
  isLoading: boolean;
}

export const BookmarksView: React.FC<BookmarksViewProps> = ({
  bookmarks,
  onSelectUser,
  onUpdateBookmark,
  onDeleteBookmark,
}) => {
  const { user, signInWithGoogle } = useAuth();
  const [filterTag, setFilterTag] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState<string>('');
  const [editTags, setEditTags] = useState<string>('');

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    bookmarks.forEach((b) => {
      b.tags?.forEach((t) => set.add(t));
    });
    return ['ALL', ...Array.from(set).sort()];
  }, [bookmarks]);

  // Filtered bookmarks
  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((b) => {
      const matchesTag =
        filterTag === 'ALL' || (b.tags && b.tags.includes(filterTag));
      const queryLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        b.profile.username.toLowerCase().includes(queryLower) ||
        (b.profile.name && b.profile.name.toLowerCase().includes(queryLower)) ||
        (b.notes && b.notes.toLowerCase().includes(queryLower));

      return matchesTag && matchesSearch;
    });
  }, [bookmarks, filterTag, searchQuery]);

  const startEditing = (b: BookmarkedProfileRecord) => {
    setEditingId(b.id);
    setEditNotes(b.notes || '');
    setEditTags(b.tags ? b.tags.join(', ') : '');
  };

  const handleSaveEdit = async (id: number) => {
    const tags = editTags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    await onUpdateBookmark(id, editNotes, tags);
    setEditingId(null);
  };

  const exportToJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(bookmarks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'github-bookmarks.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#120b24]/90 border border-purple-900/60 p-6 rounded-3xl shadow-xl purple-glow">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
              <Bookmark className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Saved Developers</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-purple-500/20 text-purple-300">
              {bookmarks.length} in Cloud SQL
            </span>
          </div>
          <p className="text-xs text-purple-300/70 mt-1">
            Persisted profiles with custom tags and developer notes. Available offline.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {bookmarks.length > 0 && (
            <button
              onClick={exportToJson}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-purple-200 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/60 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export JSON</span>
            </button>
          )}

          {!user && (
            <button
              onClick={signInWithGoogle}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 transition-all cursor-pointer"
            >
              <span>Sign in to sync account</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search saved profiles or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#140e26] border border-purple-800/60 rounded-xl text-xs text-purple-100 placeholder-purple-400/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        </div>

        {/* Tags pills */}
        {allTags.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
            <span className="text-xs text-purple-400 flex items-center gap-1 mr-1">
              <Tag className="w-3 h-3" />
              Tags:
            </span>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilterTag(tag)}
                className={`px-2.5 py-1 rounded-full text-xs font-mono transition-colors cursor-pointer ${
                  filterTag === tag
                    ? 'bg-purple-600 text-white font-medium shadow-sm shadow-purple-600/30'
                    : 'bg-[#140e26] text-purple-300 hover:text-white hover:bg-purple-900/40 border border-purple-800/50'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bookmarks Grid */}
      {filteredBookmarks.length === 0 ? (
        <div className="text-center py-16 bg-[#120b24]/60 rounded-3xl border border-purple-900/40">
          <FolderOpen className="w-12 h-12 text-purple-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-purple-200">No bookmarks found</h3>
          <p className="text-xs text-purple-400/80 mt-1 max-w-sm mx-auto">
            {searchQuery || filterTag !== 'ALL'
              ? 'Try adjusting your search query or tag filter.'
              : 'Search for any developer in the Explorer and click "Save to Bookmarks".'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBookmarks.map((b) => {
            const isEditing = editingId === b.id;

            return (
              <div
                key={b.id}
                className="bg-[#140e26]/90 border border-purple-900/60 hover:border-purple-600/70 rounded-3xl p-5 shadow-lg flex flex-col justify-between transition-all"
              >
                <div>
                  {/* Profile Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={b.profile.avatarUrl}
                        alt={b.profile.username}
                        className="w-12 h-12 rounded-xl object-cover border border-purple-700/80"
                      />
                      <div>
                        <h4 className="font-bold text-white text-base leading-snug">
                          {b.profile.name || b.profile.username}
                        </h4>
                        <button
                          onClick={() => onSelectUser(b.profile.username)}
                          className="font-mono text-xs text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          @{b.profile.username}
                        </button>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onSelectUser(b.profile.username)}
                        className="p-1.5 text-purple-300 hover:text-white rounded-lg hover:bg-purple-900/40 cursor-pointer"
                        title="View profile details"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => (isEditing ? setEditingId(null) : startEditing(b))}
                        className="p-1.5 text-purple-300 hover:text-purple-200 rounded-lg hover:bg-purple-900/40 cursor-pointer"
                        title="Edit tags or notes"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteBookmark(b.id)}
                        className="p-1.5 text-purple-400 hover:text-rose-400 rounded-lg hover:bg-purple-900/40 cursor-pointer"
                        title="Remove bookmark"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Bio */}
                  {b.profile.bio && (
                    <p className="text-xs text-purple-200/80 mt-2 line-clamp-2">
                      {b.profile.bio}
                    </p>
                  )}

                  {/* Edit Form or Display */}
                  {isEditing ? (
                    <div className="mt-3 p-3 bg-[#191130] rounded-xl border border-purple-800 space-y-2">
                      <div>
                        <label className="block text-[11px] font-medium text-purple-300 mb-1">
                          Tags (comma separated)
                        </label>
                        <input
                          type="text"
                          value={editTags}
                          onChange={(e) => setEditTags(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-[#120b24] border border-purple-700 rounded-lg text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-purple-300 mb-1">
                          Notes
                        </label>
                        <textarea
                          rows={2}
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-[#120b24] border border-purple-700 rounded-lg text-white focus:outline-none resize-none"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1 text-xs rounded bg-purple-950 text-purple-300 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(b.id)}
                          className="px-2.5 py-1 text-xs rounded bg-purple-600 text-white font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {b.notes && (
                        <div className="mt-3 p-2.5 bg-[#191130]/60 rounded-xl border border-purple-900/80 text-xs text-purple-200">
                          <span className="text-[10px] uppercase font-mono text-purple-400 block mb-0.5">
                            Notes
                          </span>
                          {b.notes}
                        </div>
                      )}

                      {b.tags && b.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap mt-3">
                          {b.tags.map((t) => (
                            <span
                              key={t}
                              className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-purple-950/60 text-purple-300 border border-purple-800/50"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Footer Stats */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-purple-950/80 text-xs text-purple-300/80">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                      {b.profile.publicRepos} repos
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-fuchsia-400" />
                      {b.profile.followers.toLocaleString()} followers
                    </span>
                  </div>

                  <span className="text-[11px] text-purple-400/60 font-mono">
                    Saved {new Date(b.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
