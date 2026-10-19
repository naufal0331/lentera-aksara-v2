import { Router } from 'express';
import { db } from '../db.js';
const r = Router();
const CARD = `n.id,n.title,n.type,n.cover_url,n.status,n.views,u.username AS author,
  (SELECT GROUP_CONCAT(g.name) FROM novel_genres ng JOIN genres g ON g.id=ng.genre_id WHERE ng.novel_id=n.id) AS genres`;

r.get('/genres', async (_q, res) => res.json((await db.query('SELECT * FROM genres'))[0]));

// GET /api/novels?q=&genre=romance&sort=popular|new&page=1
r.get('/', async (req, res) => {
  const { q, genre, type, sort = 'new' } = req.query;
  const page = Math.max(1, +req.query.page || 1), size = 12;
  const where = ["n.publish_status='published'"], p = [];
  if (q) { where.push('(n.title LIKE ? OR u.username LIKE ?)'); p.push(`%${q}%`, `%${q}%`); }
  if (genre) { where.push('EXISTS(SELECT 1 FROM novel_genres ng JOIN genres g ON g.id=ng.genre_id WHERE ng.novel_id=n.id AND g.slug=?)'); p.push(genre); }
  if (type === 'novel' || type === 'comic') { where.push('n.type=?'); p.push(type); }
  const order = sort === 'popular' ? 'n.views DESC' : sort === 'recommended' ? 'RAND()' : 'n.created_at DESC';
  const [rows] = await db.query(
    `SELECT ${CARD} FROM novels n JOIN users u ON u.id=n.author_id WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ? OFFSET ?`,
    [...p, size, (page - 1) * size]);
  res.json({ page, items: rows });
});

r.get('/:id', async (req, res) => {
  const [[n]] = await db.query(`SELECT ${CARD},n.synopsis,n.tags FROM novels n JOIN users u ON u.id=n.author_id
    WHERE n.id=? AND n.publish_status='published'`, [req.params.id]);
  if (!n) return res.status(404).json({ error: 'Novel tidak ditemukan.' });
  const [chapters] = await db.query("SELECT id,number,title FROM chapters WHERE novel_id=? AND status='published' ORDER BY number", [n.id]);
  res.json({ ...n, chapters });
});

r.get('/:id/chapters/:num', async (req, res) => {
  const [[c]] = await db.query(`SELECT c.*,n.title AS novel_title FROM chapters c JOIN novels n ON n.id=c.novel_id
    WHERE c.novel_id=? AND c.number=? AND c.status='published' AND n.publish_status='published'`, [req.params.id, req.params.num]);
  if (!c) return res.status(404).json({ error: 'Bab tidak ditemukan.' });
  db.query('UPDATE novels SET views=views+1 WHERE id=?', [c.novel_id]);
  const [[nt]] = await db.query('SELECT type FROM novels WHERE id=?', [c.novel_id]);
  const pages = nt.type === 'comic' ? (await db.query('SELECT image_url FROM chapter_pages WHERE chapter_id=? ORDER BY position', [c.id]))[0].map(x => x.image_url) : [];
  const [[nav]] = await db.query(`SELECT
    (SELECT MAX(number) FROM chapters WHERE novel_id=? AND status='published' AND number<?) AS prev,
    (SELECT MIN(number) FROM chapters WHERE novel_id=? AND status='published' AND number>?) AS next`,
    [c.novel_id, c.number, c.novel_id, c.number]);
  res.json({ ...c, ...nav, pages });
});
export default r;
