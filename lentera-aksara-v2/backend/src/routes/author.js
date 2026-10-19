import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../db.js';
import { auth, requireRole, validate } from '../middleware.js';
const r = Router();
r.use(auth, requireRole('author', 'admin'));

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const upload = multer({ limits: { fileSize: 2 * 1024 * 1024 }, storage: multer.memoryStorage(),
  fileFilter: (_q, f, cb) => cb(null, !!EXT[f.mimetype]) });
const uploadPages = multer({ limits: { fileSize: 3 * 1024 * 1024, files: 20 }, storage: multer.memoryStorage(),
  fileFilter: (_q, f, cb) => cb(null, !!EXT[f.mimetype]) });
// Cover disimpan di Cloudinary bila CLOUDINARY_URL diisi (online); kalau tidak, di folder uploads (lokal)
const toCloud = (buf, sub) => new Promise((ok, no) => cloudinary.uploader.upload_stream(
  { folder: 'lentera-aksara/' + sub, resource_type: 'image' }, (e, r) => e ? no(e) : ok(r.secure_url)).end(buf));
async function saveCover(file, sub = 'covers') {
  if (process.env.CLOUDINARY_URL) return toCloud(file.buffer, sub);
  const name = crypto.randomUUID() + EXT[file.mimetype];
  fs.writeFileSync('uploads/' + name, file.buffer);
  return `${process.env.API_URL || 'http://localhost:4000'}/uploads/${name}`;
}

const novelSchema = z.object({ title: z.string().min(3, 'Judul minimal 3 karakter').max(150),
  synopsis: z.string().max(3000).default(''), tags: z.string().max(255).default(''),
  status: z.enum(['ongoing', 'completed']), type: z.enum(['novel', 'comic']).default('novel'), genreIds: z.array(z.number().int()).max(5, 'Maksimal 5 genre') });
const chapterSchema = z.object({ title: z.string().min(1, 'Judul bab wajib diisi').max(150),
  content: z.string().max(200000).default(''), status: z.enum(['draft', 'published']) });

// Hanya pemilik novel yang boleh mengubahnya
const own = async (req, res, next) => {
  const [[n]] = await db.query('SELECT id FROM novels WHERE id=? AND author_id=?', [req.params.id, req.user.id]);
  if (!n) return res.status(404).json({ error: 'Novel tidak ditemukan.' });
  next();
};
const setGenres = async (id, ids) => {
  await db.query('DELETE FROM novel_genres WHERE novel_id=?', [id]);
  for (const g of ids) await db.query('INSERT IGNORE INTO novel_genres VALUES(?,?)', [id, g]);
};

r.get('/novels', async (req, res) => res.json((await db.query(
  `SELECT n.id,n.title,n.type,n.cover_url,n.status,n.publish_status,n.views,
   (SELECT COUNT(*) FROM chapters c WHERE c.novel_id=n.id) AS chapters,
   (SELECT COUNT(*) FROM library l WHERE l.novel_id=n.id) AS saves
   FROM novels n WHERE n.author_id=? ORDER BY n.updated_at DESC`, [req.user.id]))[0]));

r.post('/novels', validate(novelSchema), async (req, res) => {
  const b = req.body;
  const [i] = await db.query('INSERT INTO novels(author_id,title,synopsis,tags,status,type) VALUES(?,?,?,?,?,?)', [req.user.id, b.title, b.synopsis, b.tags, b.status, b.type]);
  await setGenres(i.insertId, b.genreIds); res.status(201).json({ id: i.insertId });
});

r.get('/novels/:id', own, async (req, res) => {
  const [[n]] = await db.query('SELECT * FROM novels WHERE id=?', [req.params.id]);
  const [g] = await db.query('SELECT genre_id FROM novel_genres WHERE novel_id=?', [n.id]);
  const [chapters] = await db.query('SELECT id,number,title,status FROM chapters WHERE novel_id=? ORDER BY number', [n.id]);
  res.json({ ...n, genreIds: g.map(x => x.genre_id), chapters });
});

r.put('/novels/:id', own, validate(novelSchema), async (req, res) => {
  const b = req.body;
  await db.query('UPDATE novels SET title=?,synopsis=?,tags=?,status=? WHERE id=?', [b.title, b.synopsis, b.tags, b.status, req.params.id]);
  await setGenres(req.params.id, b.genreIds); res.json({ ok: true });
});

r.post('/novels/:id/cover', own, upload.single('cover'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Gunakan gambar JPG/PNG/WEBP maksimal 2 MB.' });
  let url;
  try { url = await saveCover(req.file); } catch (e) { console.error(e); return res.status(502).json({ error: 'Gagal mengunggah gambar. Coba lagi.' }); }
  await db.query('UPDATE novels SET cover_url=? WHERE id=?', [url, req.params.id]); res.json({ cover_url: url });
});

