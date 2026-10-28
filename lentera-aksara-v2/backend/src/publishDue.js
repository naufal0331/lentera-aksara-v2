// Menerbitkan bab terjadwal yang waktunya sudah tiba, tanpa cron.
// Dipanggil sebagai middleware (maks. sekali per 20 detik per instance server).
import { db } from './db.js';

let last = 0, running = false;

export async function publishDue() {
  const now = new Date(); // pakai Date JS (bukan NOW()) supaya zona waktu konsisten dengan saat disimpan
  const [due] = await db.query(
    "SELECT id,novel_id,number,title FROM chapters WHERE status='draft' AND publish_at IS NOT NULL AND publish_at<=?", [now]);
  for (const c of due) {
    // Hanya satu proses yang menang (affectedRows=1), jadi notifikasi tidak dobel
    const [u] = await db.query(
      "UPDATE chapters SET status='published', publish_at=NULL WHERE id=? AND status='draft' AND publish_at IS NOT NULL AND publish_at<=?", [c.id, now]);
    if (u.affectedRows !== 1) continue;
    const [[n]] = await db.query('SELECT title,publish_status,author_id FROM novels WHERE id=?', [c.novel_id]);
    if (!n || n.publish_status !== 'published') continue;
    await db.query(`INSERT INTO notifications(user_id,message,link)
      SELECT t.user_id, ?, ? FROM (SELECT user_id FROM library WHERE novel_id=? UNION SELECT user_id FROM author_follows WHERE author_id=?) t
      WHERE t.user_id <> ?`,
      [`Bab baru di "${n.title}": ${c.title}`, `/read/${c.novel_id}/${c.number}`, c.novel_id, n.author_id, n.author_id]);
  }
  return due.length;
}

export function publishDueMiddleware(_req, _res, next) {
  const t = Date.now();
  if (running || t - last < 20000) return next();
  last = t; running = true;
  publishDue().catch(e => console.error('publishDue:', e)).finally(() => { running = false; next(); });
}
