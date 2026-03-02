import { Router, IRouter, Request, Response } from 'express';
import multer from 'multer';
import { join, extname } from 'path';
import { existsSync } from 'fs';
import { getDb, persist, UPLOADS_DIR } from './db.js';

const router: IRouter = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// POST /api/images — upload a new image
router.post('/', upload.single('image'), async (req: Request, res: Response) => {
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }

  const db = await getDb();
  db.run(
    `INSERT INTO images (filename, original, mimetype, size) VALUES (?,?,?,?)`,
    [req.file.filename, req.file.originalname, req.file.mimetype, req.file.size]
  );
  persist();

  const result = db.exec(`SELECT last_insert_rowid() as id`);
  const id = result[0].values[0][0];

  res.status(201).json({
    id,
    filename: req.file.filename,
    original: req.file.originalname,
    url: `/api/images/${id}/file`,
  });
});

// GET /api/images — list all images
router.get('/', async (_req: Request, res: Response) => {
  const db = await getDb();
  const result = db.exec(`SELECT id, filename, original, mimetype, size, created_at FROM images ORDER BY created_at DESC`);

  if (!result.length) { res.json([]); return; }

  const [{ columns, values }] = result;
  const rows = values.map(row =>
    Object.fromEntries(columns.map((col, i) => [col, row[i]]))
  );

  const images = rows.map((r: any) => ({
    ...r,
    url: `/api/images/${r.id}/file`,
  }));

  res.json(images);
});

// GET /api/images/:id/file — serve the actual file
router.get('/:id/file', async (req: Request, res: Response) => {
  const db = await getDb();
  const result = db.exec(`SELECT filename, mimetype FROM images WHERE id = ?`, [req.params.id]);

  if (!result.length || !result[0].values.length) { res.status(404).json({ error: 'Not found' }); return; }

  const [filename, mimetype] = result[0].values[0] as string[];
  const filePath = join(UPLOADS_DIR, filename);

  if (!existsSync(filePath)) { res.status(404).json({ error: 'File missing from disk' }); return; }

  res.setHeader('Content-Type', mimetype);
  res.sendFile(filePath);
});

export default router;
