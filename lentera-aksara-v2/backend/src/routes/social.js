import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../db.js';
import { auth, validate } from '../middleware.js';
import { publishDueMiddleware } from '../publishDue.js';
const r = Router();
const A = fn => (q, s, n) => Promise.resolve(fn(q, s, n)).catch(n);
r.use(publishDueMiddleware);

// ---- Komentar (baca: publik, tulis: harus login) ----
r.get('/comments/:chapterId', A(async (req, res) => res.json((await db.query(
  `SELECT m.id,m.body,m.created_at,m.user_id,m.parent_id,u.username,n.author_id,(m.user_id=n.author_id) AS is_author FROM comments m JOIN users u ON u.id=m.user_id
   JOIN chapters c ON c.id=m.chapter_id JOIN novels n ON n.id=c.novel_id
   WHERE m.chapter_id=? AND n.publish_status='published' ORDER BY m.id DESC LIMIT 100`, [req.params.chapterId]))[0])));

r.post('/comments/:chapterId', auth, rateLimit({ windowMs: 60000, max: 15 }),
  validate(z.object({ body: z.string().trim().min(1, 'Komentar tidak boleh kosong').max(1000, 'Komentar maksimal 1000 karakter'),
    parentId: z.number().int().positive().optional() })),
  A(async (req, res) => {
    const [[c]] = await db.query(`SELECT c.id,c.number,n.id AS novel_id,n.title AS novel_title,n.author_id FROM chapters c
      JOIN novels n ON n.id=c.novel_id WHERE c.id=? AND c.status='published' AND n.publish_status='published'`, [req.params.chapterId]);
    if (!c) return res.status(404).json({ error: 'Bab tidak ditemukan.' });
    // Balasan: hanya penulis novel (atau admin), satu tingkat, ke komentar utama di bab yang sama
    if (req.body.parentId) {
      if (c.author_id !== req.user.id && req.user.role !== 'admin')
        return res.status(403).json({ error: 'Hanya penulis yang dapat membalas komentar.' });
      const [[p]] = await db.query('SELECT id,user_id FROM comments WHERE id=? AND chapter_id=? AND parent_id IS NULL', [req.body.parentId, c.id]);
      if (!p) return res.status(404).json({ error: 'Komentar yang dibalas tidak ditemukan.' });
      await db.query('INSERT INTO comments(user_id,chapter_id,body,parent_id) VALUES(?,?,?,?)', [req.user.id, c.id, req.body.body, p.id]);
      if (p.user_id !== req.user.id)
        await db.query('INSERT INTO notifications(user_id,message,link) VALUES(?,?,?)',
          [p.user_id, `Penulis membalas komentarmu di "${c.novel_title}" bab ${c.number}`, `/read/${c.novel_id}/${c.number}`]);
      return res.status(201).json({ ok: true });
    }
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
  await db.query('DELETE FROM comments WHERE id=? OR parent_id=?', [req.params.id, req.params.id]); res.json({ ok: true });
}));

// ---- Rating novel (1-5 bintang) ----
r.get('/rating/:novelId', A(async (req, res) => {
  const [[x]] = await db.query('SELECT AVG(stars) AS avg, COUNT(*) AS n FROM novel_ratings WHERE novel_id=?', [req.params.novelId]);
  res.json({ avg: Number(x.avg || 0), count: Number(x.n || 0) });
}));
// Rata-rata untuk banyak novel sekaligus: /ratings?ids=1,2,3
r.get('/ratings', A(async (req, res) => {
  const ids = String(req.query.ids || '').split(',').map(Number).filter(Number.isInteger).slice(0, 60);
  if (!ids.length) return res.json({});
  const [rows] = await db.query('SELECT novel_id, AVG(stars) AS avg, COUNT(*) AS n FROM novel_ratings WHERE novel_id IN (?) GROUP BY novel_id', [ids]);
  res.json(Object.fromEntries(rows.map(x => [x.novel_id, { avg: Number(x.avg), n: Number(x.n) }])));
}));
r.get('/rating/:novelId/mine', auth, A(async (req, res) => {
  const [[x]] = await db.query('SELECT stars FROM novel_ratings WHERE user_id=? AND novel_id=?', [req.user.id, req.params.novelId]);
  res.json({ stars: x ? x.stars : 0 });
}));
r.put('/rating/:novelId', auth, rateLimit({ windowMs: 60000, max: 30 }),
  validate(z.object({ stars: z.number().int().min(1, 'Nilai minimal 1').max(5, 'Nilai maksimal 5') })),
  A(async (req, res) => {
    const [[n]] = await db.query("SELECT id,author_id FROM novels WHERE id=? AND publish_status='published'", [req.params.novelId]);
    if (!n) return res.status(404).json({ error: 'Novel tidak ditemukan.' });
    if (n.author_id === req.user.id) return res.status(403).json({ error: 'Penulis tidak dapat menilai karyanya sendiri.' });
    await db.query('INSERT INTO novel_ratings(user_id,novel_id,stars) VALUES(?,?,?) ON DUPLICATE KEY UPDATE stars=VALUES(stars)',
      [req.user.id, n.id, req.body.stars]);
    res.json({ ok: true });
  }));

// ---- Ikuti penulis (lewat id novel, supaya tidak bergantung pada data penulis di halaman novel) ----
const followState = async (uid, novelId) => {
  const [[n]] = await db.query('SELECT author_id FROM novels WHERE id=?', [novelId]);
  if (!n) return null;
  const [[f]] = await db.query('SELECT COUNT(*) AS c FROM author_follows WHERE author_id=?', [n.author_id]);
  const [[m]] = await db.query('SELECT COUNT(*) AS c FROM author_follows WHERE author_id=? AND user_id=?', [n.author_id, uid]);
  return { authorId: n.author_id, following: Number(m.c) > 0, followers: Number(f.c), isSelf: n.author_id === uid };
};
r.get('/follow/novel/:novelId', auth, A(async (req, res) => {
  const st = await followState(req.user.id, req.params.novelId);
  if (!st) return res.status(404).json({ error: 'Novel tidak ditemukan.' });
  res.json(st);
}));
r.put('/follow/novel/:novelId', auth, rateLimit({ windowMs: 60000, max: 30 }), A(async (req, res) => {
  const st = await followState(req.user.id, req.params.novelId);
  if (!st) return res.status(404).json({ error: 'Novel tidak ditemukan.' });
  if (st.isSelf) return res.status(400).json({ error: 'Kamu tidak dapat mengikuti dirimu sendiri.' });
  await db.query('INSERT IGNORE INTO author_follows(user_id,author_id) VALUES(?,?)', [req.user.id, st.authorId]);
  res.json(await followState(req.user.id, req.params.novelId));
}));
r.delete('/follow/novel/:novelId', auth, A(async (req, res) => {
  const st = await followState(req.user.id, req.params.novelId);
  if (!st) return res.status(404).json({ error: 'Novel tidak ditemukan.' });
  await db.query('DELETE FROM author_follows WHERE user_id=? AND author_id=?', [req.user.id, st.authorId]);
  res.json(await followState(req.user.id, req.params.novelId));
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
