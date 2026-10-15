import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { asset } from './asset.js';
import { api } from './api.js';
import { useApp } from './ctx.js';

function useFetch(path) {
  const [s, set] = useState({ loading: true });
  useEffect(() => { set({ loading: true }); api(path).then(data => set({ data }), e => set({ error: e.message })); }, [path]);
  return s;
}
const State = ({ s, empty, children }) => s.loading ? <p className="state">Memuat…</p> : s.error ? <p className="state err">{s.error}</p> : empty ? <p className="state">Belum ada novel yang cocok.</p> : children;
const label = st => st === 'completed' ? 'Tamat' : 'Berlanjut';

export const NovelCard = ({ n }) => (
  <Link to={`/novel/${n.id}`} className="ncard card">
    <img className="cover" src={asset(n.cover_url)} alt={n.title} loading="lazy" />
    <div className="ninfo"><b>{n.title}</b><small>{n.author}</small><small>{n.genres}</small>
      <div className="row"><span className={'badge ' + n.status}>{label(n.status)}</span>{n.views != null && <small>👁 {n.views.toLocaleString('id-ID')}</small>}</div></div>
  </Link>);
const Grid = ({ items }) => <div className="grid">{items.map(n => <NovelCard key={n.id} n={n} />)}</div>;

function Hero({ items }) {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI(x => (x + 1) % items.length), 5000); return () => clearInterval(t); }, [items.length]);
  const n = items[i]; const go = d => setI((i + d + items.length) % items.length);
  return (<section className="hero">
    <button className="harrow" onClick={() => go(-1)} aria-label="Sebelumnya">‹</button>
    <div key={n.id} className="page-enter"><span className="badge ongoing">Novel Pilihan</span><h1>{n.title}</h1>
      <p>{n.genres} · {n.author}</p><Link className="btn btn-primary" to={`/novel/${n.id}`}>Baca Sekarang</Link>
      <div className="dots">{items.map((_, k) => <span key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)} />)}</div></div>
    <img src={asset(n.cover_url)} alt={n.title} />
    <button className="harrow" onClick={() => go(1)} aria-label="Berikutnya">›</button></section>);
}

export function Home() {
  const [sp, setSp] = useSearchParams();
  const q = sp.get('q') || '', genre = sp.get('genre') || '';
  const genres = useFetch('/novels/genres');
  const qs = new URLSearchParams({ ...(q && { q }), ...(genre && { genre }) }).toString();
  const list = useFetch('/novels?' + qs + '&sort=new');
  const pop = useFetch('/novels?sort=popular');
  const rec = useFetch('/novels?sort=recommended');
  const pick = g => { const p = {}; if (q) p.q = q; if (g) p.genre = g; setSp(p); };
  const top = pop.data?.items?.[0];
  return (<>
    {!q && !genre && pop.data?.items?.length > 0 && <Hero items={pop.data.items.slice(0, 5)} />}
    <div className="chips">
      <button className={!genre ? 'on' : ''} onClick={() => pick('')}>Semua</button>
      {genres.data?.map(g => <button key={g.id} className={genre === g.slug ? 'on' : ''} onClick={() => pick(g.slug)}>{g.name}</button>)}
    </div>
    {q || genre ? <section><h2>Hasil{q && ` untuk "${q}"`}</h2>
        <State s={list} empty={list.data?.items.length === 0}>{list.data && <Grid items={list.data.items} />}</State></section>
      : <>
        <section><h2>🔥 Populer</h2><State s={pop} empty={pop.data?.items.length === 0}>{pop.data && <Grid items={pop.data.items} />}</State></section>
        <section><h2>✨ Terbaru</h2><State s={list} empty={list.data?.items.length === 0}>{list.data && <Grid items={list.data.items} />}</State></section>
        <section><h2>💡 Rekomendasi Untukmu</h2><State s={rec} empty={rec.data?.items.length === 0}>{rec.data && <Grid items={rec.data.items} />}</State></section></>}
  </>);
}

export function Novel() {
  const { id } = useParams(); const { user } = useApp(); const nav = useNavigate();
  const s = useFetch('/novels/' + id); const n = s.data;
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (user) api('/library').then(l => setSaved(l.some(x => x.id == id))).catch(() => {}); }, [user, id]);
  const toggle = async () => { if (!user) return nav('/masuk'); await api('/library/' + id, { method: saved ? 'DELETE' : 'POST' }); setSaved(!saved); };
  const report = async () => { if (!user) return nav('/masuk'); const reason = prompt('Alasan melaporkan novel ini (min. 5 karakter):'); if (!reason) return;
    try { await api('/library/report/' + id, { method: 'POST', body: { reason } }); alert('Terima kasih, laporan dikirim ke admin.'); } catch (e) { alert(e.message); } };
  return (<State s={s}>{n && <article className="detail">
    <img className="cover big" src={asset(n.cover_url)} alt={n.title} />
    <div><h1>{n.title}</h1><p className="muted">oleh {n.author} · {n.genres}</p>
      <span className={'badge ' + n.status}>{label(n.status)}</span> <small>👁 {n.views.toLocaleString('id-ID')} pembaca</small>
      <p className="syn">{n.synopsis}</p>
      <div className="row">{n.chapters[0] && <Link className="btn btn-primary" to={`/read/${n.id}/${n.chapters[0].number}`}>Mulai Membaca</Link>}
        <button className="btn btn-dark" onClick={toggle}>{saved ? '✓ Tersimpan' : '+ Simpan ke Perpustakaan'}</button><button className="icon" onClick={report}>🚩 Laporkan</button></div>
      <h3>Daftar Bab</h3>
      {n.chapters.length === 0 ? <p className="state">Belum ada bab.</p> :
        <ul className="chlist">{n.chapters.map(c => <li key={c.id}><Link to={`/read/${n.id}/${c.number}`}>Bab {c.number} — {c.title}</Link></li>)}</ul>}
    </div></article>}</State>);
}

