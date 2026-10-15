import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from './api.js';
import { useApp } from './ctx.js';

export const AdminGuard = ({ children }) => { const { user } = useApp(); return user?.role === 'admin' ? children : <p className="state">Halaman ini khusus admin.</p>; };
function useLoad(path) {
  const [d, setD] = useState(null); const [err, setErr] = useState('');
  const load = () => api(path).then(x => { setErr(''); setD(x); }, e => setErr(e.message));
  useEffect(() => { setD(null); load(); }, [path]);
  return [d, load, err];
}
const act = async (fn, reload) => { try { await fn(); reload && reload(); } catch (e) { alert(e.message); } };
const PUB = { draft: 'Draf', pending: 'Menunggu', published: 'Terbit', rejected: 'Ditolak' };
const Wait = ({ d, err }) => err ? <p className="state err">{err}</p> : !d ? <p className="state">Memuat…</p> : null;

function Stats() {
  const [d, , err] = useLoad('/admin/stats'); if (!d) return <Wait d={d} err={err} />;
  const items = [['Pengguna', d.users], ['Penulis', d.authors], ['Novel terbit', d.published], ['Menunggu moderasi', d.pending], ['Bab', d.chapters], ['Total pembaca', d.views], ['Laporan terbuka', d.reports], ['Pengguna baru (7 hari)', d.newUsers]];
  return <div className="stats">{items.map(([l, v]) => <div className="card" key={l}><b>{Number(v).toLocaleString('id-ID')}</b><small>{l}</small></div>)}</div>;
}

function Detail({ id }) {
  const [cs, load, err] = useLoad(`/admin/novels/${id}/chapters`); const [view, setView] = useState(null);
  const show = c => act(async () => setView(await api('/admin/chapters/' + c.id)));
  const del = c => confirm('Hapus bab ini?') && act(() => api('/admin/chapters/' + c.id, { method: 'DELETE' }), () => { setView(null); load(); });
  if (!cs) return <Wait d={cs} err={err} />;
  return <div className="detail-box">{cs.length === 0 ? <small>Belum ada bab.</small> : cs.map(c => <div className="row" key={c.id} style={{ justifyContent: 'space-between' }}>
    <span>Bab {c.number} — {c.title} <span className="badge">{c.status === 'published' ? 'Terbit' : 'Draf'}</span></span>
    <span><button className="icon" onClick={() => show(c)}>Lihat</button> <button className="icon" onClick={() => del(c)}>Hapus</button></span></div>)}
    {view && <div className="card" style={{ padding: '1rem', marginTop: '.6rem', whiteSpace: 'pre-wrap' }}><b>{view.title}</b><br />{view.content || '(kosong)'}</div>}</div>;
}