// Ajukan terbit. AUTO_PUBLISH=true hanya untuk pengujian sebelum dashboard admin ada.
r.post('/novels/:id/submit', own, async (req, res) => {
  const [[c]] = await db.query("SELECT COUNT(*) AS n FROM chapters WHERE novel_id=? AND status='published'", [req.params.id]);
  if (!c.n) return res.status(400).json({ error: 'Terbitkan minimal 1 bab sebelum mengajukan novel.' });
  const st = process.env.AUTO_PUBLISH === 'true' ? 'published' : 'pending';
  await db.query('UPDATE novels SET publish_status=? WHERE id=?', [st, req.params.id]);
  res.json({ publish_status: st, message: st === 'published' ? 'Novel sudah terbit.' : 'Novel dikirim, menunggu moderasi admin.' });
});

r.delete('/novels/:id', own, async (req, res) => { await db.query('DELETE FROM novels WHERE id=?', [req.params.id]); res.json({ ok: true }); });

r.get('/novels/:id/chapters/:chId', own, async (req, res) => {
  const [[c]] = await db.query('SELECT id,number,title,content,status FROM chapters WHERE id=? AND novel_id=?', [req.params.chId, req.params.id]);
  if (!c) return res.status(404).json({ error: 'Bab tidak ditemukan.' });
  const [pages] = await db.query('SELECT id,position,image_url FROM chapter_pages WHERE chapter_id=? ORDER BY position', [c.id]);
  res.json({ ...c, pages });
});
r.post('/novels/:id/chapters', own, validate(chapterSchema), async (req, res) => {
  const b = req.body;
  const [[m]] = await db.query('SELECT COALESCE(MAX(number),0)+1 AS nx FROM chapters WHERE novel_id=?', [req.params.id]);
  const [i] = await db.query('INSERT INTO chapters(novel_id,number,title,content,status) VALUES(?,?,?,?,?)', [req.params.id, m.nx, b.title, b.content, b.status]);
  res.status(201).json({ id: i.insertId, number: m.nx });
});
r.put('/novels/:id/chapters/:chId', own, validate(chapterSchema), async (req, res) => {
  const b = req.body;
  await db.query('UPDATE chapters SET title=?,content=?,status=? WHERE id=? AND novel_id=?', [b.title, b.content, b.status, req.params.chId, req.params.id]);
  res.json({ ok: true });
});
r.delete('/novels/:id/chapters/:chId', own, async (req, res) => {
  await db.query('DELETE FROM chapters WHERE id=? AND novel_id=?', [req.params.chId, req.params.id]); res.json({ ok: true });
});
// Komik: halaman gambar per bab (urutan baca = urutan unggah)
r.post('/novels/:id/chapters/:chId/pages', own, uploadPages.array('pages', 20), async (req, res) => {
  const [[n]] = await db.query('SELECT type FROM novels WHERE id=?', [req.params.id]);
  if (n.type !== 'comic') return res.status(400).json({ error: 'Halaman gambar hanya untuk komik.' });
  const [[c]] = await db.query('SELECT id FROM chapters WHERE id=? AND novel_id=?', [req.params.chId, req.params.id]);
  if (!c) return res.status(404).json({ error: 'Bab tidak ditemukan.' });
  if (!req.files?.length) return res.status(400).json({ error: 'Pilih gambar JPG/PNG/WEBP, maks. 3 MB per gambar dan 20 gambar sekali unggah.' });
  const [[m]] = await db.query('SELECT COALESCE(MAX(position),0) AS p FROM chapter_pages WHERE chapter_id=?', [c.id]);
  try {
    let pos = m.p;
    for (const f of req.files) { const url = await saveCover(f, 'pages'); await db.query('INSERT INTO chapter_pages(chapter_id,position,image_url) VALUES(?,?,?)', [c.id, ++pos, url]); }
  } catch (e) { console.error(e); return res.status(502).json({ error: 'Gagal mengunggah sebagian gambar. Coba lagi.' }); }
  res.status(201).json({ ok: true });
});
r.delete('/novels/:id/chapters/:chId/pages/:pageId', own, async (req, res) => {
  await db.query('DELETE p FROM chapter_pages p JOIN chapters c ON c.id=p.chapter_id WHERE p.id=? AND c.id=? AND c.novel_id=?', [req.params.pageId, req.params.chId, req.params.id]);
  res.json({ ok: true });
});
r.use((err, _q, res, _n) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Gambar terlalu besar (cover maks. 2 MB, halaman komik maks. 3 MB).' });
  if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ error: 'Maksimal 20 gambar sekali unggah.' });
  console.error(err); res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
});
export default r;