export function Reader() {
  const { id, num } = useParams(); const { user, theme, setTheme } = useApp();
  const s = useFetch(`/novels/${id}/chapters/${num}`); const c = s.data;
  const [fs, setFs] = useState(+localStorage.la_fs || 18); const [lh, setLh] = useState(+localStorage.la_lh || 1.9);
  const [bm, setBm] = useState(false);
  useEffect(() => { localStorage.la_fs = fs; localStorage.la_lh = lh; }, [fs, lh]);
  useEffect(() => { window.scrollTo(0, 0); setBm(false); }, [num]);
  useEffect(() => {
    if (!user || !c) return; let t;
    const send = () => { const h = document.documentElement;
      const p = (h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)) * 100;
      api('/library/progress', { method: 'PUT', body: { novelId: +id, chapterId: c.id, scrollPct: Math.min(100, p) } }).catch(() => {}); };
    const on = () => { clearTimeout(t); t = setTimeout(send, 1200); };
    send(); window.addEventListener('scroll', on);
    return () => { clearTimeout(t); window.removeEventListener('scroll', on); };
  }, [user, c, id]);
  const mark = async () => { if (!user) return alert('Masuk dulu untuk memakai bookmark.');
    await api('/library/bookmarks/' + c.id, { method: bm ? 'DELETE' : 'POST' }); setBm(!bm); };
  return (<State s={s}>{c && <>
    <div className="rbar card">
      <Link to={`/novel/${id}`}>← {c.novel_title}</Link>
      <span><button onClick={() => setFs(Math.max(14, fs - 2))}>A−</button><button onClick={() => setFs(Math.min(30, fs + 2))}>A+</button>
        <button onClick={() => setLh(Math.max(1.4, +(lh - 0.2).toFixed(1)))}>☰−</button><button onClick={() => setLh(Math.min(2.6, +(lh + 0.2).toFixed(1)))}>☰+</button>
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☀️' : '🌙'}</button>
        <button onClick={mark}>{bm ? '🔖' : '🏷️'}</button></span></div>
    <article className="reader" style={{ '--fs': fs + 'px', '--lh': lh }}>
      <h2>Bab {c.number}: {c.title}</h2>
      {c.content.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}</article>
    <div className="pager">
      {c.prev ? <Link className="btn btn-dark" to={`/read/${id}/${c.prev}`}>← Sebelumnya</Link> : <span />}
      {c.next ? <Link className="btn btn-primary" to={`/read/${id}/${c.next}`}>Berikutnya →</Link> : <Link className="btn btn-dark" to={`/novel/${id}`}>Selesai</Link>}</div></>}</State>);
}

export function Auth({ mode }) {
  const { login } = useApp(); const nav = useNavigate();
  const [f, setF] = useState({ username: '', email: '', password: '', asAuthor: false });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const reg = mode === 'daftar'; const set = k => e => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const submit = async e => { e.preventDefault(); setErr(''); setBusy(true);
    try { login(await api('/auth/' + (reg ? 'register' : 'login'), { method: 'POST', body: reg ? f : { email: f.email, password: f.password } })); nav('/'); }
    catch (x) { setErr(x.message); } setBusy(false); };
  return (<form className="auth card" onSubmit={submit}><h2>{reg ? 'Buat Akun' : 'Masuk'}</h2>
    {reg && <input placeholder="Username" value={f.username} onChange={set('username')} required minLength={3} />}
    <input type="email" placeholder="Email" value={f.email} onChange={set('email')} required />
    <input type="password" placeholder="Password (min. 8 karakter)" value={f.password} onChange={set('password')} required />
    {reg && <label><input type="checkbox" checked={f.asAuthor} onChange={set('asAuthor')} /> Daftar sebagai penulis</label>}
    {err && <p className="state err">{err}</p>}
    <button className="btn btn-primary" disabled={busy}>{busy ? 'Memproses…' : reg ? 'Daftar' : 'Masuk'}</button>
    <small>{reg ? <Link to="/masuk">Sudah punya akun? Masuk</Link> : <Link to="/daftar">Belum punya akun? Daftar</Link>}</small></form>);
}

export function Library() {
  const { user } = useApp();
  const lib = useFetch(user ? '/library' : '/novels/genres'); const his = useFetch(user ? '/library/history' : '/novels/genres');
  if (!user) return <p className="state">Silakan <Link to="/masuk">masuk</Link> untuk melihat perpustakaan Anda.</p>;
  return (<><section><h2>📚 Perpustakaan Saya</h2><State s={lib} empty={lib.data?.length === 0}>{lib.data && <Grid items={lib.data} />}</State></section>
    <section><h2>🕘 Riwayat Membaca</h2><State s={his} empty={his.data?.length === 0}>
      <ul className="chlist">{his.data?.map(h => <li key={h.novel_id}><Link to={`/read/${h.novel_id}/${h.chapter_number}`}>{h.title} — Bab {h.chapter_number} ({h.scroll_pct}%) · Lanjutkan</Link></li>)}</ul></State></section></>);
}
