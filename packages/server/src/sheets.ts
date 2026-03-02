import { Router, IRouter } from 'express';
import { getDb, persist } from './db.js';

const router: IRouter = Router();

// ── GET /api/sheets ──────────────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  const db = await getDb();
  const result = db.exec('SELECT * FROM sheets ORDER BY created_at DESC');
  if (!result.length) return res.json([]);
  const { columns, values } = result[0];
  const sheets = values.map(row =>
    Object.fromEntries(columns.map((col, i) => [col, row[i]]))
  );
  res.json(sheets);
});

// ── GET /api/sheets/:id ───────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const db = await getDb();
  const result = db.exec(`SELECT * FROM sheets WHERE id = ${Number(req.params.id)}`);
  if (!result.length || !result[0].values.length) return res.status(404).json({ error: 'Not found' });
  const { columns, values } = result[0];
  res.json(Object.fromEntries(columns.map((col, i) => [col, values[0][i]])));
});

// ── POST /api/sheets ──────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const db = await getDb();
  const b = req.body;

  try { db.run(`
    INSERT INTO sheets (
      name, character_class, race, background, level,
      mig_score, mig_die, dex_score, dex_die,
      wil_score, wil_die, pre_score, pre_die,
      skill_bonuses, skill_levels, save_levels, hp_current, hp_max,
      mental_current, mental_max, grave_current, grave_max,
      ap_current, reactions_current, mana_current, mana_max,
      momentum, conditions, equipment, feats, attacks, notes
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )
  `, [
    b.name ?? 'New Character', b.character_class ?? '', b.race ?? '', b.background ?? '', b.level ?? 1,
    b.mig_score ?? 0, b.mig_die ?? 6, b.dex_score ?? 0, b.dex_die ?? 6,
    b.wil_score ?? 0, b.wil_die ?? 6, b.pre_score ?? 0, b.pre_die ?? 6,
    b.skill_bonuses ?? '{}', b.skill_levels ?? '{}', b.save_levels ?? '{}', b.hp_current ?? 0, b.hp_max ?? 0,
    b.mental_current ?? 0, b.mental_max ?? 0, b.grave_current ?? 0, b.grave_max ?? 0,
    b.ap_current ?? 3, b.reactions_current ?? 3, b.mana_current ?? 0, b.mana_max ?? 0,
    b.momentum ?? 0, b.conditions ?? '[]', b.equipment ?? '{}',
    b.feats ?? '', b.attacks ?? '[]', b.notes ?? '',
  ]); } catch (err) {
    console.error('[POST /api/sheets] INSERT failed:', err);
    return res.status(500).json({ error: String(err) });
  }

  persist();

  const idResult = db.exec('SELECT last_insert_rowid() as id');
  const id = idResult[0]?.values[0][0] as number;
  if (!id) return res.status(500).json({ error: 'Insert returned no id' });
  const sheetResult = db.exec(`SELECT * FROM sheets WHERE id = ${id}`);
  if (!sheetResult.length || !sheetResult[0].values.length) return res.status(500).json({ error: 'Row not found after insert' });
  const { columns, values } = sheetResult[0];
  res.status(201).json(Object.fromEntries(columns.map((col, i) => [col, values[0][i]])));
});

// ── PATCH /api/sheets/:id ─────────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  const db = await getDb();
  const id = Number(req.params.id);
  const b = req.body;

  const allowed = [
    'name','character_class','race','background','level',
    'mig_score','mig_die','dex_score','dex_die',
    'wil_score','wil_die','pre_score','pre_die',
    'skill_bonuses','skill_levels','save_levels','hp_current','hp_max',
    'mental_current','mental_max','grave_current','grave_max',
    'ap_current','reactions_current','mana_current','mana_max',
    'momentum','conditions','equipment','feats','attacks','notes',
  ];

  const entries = Object.entries(b).filter(([k]) => allowed.includes(k));
  if (!entries.length) return res.status(400).json({ error: 'No valid fields' });

  const sets = entries.map(([k]) => `${k} = ?`).join(', ');
  const vals = (entries.map(([, v]) => v) as (string | number | null)[]);
  try {
    db.run(`UPDATE sheets SET ${sets} WHERE id = ?`, [...vals, id]);
  } catch (err) {
    console.error('[PATCH /api/sheets] UPDATE failed:', err);
    return res.status(500).json({ error: String(err) });
  }
  persist();

  const result = db.exec(`SELECT * FROM sheets WHERE id = ${id}`);
  if (!result.length || !result[0].values.length) return res.status(404).json({ error: 'Not found' });
  const { columns, values } = result[0];
  res.json(Object.fromEntries(columns.map((col, i) => [col, values[0][i]])));
});

// ── DELETE /api/sheets/:id ────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const db = await getDb();
  db.run(`DELETE FROM sheets WHERE id = ${Number(req.params.id)}`);
  persist();
  res.json({ ok: true });
});

export default router;
