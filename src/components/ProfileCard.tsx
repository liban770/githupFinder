import React, { useState } from 'react';
import {
  ExternalLink,
  MapPin,
  Building,
  Link as LinkIcon,
  Mail,
  Bookmark,
  BookmarkCheck,
  Share2,
  Check,
  Tag,
  FileText,
  Users,
  BookOpen,
  Code2,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { CachedProfileData } from '../types/github.ts';

interface ProfileCardProps {
  profile: CachedProfileData;
  isBookmarked: boolean;
  onToggleBookmark: (tags: string[], notes: string) => Promise<void>;
  isBookmarkLoading: boolean;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  isBookmarked,
  onToggleBookmark,
  isBookmarkLoading,
}) => {
  const [copied, setCopied] = useState(false);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [notesInput, setNotesInput] = useState('');

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://github.com/${profile.username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBookmarkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    await onToggleBookmark(tags, notesInput);
    setShowBookmarkModal(false);
  };

  return (
    <div className="bg-[#120b24]/90 rounded-3xl border border-purple-900/60 p-6 md:p-8 shadow-2xl relative overflow-hidden mb-8 purple-glow">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-fuchsia-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
        {/* Left: Avatar + Details */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-purple-700/80 bg-[#160d2e] shadow-xl shadow-purple-950/60 group-hover:border-purple-400 transition-colors">
              <img
                src={profile.avatarUrl}
                alt={profile.name || profile.username}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <a
              href={`https://github.com/${profile.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-[#1b1038] text-purple-300 hover:text-white hover:bg-purple-600 border border-purple-700 shadow-lg transition-all"
              title="View on GitHub"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {profile.name || profile.username}
              </h1>
              <span className="font-mono text-sm px-2.5 py-0.5 rounded-full bg-purple-950/70 text-purple-300 border border-purple-700/60">
                @{profile.username}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Identity (ID #{profile.githubId})
              </span>
            </div>

            {profile.bio && (
              <p className="text-sm text-purple-100/90 max-w-xl leading-relaxed">
                {profile.bio}
              </p>
            )}

            {/* Profile Metadata */}
            <div className="flex items-center gap-x-4 gap-y-2 flex-wrap pt-2 text-xs text-purple-300/80">
              {profile.company && (
                <div className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-purple-400" />
                  <span>{profile.company}</span>
                </div>
              )}
              {profile.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-purple-400" />
                  <span>{profile.location}</span>
                </div>
              )}
              {profile.blog && (
                <a
                  href={profile.blog.startsWith('http') ? profile.blog : `https://${profile.blog}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-purple-300 hover:text-white transition-colors"
                >
                  <LinkIcon className="w-3.5 h-3.5 text-purple-400" />
                  <span className="truncate max-w-[180px]">{profile.blog.replace(/^https?:\/\//, '')}</span>
                </a>
              )}
              {profile.email && (
                <a
                  href={`mailto:${profile.email}`}
                  className="flex items-center gap-1.5 text-purple-300 hover:text-white transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-purple-400" />
                  <span>{profile.email}</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end">
          <button
            onClick={handleCopyLink}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 text-xs font-medium border border-purple-800/60 transition-all active:scale-95 cursor-pointer"
            title="Copy GitHub URL"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              if (isBookmarked) {
                onToggleBookmark([], '');
              } else {
                setShowBookmarkModal(true);
              }
            }}
            disabled={isBookmarkLoading}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer ${
              isBookmarked
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
            }`}
          >
            {isBookmarked ? (
              <>
                <BookmarkCheck className="w-4 h-4 text-amber-400" />
                <span>Bookmarked</span>
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4" />
                <span>Save to Bookmarks</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Numerical Stats Grid in Purple Theme */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-purple-950/80">
        <div className="bg-[#180f33]/60 rounded-2xl p-4 border border-purple-800/40 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-300">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">
              {profile.publicRepos.toLocaleString()}
            </div>
            <div className="text-xs text-purple-300/80 font-medium">Public Repos</div>
          </div>
        </div>

        <div className="bg-[#180f33]/60 rounded-2xl p-4 border border-purple-800/40 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-fuchsia-500/15 text-fuchsia-300">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">
              {profile.followers.toLocaleString()}
            </div>
            <div className="text-xs text-purple-300/80 font-medium">Followers</div>
          </div>
        </div>

        <div className="bg-[#180f33]/60 rounded-2xl p-4 border border-purple-800/40 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/15 text-violet-300">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">
              {profile.following.toLocaleString()}
            </div>
            <div className="text-xs text-purple-300/80 font-medium">Following</div>
          </div>
        </div>

        <div className="bg-[#180f33]/60 rounded-2xl p-4 border border-purple-800/40 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-300">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">
              {profile.publicGists.toLocaleString()}
            </div>
            <div className="text-xs text-purple-300/80 font-medium">Public Gists</div>
          </div>
        </div>
      </div>

      {/* Bookmark Modal */}
      {showBookmarkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-[#150d2b] border border-purple-700/80 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 purple-glow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-white">Bookmark @{profile.username}</h3>
              </div>
              <button
                onClick={() => setShowBookmarkModal(false)}
                className="text-purple-300 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleBookmarkSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-purple-200 mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-purple-400" />
                  Custom Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Frontend, TypeScript, AI, React"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#1b1136] border border-purple-800 rounded-xl text-sm text-white placeholder-purple-400/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-purple-200 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  Personal Notes
                </label>
                <textarea
                  placeholder="e.g. Core engineer, inspiration for open source architecture."
                  rows={3}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#1b1136] border border-purple-800 rounded-xl text-sm text-white placeholder-purple-400/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBookmarkModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-purple-300 hover:bg-purple-900/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBookmarkLoading}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/30 transition-all cursor-pointer"
                >
                  Save to PostgreSQL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
