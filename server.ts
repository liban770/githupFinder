import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ProfileService } from './src/services/profile.service.ts';
import { GitHubService } from './src/services/github.service.ts';
import { requireAuth, optionalAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// API: Search / Get Profile with read-through cache
app.get('/api/github/user/:username', async (req, res) => {
  const { username } = req.params;
  const forceFresh = req.query.force === 'true';

  try {
    const result = await ProfileService.getProfile(username, forceFresh);
    res.json(result);
  } catch (error: any) {
    console.error(`Error fetching profile for ${username}:`, error.message);
    const status = error.message?.includes('not found')
      ? 404
      : error.message?.includes('rate limit')
      ? 429
      : 500;
    res.status(status).json({ error: error.message || 'Failed to fetch GitHub profile' });
  }
});

// API: Search suggestions / autocomplete
app.get('/api/github/search-suggestions', async (req, res) => {
  const query = (req.query.q as string) || '';
  try {
    const suggestions = await GitHubService.searchUsers(query);
    res.json(suggestions);
  } catch (error: any) {
    res.json([]);
  }
});

// API: Check GitHub Rate Limit status
app.get('/api/github/rate-limit', async (req, res) => {
  try {
    const rateLimit = await GitHubService.checkRateLimit();
    res.json(rateLimit);
  } catch (error: any) {
    res.status(500).json({ error: 'Could not fetch rate limit information' });
  }
});

// API: Analytics & Search telemetry
app.get('/api/analytics', async (req, res) => {
  try {
    const stats = await ProfileService.getTelemetryStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch search telemetry' });
  }
});

// API: List cached profiles for quick browsing
app.get('/api/cached-profiles', async (req, res) => {
  try {
    const list = await ProfileService.getCachedProfilesList();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch cached profiles list' });
  }
});

// API: Sync user after Firebase Auth login
app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: No user found' });
    }
    const user = await getOrCreateUser(req.user.uid, req.user.email || '');
    res.json({ success: true, user });
  } catch (error: any) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: 'Failed to sync user record' });
  }
});

// API: Bookmarks
app.get('/api/bookmarks', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const userUid = req.user?.uid;
    const bookmarks = await ProfileService.getBookmarks(userUid);
    res.json(bookmarks);
  } catch (error: any) {
    console.error('Error getting bookmarks:', error);
    res.status(500).json({ error: 'Failed to get bookmarks' });
  }
});

app.post('/api/bookmarks', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { profileId, notes, tags } = req.body;
    if (!profileId) {
      return res.status(400).json({ error: 'profileId is required' });
    }
    const userUid = req.user?.uid;
    const bookmark = await ProfileService.addBookmark(profileId, userUid, notes, tags);
    res.status(201).json(bookmark);
  } catch (error: any) {
    console.error('Error adding bookmark:', error);
    res.status(500).json({ error: 'Failed to add bookmark' });
  }
});

app.put('/api/bookmarks/:id', optionalAuth, async (req: AuthRequest, res) => {
  const bookmarkId = parseInt(req.params.id, 10);
  const { notes, tags } = req.body;
  try {
    const updated = await ProfileService.updateBookmark(bookmarkId, notes, tags);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update bookmark' });
  }
});

app.delete('/api/bookmarks/:id', optionalAuth, async (req: AuthRequest, res) => {
  const bookmarkId = parseInt(req.params.id, 10);
  try {
    await ProfileService.removeBookmark(bookmarkId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete bookmark' });
  }
});

app.get('/api/bookmarks/status/:profileId', optionalAuth, async (req: AuthRequest, res) => {
  const profileId = parseInt(req.params.profileId, 10);
  try {
    const userUid = req.user?.uid;
    const status = await ProfileService.checkIsBookmarked(profileId, userUid);
    res.json(status);
  } catch (error: any) {
    res.json({ isBookmarked: false });
  }
});

// Mount Vite or serve static assets
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GitHub Profile Finder server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
