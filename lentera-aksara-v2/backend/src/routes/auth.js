import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db.js';
import { sign, auth, validate } from '../middleware.js';
const r = Router();
const reg = z.object({ username: z.string().min(3).max(40), email: z.string().email(),
  password: z.string().min(8, 'Password minimal 8 karakter'), asAuthor: z.boolean().optional() });

r.post('/register', validate(reg), async (req, res) => {
  const { username, email, password, asAuthor } = req.body;
  const [dup] = await db.query('SELECT id FROM users WHERE email=? OR username=?', [email, username]);
  if (dup.length) return res.status(409).json({ error: 'Email atau username sudah dipakai.' });
  const hash = await bcrypt.hash(password, 12);
  const role = asAuthor ? 'author' : 'reader';           // admin TIDAK bisa dibuat dari sini
  const [ins] = await db.query('INSERT INTO users(username,email,password_hash,role) VALUES(?,?,?,?)', [username, email, hash, role]);
  const u = { id: ins.insertId, username, email, role };
  res.status(201).json({ token: sign(u), user: u });
});

r.post('/login', validate(z.object({ email: z.string().email(), password: z.string().min(1) })), async (req, res) => {
  const [[u]] = await db.query('SELECT * FROM users WHERE email=? AND is_active=1', [req.body.email]);
  if (!u || !(await bcrypt.compare(req.body.password, u.password_hash)))
    return res.status(401).json({ error: 'Email atau password salah.' });
  res.json({ token: sign(u), user: { id: u.id, username: u.username, email: u.email, role: u.role } });
});

r.get('/me', auth, async (req, res) => {
  const [[u]] = await db.query('SELECT id,username,email,role,bio,created_at FROM users WHERE id=?', [req.user.id]);
  res.json(u);
});
export default r;
