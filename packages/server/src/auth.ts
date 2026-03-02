import { Router, IRouter } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { getDb, persist } from './db.js';

// ── TypeScript: teach Express about req.user ────────────────────────────────
declare global {
  namespace Express {
    interface User {
      id: number;
      google_id: string;
      email: string;
      username: string | null;
      avatar_url: string | null;
      created_at: string;
    }
  }
}

// ── Passport configuration ──────────────────────────────────────────────────

const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     ?? '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? '';

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn('[Auth] WARNING: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set. Google login will fail.');
}

passport.use(new GoogleStrategy(
  {
    clientID:     GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL:  'http://localhost:3001/auth/google/callback',
  },
  async (_accessToken, _refreshToken, profile, done) => {
    try {
      const db = await getDb();
      const email = profile.emails?.[0]?.value ?? '';
      const avatarUrl = profile.photos?.[0]?.value ?? null;

      // Upsert: find or create user by google_id
      const existing = db.exec(`SELECT * FROM users WHERE google_id = '${profile.id}'`);
      if (existing.length && existing[0].values.length) {
        const { columns, values } = existing[0];
        const user = Object.fromEntries(columns.map((c, i) => [c, values[0][i]])) as unknown as Express.User;
        return done(null, user);
      }

      // New user — create record
      db.run(
        `INSERT INTO users (google_id, email, avatar_url) VALUES (?, ?, ?)`,
        [profile.id, email, avatarUrl],
      );
      persist();

      const row = db.exec(`SELECT * FROM users WHERE google_id = '${profile.id}'`);
      if (!row.length || !row[0].values.length) return done(new Error('User not found after insert'));
      const { columns, values } = row[0];
      const user = Object.fromEntries(columns.map((c, i) => [c, values[0][i]])) as unknown as Express.User;
      return done(null, user);
    } catch (err) {
      return done(err as Error);
    }
  },
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const db = await getDb();
    const result = db.exec(`SELECT * FROM users WHERE id = ${id}`);
    if (!result.length || !result[0].values.length) return done(null, false);
    const { columns, values } = result[0];
    const user = Object.fromEntries(columns.map((c, i) => [c, values[0][i]])) as unknown as Express.User;
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// ── Router ──────────────────────────────────────────────────────────────────

const router: IRouter = Router();

/** Kick off the Google OAuth flow. */
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }),
);

/** Google redirects back here after the user consents. */
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: 'http://localhost:5173/login?error=1' }),
  (_req, res) => {
    res.redirect('http://localhost:5173');
  },
);

/** Returns the current session user, or 401. */
router.get('/me', (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { id, email, username, avatar_url } = req.user;
  res.json({ id, email, username, avatar_url });
});

/** Set username on first login (or update it). */
router.patch('/me/username', async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { username } = req.body ?? {};
  if (!username || typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ error: 'username is required' });
  }
  const trimmed = username.trim().slice(0, 32);
  try {
    const db = await getDb();
    db.run(`UPDATE users SET username = ? WHERE id = ?`, [trimmed, req.user.id]);
    persist();
    res.json({ ok: true, username: trimmed });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** Destroy the session (logout). */
router.post('/logout', (req, res) => {
  req.logout(err => {
    if (err) return res.status(500).json({ error: String(err) });
    res.json({ ok: true });
  });
});

export default router;
