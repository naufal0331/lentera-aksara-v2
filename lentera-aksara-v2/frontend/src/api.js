const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
export async function api(path, opts = {}) {
  const t = localStorage.getItem('la_token');
  const fd = opts.body instanceof FormData;
  const r = await fetch(BASE + '/api' + path, {
    method: opts.method || 'GET',
    headers: { ...(fd ? {} : { 'Content-Type': 'application/json' }), ...(t ? { Authorization: 'Bearer ' + t } : {}) },
    body: !opts.body ? undefined : fd ? opts.body : JSON.stringify(opts.body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Terjadi kesalahan. Coba lagi.');
  return d;
}
