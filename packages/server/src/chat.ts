import { Router, IRouter } from 'express';
import { getDb, persist } from './db.js';

const router: IRouter = Router();

// ── GET /api/chat ─────────────────────────────────────────────────────────
// Returns all messages in chronological order.
router.get('/', async (_req, res) => {
  const db = await getDb();
  const result = db.exec('SELECT * FROM chat_messages ORDER BY id ASC');
  if (!result.length) return res.json([]);
  const { columns, values } = result[0];
  const messages = values.map(row =>
    Object.fromEntries(columns.map((col, i) => [col, row[i]]))
  );
  res.json(messages);
});

// ── POST /api/chat ────────────────────────────────────────────────────────
// Body: { type: 'text' | 'roll', content: string, result?: string (JSON) }
router.post('/', async (req, res) => {
  const db = await getDb();
  const { type = 'text', content = '', result = null } = req.body ?? {};

  try {
    db.run(
      `INSERT INTO chat_messages (type, content, result) VALUES (?, ?, ?)`,
      [type, content, result ? JSON.stringify(result) : null],
    );
    persist();

    const last = db.exec('SELECT * FROM chat_messages WHERE id = last_insert_rowid()');
    if (!last.length || !last[0].values.length) return res.status(500).json({ error: 'Insert failed' });
    const { columns, values } = last[0];
    res.status(201).json(Object.fromEntries(columns.map((col, i) => [col, values[0][i]])));
  } catch (err) {
    console.error('[POST /api/chat] failed:', err);
    res.status(500).json({ error: String(err) });
  }
});

// ── DELETE /api/chat ──────────────────────────────────────────────────────
// Wipe all messages (useful for testing).
router.delete('/', async (_req, res) => {
  const db = await getDb();
  db.run('DELETE FROM chat_messages');
  persist();
  res.json({ ok: true });
});

export default router;
