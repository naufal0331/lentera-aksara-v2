import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from './api.js';
import { useApp } from './ctx.js';

const tgl = d => new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

// ---------- Komentar di bawah bab ----------
export function Comments({ chapterId }) {
  const { user } = useApp();
  const [list, setList] = useState(null); const [text, setText] = useState(''); const [err, setErr] = useState('');
  const load = () => api('/social/comments/' + chapterId).then(setList).catch(e => setErr(e.message));
  useEffect(() => { setList(null); setErr(''); load(); }, [chapterId]);
  const send = async e => { e.preventDefault(); setErr('');
    try { await api('/social/comments/' + chapterId, { method: 'POST', body: { body: text } }); setText(''); load(); } catch (x) { setErr(x.message); } };
  const del = async c => { if (!confirm('Hapus komentar ini?')) return;
    try { await api('/social/comments/' + c.id, { method: 'DELETE' }); load(); } catch (x) { setErr(x.message); } };
  return (<section className="comments"><h3>💬 Komentar{list ? ` (${list.length})` : ''}</h3>
    {user ? <form onSubmit={send} className="cform"><textarea rows={3} maxLength={1000} placeholder="Tulis komentar…" value={text} onChange={e => setText(e.target.value)} />
        <button className="btn btn-primary" disabled={!text.trim()}>Kirim</button></form>
      : <p className="state"><Link to="/masuk">Masuk</Link> untuk berkomentar.</p>}
    {err && <p className="state err">{err}</p>}
    {list === null ? <p className="state">Memuat komentar…</p> : list.length === 0 ? <p className="state">Belum ada komentar. Jadilah yang pertama!</p> :
      list.map(c => <div className="comment card" key={c.id}>
        <div className="row" style={{ justifyContent: 'space-between' }}><b>{c.username}</b><small>{tgl(c.created_at)}</small></div>
        <p>{c.body}</p>
        {user && (user.id === c.user_id || user.role === 'admin') && <button className="icon" onClick={() => del(c)}>Hapus</button>}</div>)}</section>);
}

// ---------- Lonceng notifikasi di bar atas ----------
export function Bell() {
  const loc = useLocation(); const [n, setN] = useState(0);
  useEffect(() => { api('/social/notifications/count').then(r => setN(r.unread)).catch(() => {}); }, [loc.pathname]);
  return <Link to="/notifikasi" className="bell" aria-label="Notifikasi">🔔{n > 0 && <span className="dot">{n > 9 ? '9+' : n}</span>}</Link>;
}

export function Notifications() {
  const { user } = useApp(); const [d, setD] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { if (!user) return;
    api('/social/notifications').then(r => { setD(r); if (r.unread) api('/social/notifications/read', { method: 'POST' }).catch(() => {}); }).catch(e => setErr(e.message)); }, []);
  if (!user) return <p className="state">Silakan <Link to="/masuk">masuk</Link> untuk melihat notifikasi.</p>;
  return (<div className="editor"><h2>🔔 Notifikasi</h2>
    {err && <p className="state err">{err}</p>}
    {!d && !err && <p className="state">Memuat…</p>}
    {d && (d.items.length === 0 ? <p className="state">Belum ada notifikasi. Simpan novel ke perpustakaan untuk dapat kabar bab baru.</p> :
      d.items.map(n => <Link key={n.id} to={n.link || '/'} className={'card notif' + (n.is_read ? '' : ' new')}>
        {n.message}<small>{tgl(n.created_at)}</small></Link>))}</div>);
}

// ---------- Daftar bookmark ----------
export function Bookmarks() {
  const { user } = useApp(); const [d, setD] = useState(null); const [err, setErr] = useState('');
  const load = () => api('/library/bookmarks').then(setD).catch(e => setErr(e.message));
  useEffect(() => { if (user) load(); }, []);
  const del = async b => { try { await api('/library/bookmarks/' + b.chapter_id, { method: 'DELETE' }); load(); } catch (x) { setErr(x.message); } };
  if (!user) return <p className="state">Silakan <Link to="/masuk">masuk</Link> untuk melihat bookmark.</p>;
  return (<div className="editor"><h2>🔖 Bookmark Saya</h2>
    {err && <p className="state err">{err}</p>}
    {!d && !err && <p className="state">Memuat…</p>}
    {d && (d.length === 0 ? <p className="state">Belum ada bookmark. Tekan ikon 🏷️ di halaman baca untuk menandai bab.</p> :
      d.map(b => <div className="card bmrow" key={b.chapter_id}>
        <Link to={`/read/${b.novel_id}/${b.number}`}><b>{b.novel_title}</b><br /><small>{b.type === 'comic' ? 'Episode' : 'Bab'} {b.number} — {b.chapter_title}</small></Link>
        <button className="icon" onClick={() => del(b)}>Hapus</button></div>))}</div>);
}

// ---------- Edit profil dan ganti password ----------
export function Profile() {
  const { user, login } = useApp();
  const [f, setF] = useState({ username: user?.username || '', bio: '' }); const [msg, setMsg] = useState('');
  const [pw, setPw] = useState({ current: '', next: '' }); const [msg2, setMsg2] = useState('');
  useEffect(() => { if (user) api('/auth/me').then(u => setF({ username: u.username, bio: u.bio || '' })).catch(() => {}); }, []);
  if (!user) return <p className="state">Silakan <Link to="/masuk">masuk</Link> untuk mengedit profil.</p>;
  const save = async e => { e.preventDefault(); setMsg('');
    try { const r = await api('/auth/profile', { method: 'PUT', body: f }); login({ user: { ...user, username: r.username } }); setMsg('✓ Profil disimpan.'); }
    catch (x) { setMsg('⚠ ' + x.message); } };
  const savePw = async e => { e.preventDefault(); setMsg2('');
    try { await api('/auth/password', { method: 'PUT', body: pw }); setPw({ current: '', next: '' }); setMsg2('✓ Password diganti.'); }
    catch (x) { setMsg2('⚠ ' + x.message); } };
  return (<div className="editor"><h2>⚙️ Edit Profil</h2>
    <form className="card form" onSubmit={save}>
      <label>Username<input value={f.username} onChange={e => setF({ ...f, username: e.target.value })} minLength={3} maxLength={40} required /></label>
      <label>Bio<textarea rows={4} maxLength={500} placeholder="Ceritakan sedikit tentang Anda" value={f.bio} onChange={e => setF({ ...f, bio: e.target.value })} /></label>
      <small>Email: {user.email}</small>
      {msg && <p className={'state ' + (msg.startsWith('⚠') ? 'err' : '')}>{msg}</p>}
      <button className="btn btn-primary">Simpan Profil</button></form>
    <form className="card form" onSubmit={savePw}><h3>Ganti Password</h3>
      <input type="password" placeholder="Password saat ini" value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} required />
      <input type="password" placeholder="Password baru (min. 8 karakter)" value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} minLength={8} required />
      {msg2 && <p className={'state ' + (msg2.startsWith('⚠') ? 'err' : '')}>{msg2}</p>}
      <button className="btn btn-dark">Ganti Password</button></form></div>);
}
