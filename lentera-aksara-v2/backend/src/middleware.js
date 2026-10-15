import jwt from 'jsonwebtoken';
export const sign = u => jwt.sign({ id: u.id, role: u.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
export function auth(req, res, next) {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  try { req.user = jwt.verify(t, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Silakan login terlebih dahulu.' }); }
}
// Otorisasi di sisi server: requireRole('admin') atau requireRole('author','admin')
export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : res.status(403).json({ error: 'Akses ditolak.' });
export const validate = schema => (req, res, next) => {
  const r = schema.safeParse(req.body);
  if (!r.success) return res.status(400).json({ error: r.error.issues[0].message });
  req.body = r.data; next();
};