function Novels({ fixed }) {
  const [st, setSt] = useState(fixed || ''); const [d, load, err] = useLoad('/admin/novels?status=' + st); const [open, setOpen] = useState(null);
  const set = (id, s) => act(() => api(`/admin/novels/${id}/status`, { method: 'PATCH', body: { publish_status: s } }), load);
  const del = n => confirm(`Hapus "${n.title}" permanen beserta semua babnya?`) && act(() => api('/admin/novels/' + n.id, { method: 'DELETE' }), load);
  return <>{!fixed && <select className="sel" value={st} onChange={e => setSt(e.target.value)}><option value="">Semua status</option>{Object.entries(PUB).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}
    <Wait d={d} err={err} />
    {d && (d.length === 0 ? <p className="state">{fixed ? 'Tidak ada novel yang menunggu moderasi. 🎉' : 'Tidak ada novel.'}</p> : d.map(n => <div className="card mrow" key={n.id}>
      <div className="row" style={{ justifyContent: 'space-between' }}><div><b>{n.title}</b><br /><small>oleh {n.author} · {n.chapters} bab · 👁 {n.views}</small></div><span className="badge">{PUB[n.publish_status]}</span></div>
      <p className="muted">{n.synopsis || '(tanpa sinopsis)'}</p>
      <div className="row"><button className="icon" onClick={() => setOpen(open === n.id ? null : n.id)}>{open === n.id ? 'Tutup' : 'Periksa bab'}</button>
        {n.publish_status !== 'published' && <button className="btn btn-primary" onClick={() => set(n.id, 'published')}>Setujui</button>}
        {n.publish_status !== 'rejected' && <button className="btn btn-dark" onClick={() => set(n.id, 'rejected')}>Tolak</button>}
        <button className="icon" onClick={() => del(n)}>Hapus</button></div>
      {open === n.id && <Detail id={n.id} />}</div>))}</>;
}

function Users() {
  const { user } = useApp(); const [q, setQ] = useState(''); const [d, load, err] = useLoad('/admin/users?q=' + encodeURIComponent(q));
  const patch = (u, b) => act(() => api('/admin/users/' + u.id, { method: 'PATCH', body: b }), load);
  return <><input className="sel" placeholder="Cari username atau email…" value={q} onChange={e => setQ(e.target.value)} /><Wait d={d} err={err} />
    {d && d.map(u => <div className="card mrow row" key={u.id} style={{ justifyContent: 'space-between' }}>
      <div><b>{u.username}</b> {!u.is_active && <span className="badge" style={{ background: '#C0392B' }}>Nonaktif</span>}<br /><small>{u.email}</small></div>
      <div className="row"><select className="sel" value={u.role} disabled={u.id === user.id} onChange={e => patch(u, { role: e.target.value })}>
        <option value="reader">Pembaca</option><option value="author">Penulis</option><option value="admin">Admin</option></select>
        <button className="icon" disabled={u.id === user.id} onClick={() => patch(u, { is_active: !u.is_active })}>{u.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button></div></div>)}</>;
}

function Genres() {
  const [d, load, err] = useLoad('/novels/genres'); const [name, setName] = useState('');
  const add = () => act(async () => { await api('/admin/genres', { method: 'POST', body: { name } }); setName(''); }, load);
  const del = g => confirm(`Hapus kategori "${g.name}"?`) && act(() => api('/admin/genres/' + g.id, { method: 'DELETE' }), load);
  return <><div className="row"><input className="sel" placeholder="Nama kategori baru" value={name} onChange={e => setName(e.target.value)} /><button className="btn btn-primary" onClick={add}>Tambah</button></div>
    <Wait d={d} err={err} /><div className="chips" style={{ flexWrap: 'wrap' }}>{d && d.map(g => <button key={g.id} onClick={() => del(g)} title="Klik untuk menghapus">{g.name} ✕</button>)}</div></>;
}

function Reports() {
  const [d, load, err] = useLoad('/admin/reports');
  const done = r => act(() => api('/admin/reports/' + r.id, { method: 'PATCH' }), load);
  const del = r => confirm(`Hapus novel "${r.title}"?`) && act(() => api('/admin/novels/' + r.novel_id, { method: 'DELETE' }), load);
  return <><Wait d={d} err={err} />{d && (d.length === 0 ? <p className="state">Belum ada laporan.</p> : d.map(r => <div className="card mrow" key={r.id}>
    <div className="row" style={{ justifyContent: 'space-between' }}><b>{r.title}</b><span className="badge">{r.status === 'open' ? 'Terbuka' : 'Selesai'}</span></div>
    <p>{r.reason}</p><small>dilaporkan oleh {r.reporter}</small>
    {r.status === 'open' && <div className="row"><button className="btn btn-primary" onClick={() => done(r)}>Tandai selesai</button><button className="icon" onClick={() => del(r)}>Hapus novel</button></div>}</div>))}</>;
}

const TABS = [['Statistik', <Stats />], ['Moderasi', <Novels fixed="pending" />], ['Novel', <Novels />], ['Pengguna', <Users />], ['Kategori', <Genres />], ['Laporan', <Reports />]];
export function AdminDash() {
  const [t, setT] = useState(0);
  return <><h2>🛡️ Dashboard Admin</h2><div className="chips">{TABS.map(([n], i) => <button key={n} className={t === i ? 'on' : ''} onClick={() => setT(i)}>{n}</button>)}</div>
    <div key={t}>{TABS[t][1]}</div></>;
}
