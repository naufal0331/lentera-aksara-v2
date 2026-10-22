import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { auth, requireRole, validate } from '../middleware.js';
const r = Router();
r.use(auth, requireRole('admin'));   // otorisasi admin di sisi server
const A = fn => (q, s, n) => Promise.resolve(fn(q, s, n)).catch(n);

r.get('/stats', A(async (_q, res) => res.json((await db.query(
  `SELECT (SELECT COUNT(*) FROM users) users,(SELECT COUNT(*) FROM users WHERE role='author') authors,
   (SELECT COUNT(*) FROM novels WHERE publish_status='published') published,(SELECT COUNT(*) FROM novels WHERE publish_status='pending') pending,
   (SELECT COUNT(*) FROM chapters) chapters,(SELECT COALESCE(SUM(views),0) FROM novels) views,
   (SELECT COUNT(*) FROM reports WHERE status='open') reports,(SELECT COUNT(*) FROM users WHERE created_at>=NOW()-INTERVAL 7 DAY) newUsers`))[0][0])));

r.get('/users', A(async (req, res) => { const q = `%${req.query.q || ''}%`;
  res.json((await db.query('SELECT id,username,email,role,is_active,created_at FROM users WHERE username LIKE ? OR email LIKE ? ORDER BY id DESC LIMIT 100', [q, q]))[0]); }));
r.patch('/users/:id', validate(z.object({ role: z.enum(['reader', 'author', 'admin']).optional(), is_active: z.boolean().optional() })), A(async (req, res) => {
  if (+req.params.id === req.user.id) return res.status(400).json({ error: 'Tidak bisa mengubah akun Anda sendiri.' });
  const { role, is_active } = req.body;
  if (role !== undefined) await db.query('UPDATE users SET role=? WHERE id=?', [role, req.params.id]);
  if (is_active !== undefined) await db.query('UPDATE users SET is_active=? WHERE id=?', [is_active ? 1 : 0, req.params.id]);
  res.json({ ok: true }); }));

r.get('/novels', A(async (req, res) => { const st = req.query.status || '';
  res.json((await db.query(`SELECT n.id,n.title,n.type,n.synopsis,n.publish_status,n.status,n.views,u.username AS author,
    (SELECT COUNT(*) FROM chapters c WHERE c.novel_id=n.id) AS chapters FROM novels n JOIN users u ON u.id=n.author_id
    WHERE (?='' OR n.publish_status=?) ORDER BY n.updated_at DESC LIMIT 100`, [st, st]))[0]); }));
r.patch('/novels/:id/status', validate(z.object({ publish_status: z.enum(['published', 'rejected', 'draft']) })), A(async (req, res) => {
  await db.query('UPDATE novels SET publish_status=? WHERE id=?', [req.body.publish_status, req.params.id]);
  const [[n]] = await db.query('SELECT title,author_id FROM novels WHERE id=?', [req.params.id]);
  if (n && req.body.publish_status !== 'draft') await db.query('INSERT INTO notifications(user_id,message,link) VALUES(?,?,?)',
    [n.author_id, req.body.publish_status === 'published' ? `Karya "${n.title}" disetujui dan sudah terbit 🎉` : `Karya "${n.title}" ditolak admin`, '/penulis']);
  res.json({ ok: true }); }));
r.delete('/novels/:id', A(async (req, res) => { await db.query('DELETE FROM novels WHERE id=?', [req.params.id]); res.json({ ok: true }); }));
r.get('/novels/:id/chapters', A(async (req, res) => res.json((await db.query('SELECT id,number,title,status FROM chapters WHERE novel_id=? ORDER BY number', [req.params.id]))[0])));
r.get('/chapters/:chId', A(async (req, res) => { const [[c]] = await db.query('SELECT id,title,content FROM chapters WHERE id=?', [req.params.chId]);
  if (!c) return res.status(404).json({ error: 'Bab tidak ditemukan.' });
  const [pg] = await db.query('SELECT image_url FROM chapter_pages WHERE chapter_id=? ORDER BY position', [c.id]);
  res.json({ ...c, pages: pg.map(x => x.image_url) }); }));
r.delete('/chapters/:chId', A(async (req, res) => { await db.query('DELETE FROM chapters WHERE id=?', [req.params.chId]); res.json({ ok: true }); }));

r.post('/genres', validate(z.object({ name: z.string().min(2).max(40) })), A(async (req, res) => {
  const slug = req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  try { await db.query('INSERT INTO genres(name,slug) VALUES(?,?)', [req.body.name, slug]); res.status(201).json({ ok: true }); }
  catch { res.status(409).json({ error: 'Kategori sudah ada.' }); } }));
r.delete('/genres/:id', A(async (req, res) => { await db.query('DELETE FROM genres WHERE id=?', [req.params.id]); res.json({ ok: true }); }));

r.get('/reports', A(async (_q, res) => res.json((await db.query(
  `SELECT p.id,p.reason,p.status,p.created_at,p.novel_id,n.title,u.username AS reporter FROM reports p
   JOIN novels n ON n.id=p.novel_id JOIN users u ON u.id=p.reporter_id ORDER BY p.status='open' DESC,p.id DESC LIMIT 100`))[0])));
r.patch('/reports/:id', A(async (req, res) => { await db.query("UPDATE reports SET status='resolved' WHERE id=?", [req.params.id]); res.json({ ok: true }); }));

r.use((err, _q, res, _n) => { console.error(err); res.status(500).json({ error: 'Terjadi kesalahan pada server.' }); });
export default r;
