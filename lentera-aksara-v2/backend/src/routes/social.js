import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../db.js';
import { auth, validate } from '../middleware.js';
const r = Router();
const A = fn => (q, s, n) => Promise.resolve(fn(q, s, n)).catch(n);

// ---- Komentar (baca: publik, tulis: harus login) ----
r.get('/comments/:chapterId', A(async (req, res) => res.json((await db.query(
  `SELECT m.id,m.body,m.created_at,m.user_id,u.username FROM comments m JOIN users u ON u.id=m.user_id
   JOIN chapters c ON c.id=m.chapter_id JOIN novels n ON n.id=c.novel_id
   WHERE m.chapter_id=? AND n.publish_status='published' ORDER BY m.id DESC LIMIT 100`, [req.params.chapterId]))[0])));

r.post('/comments/:chapterId', auth, rateLimit({ windowMs: 60000, max: 15 }),
  validate(z.object({ body: z.string().trim().min(1, 'Komentar tidak boleh kosong').max(1000, 'Komentar maksimal 1000 karakter') })),
  A(async (req, res) => {
    const [[c]] = await db.query(`SELECT c.id,c.number,n.id AS novel_id,n.title AS novel_title,n.author_id FROM chapters c
      JOIN novels n ON n.id=c.novel_id WHERE c.id=? AND c.status='published' AND n.publish_status='published'`, [req.params.chapterId]);
    if (!c) return res.status(404).json({ error: 'Bab tidak ditemukan.' });
    await db.query('INSERT INTO comments(user_id,chapter_id,body) VALUES(?,?,?)', [req.user.id, c.id, req.body.body]);
    if (c.author_id !== req.user.id)
      await db.query('INSERT INTO notifications(user_id,message,link) VALUES(?,?,?)',
        [c.author_id, `Komentar baru di "${c.novel_title}" bab ${c.number}`, `/read/${c.novel_id}/${c.number}`]);
    res.status(201).json({ ok: true });
  }));

r.delete('/comments/:id', auth, A(async (req, res) => {
  const [[m]] = await db.query('SELECT user_id FROM comments WHERE id=?', [req.params.id]);
  if (!m) return res.status(404).json({ error: 'Komentar tidak ditemukan.' });
  if (m.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Akses ditolak.' });
  await db.query('DELETE FROM comments WHERE id=?', [req.params.id]); res.json({ ok: true });
}));

// ---- Notifikasi ----
const unread = async uid => (await db.query('SELECT COUNT(*) AS n FROM notifications WHERE user_id=? AND is_read=0', [uid]))[0][0].n;
r.get('/notifications', auth, A(async (req, res) => {
  const [items] = await db.query('SELECT id,message,link,is_read,created_at FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 50', [req.user.id]);
  res.json({ unread: await unread(req.user.id), items });
}));
r.get('/notifications/count', auth, A(async (req, res) => res.json({ unread: await unread(req.user.id) })));
r.post('/notifications/read', auth, A(async (req, res) => { await db.query('UPDATE notifications SET is_read=1 WHERE user_id=?', [req.user.id]); res.json({ ok: true }); }));

r.use((err, _q, res, _n) => { console.error(err); res.status(500).json({ error: 'Terjadi kesalahan pada server.' }); });
export default r;
