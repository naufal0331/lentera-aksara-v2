import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { asset } from './asset.js';
import { api } from './api.js';
import { useApp } from './ctx.js';
import { Comments } from './social.jsx';

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
      <div className="row">{n.type === 'comic' && <span className="badge ongoing">Komik</span>}<span className={'badge ' + n.status}>{label(n.status)}</span>{n.views != null && <small>👁 {n.views.toLocaleString('id-ID')}</small>}</div></div>
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
  const q = sp.get('q') || '', genre = sp.get('genre') || '', type = sp.get('type') || '';
  const genres = useFetch('/novels/genres');
  const qs = new URLSearchParams({ ...(q && { q }), ...(genre && { genre }), ...(type && { type }) }).toString();
  const list = useFetch('/novels?' + qs + '&sort=new');
  const pop = useFetch('/novels?sort=popular' + (type ? '&type=' + type : ''));
  const rec = useFetch('/novels?sort=recommended' + (type ? '&type=' + type : ''));
  const pick = g => { const p = {}; if (q) p.q = q; if (g) p.genre = g; if (type) p.type = type; setSp(p); };
  const top = pop.data?.items?.[0];
  return (<>
    {!q && !genre && !type && pop.data?.items?.length > 0 && <Hero items={pop.data.items.slice(0, 5)} />}
    <div className="chips">{[['', 'Semua'], ['novel', '📖 Novel'], ['comic', '🎨 Komik']].map(([v, l]) => <button key={v} className={type === v ? 'on' : ''} onClick={() => { const p = {}; if (q) p.q = q; if (genre) p.genre = genre; if (v) p.type = v; setSp(p); }}>{l}</button>)}</div>
    <div className="chips">
      <button className={!genre ? 'on' : ''} onClick={() => pick('')}>Semua</button>
      {genres.data?.map(g => <button key={g.id} className={genre === g.slug ? 'on' : ''} onClick={() => pick(g.slug)}>{g.name}</button>)}
    </div>
    {q || genre || type ? <section><h2>Hasil{q && ` untuk "${q}"`}</h2>
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


// Pembaca suara menggunakan Web Speech API bawaan browser.
function TextToSpeech({ text = "" }) {
  const [status, setStatus] = useState("idle");
  const [rate, setRate] = useState(1);
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;

    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      window.speechSynthesis.cancel();
    };
  }, []);

  const play = () => {
    if (!("speechSynthesis" in window)) {
      alert("Browser ini belum mendukung fitur baca otomatis.");
      return;
    }

    const content = String(text || "").trim();
    if (!content) {
      alert("Teks bab ini belum tersedia untuk dibacakan.");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    const voice = voices.find(v => v.lang.toLowerCase() === "id-id")
      || voices.find(v => v.lang.toLowerCase().startsWith("id"));

    utterance.lang = "id-ID";
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.onstart = () => setStatus("playing");
    utterance.onend = () => setStatus("idle");
    utterance.onerror = () => setStatus("idle");

    window.speechSynthesis.speak(utterance);
  };

  const pause = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.pause();
    setStatus("paused");
  };

  const resume = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.resume();
    setStatus("playing");
  };

  const stop = () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setStatus("idle");
  };

  if (!("speechSynthesis" in window)) {
    return <p className="state">Browser ini belum mendukung baca otomatis.</p>;
  }

  return (
    <section className="tts-player" aria-label="Kontrol baca otomatis">
      <div className="tts-title">🔊 Baca Otomatis</div>
      <div className="tts-controls">
        <button type="button" onClick={play} disabled={status === "playing"}>
          ▶ Putar
        </button>
        <button
          type="button"
          onClick={status === "paused" ? resume : pause}
          disabled={status === "idle"}
        >
          {status === "paused" ? "▶ Lanjutkan" : "⏸ Jeda"}
        </button>
        <button type="button" onClick={stop} disabled={status === "idle"}>
          ⏹ Berhenti
        </button>
      </div>
      <label className="tts-speed">
        Kecepatan baca
        <select
          value={rate}
          onChange={e => setRate(Number(e.target.value))}
          aria-label="Kecepatan baca"
        >
          <option value="0.7">Lambat (0,7x)</option>
          <option value="1">Normal (1x)</option>
          <option value="1.2">Agak cepat (1,2x)</option>
          <option value="1.5">Cepat (1,5x)</option>
        </select>
      </label>
      <small aria-live="polite">
        {status === "playing"
          ? "Sedang membacakan bab ini…"
          : status === "paused"
          ? "Pembacaan dijeda."
          : "Tekan Putar untuk mendengarkan bab ini."}
        {!voices.some(v => v.lang.toLowerCase().startsWith("id")) &&
          " Suara Bahasa Indonesia mungkin belum tersedia di perangkat."}
      </small>
    </section>
  );
}

export function Reader() {
  const { id, num } = useParams(); const { user, theme, setTheme } = useApp();
  const s = useFetch(`/novels/${id}/chapters/${num}`); const c = s.data;
  const [fs, setFs] = useState(+localStorage.la_fs || 18); const [lh, setLh] = useState(+localStorage.la_lh || 1.9);
  const [paper, setPaper] = useState(localStorage.la_paper || 'white');
  const [fontFamily, setFontFamily] = useState(localStorage.la_font || 'serif');
  const [bm, setBm] = useState(false);
  useEffect(() => { localStorage.la_fs = fs; localStorage.la_lh = lh; localStorage.la_paper = paper; localStorage.la_font = fontFamily; }, [fs, lh, paper, fontFamily]);
  useEffect(() => { window.scrollTo(0, 0); setBm(false); }, [num]);
  useEffect(() => { if (user && c) api('/library/bookmarks').then(l => setBm(l.some(b => b.chapter_id === c.id))).catch(() => {}); }, [user, c]);
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
  // ===== Geser untuk pindah bab (animasi membalik kertas) =====
  const goNav = useNavigate();
  const stage = useRef(null), drag = useRef(null), flipDir = useRef(null);
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const origin = (el, dir) => { // poros putar di sisi kiri/kanan, setinggi tengah layar
    const r = el.getBoundingClientRect();
    const oy = Math.max(0, Math.min(r.height, window.innerHeight / 2 - r.top));
    el.style.transformOrigin = (dir === 'next' ? 'left ' : 'right ') + oy + 'px';
  };
  const settle = () => { const el = stage.current; if (!el) return;
    el.style.transition = 'transform .28s ease-out, opacity .28s ease-out, filter .28s ease-out';
    el.style.transform = ''; el.style.opacity = ''; el.style.filter = ''; };
  const turn = dir => {
    const target = c && (dir === 'next' ? c.next : c.prev), el = stage.current;
    if (!target) return settle();
    flipDir.current = dir;
    const to = () => goNav(`/read/${id}/${target}`);
    if (!el || reduce) return to();
    origin(el, dir);
    el.style.transition = 'transform .34s ease-in, opacity .34s ease-in, filter .34s ease-in';
    el.style.transform = `perspective(1800px) rotateY(${dir === 'next' ? -100 : 100}deg)`;
    el.style.opacity = 0; el.style.filter = 'brightness(.85)';
    setTimeout(to, 300);
  };
  const onDown = e => { if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, mode: null, dx: 0 }; };
  const onMove = e => { const d = drag.current, el = stage.current; if (!d || !el) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.mode) {
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
      d.mode = Math.abs(dx) > Math.abs(dy) * 1.4 ? 'h' : 'v';
      if (d.mode === 'h') { el.setPointerCapture?.(e.pointerId); el.style.transition = 'none'; el.style.userSelect = 'none'; window.getSelection()?.removeAllRanges(); }
    }
    if (d.mode !== 'h' || reduce) return;
    d.dx = dx;
    const dir = dx < 0 ? 'next' : 'prev', ok = dir === 'next' ? c.next : c.prev;
    const p = Math.min(1, Math.abs(dx) / ((el.offsetWidth || 1) * 0.7));
    const ang = (ok ? 100 : 8) * p;
    origin(el, dir);
    el.style.transform = `perspective(1800px) rotateY(${dir === 'next' ? -ang : ang}deg)`;
    el.style.opacity = 1 - (ok ? p * 0.5 : 0); el.style.filter = `brightness(${1 - p * 0.12})`; };
  const onUp = () => { const d = drag.current, el = stage.current; drag.current = null;
    if (!d || d.mode !== 'h' || !el) return;
    el.style.userSelect = '';
    if (Math.abs(d.dx) > Math.min(110, el.offsetWidth * 0.2)) turn(d.dx < 0 ? 'next' : 'prev'); else settle(); };
  useEffect(() => {
    const key = e => { if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight') turn('next'); else if (e.key === 'ArrowLeft') turn('prev'); };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [c, id]);

  return (<State s={s}>{c && <>
    <div className="rbar card">
      <Link to={`/novel/${id}`}>← {c.novel_title}</Link>
      <span><button onClick={() => setFs(Math.max(14, fs - 2))}>A−</button><button onClick={() => setFs(Math.min(30, fs + 2))}>A+</button>
        <button onClick={() => setLh(Math.max(1.4, +(lh - 0.2).toFixed(1)))}>☰−</button><button onClick={() => setLh(Math.min(2.6, +(lh + 0.2).toFixed(1)))}>☰+</button>
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☀️' : '🌙'}</button>
        <button onClick={mark}>{bm ? '🔖' : '🏷️'}</button></span></div>
    {!c.pages?.length && <><div className="reader-options card">
      <label>Warna kertas
        <select value={paper} onChange={e => setPaper(e.target.value)} aria-label="Warna kertas">
          <option value="white">Putih</option>
          <option value="sepia">Krem / Sepia</option>
          <option value="dark">Gelap</option>
        </select>
      </label>
      <label>Jenis huruf
        <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} aria-label="Jenis huruf">
          <option value="serif">Serif (buku)</option>
          <option value="sans-serif">Sans-serif (modern)</option>
          <option value="georgia">Georgia</option>
          <option value="literata">Literata (jika tersedia)</option>
          <option value="monospace">Monospace</option>
        </select>
      </label>
    </div><TextToSpeech text={c.content || ''} /></>}
    <div className="flip-host"><div ref={stage} className={'flip-stage' + (flipDir.current ? ' enter' : '')}
      onAnimationEnd={() => { flipDir.current = null; }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { drag.current = null; settle(); }}>
    <article className={'reader' + (c.pages?.length ? ' comic' : ` paper-${paper}`)} style={{ '--fs': fs + 'px', '--lh': lh, fontFamily: fontFamily === 'georgia' ? 'Georgia, serif' : fontFamily === 'literata' ? 'Literata, Georgia, serif' : fontFamily }}> 
      <h2>Bab {c.number}: {c.title}</h2>
      {c.pages?.length ? c.pages.map((u, i) => <img key={i} className="cpage" src={asset(u)} alt={`Halaman ${i + 1}`} loading="lazy" />) : (c.content || '').split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}</article></div></div>
    <div className="pager">
      {c.prev ? <Link className="btn btn-dark" to={`/read/${id}/${c.prev}`}>← Sebelumnya</Link> : <span />}
      {c.next ? <Link className="btn btn-primary" to={`/read/${id}/${c.next}`}>Berikutnya →</Link> : <Link className="btn btn-dark" to={`/novel/${id}`}>Selesai</Link>}</div>
    <p className="swipe-hint">Geser ke kiri atau kanan untuk pindah bab</p>
    <Comments chapterId={c.id} /></>}</State>);
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

// Halaman akun (menu profil di HP)
const ROLE = { reader: 'Pembaca', author: 'Penulis', admin: 'Admin' };
export function Account() {
  const { user, logout, theme, setTheme } = useApp();
  if (!user) return <p className="state">Silakan <Link to="/masuk">masuk</Link> untuk melihat akun Anda.</p>;
  const canWrite = ['author', 'admin'].includes(user.role);
  return (<div className="acc">
    <div className="card acc-head"><div className="avatar">{user.username[0].toUpperCase()}</div>
      <div><b>{user.username}</b><br /><small>{user.email}</small><br /><span className="badge ongoing">{ROLE[user.role]}</span></div></div>
    <div className="card acc-menu">
      <Link to="/perpustakaan">📚 Perpustakaan dan Riwayat Membaca <span>›</span></Link>
      <Link to="/notifikasi">🔔 Notifikasi <span>›</span></Link>
      <Link to="/bookmark">🔖 Bookmark <span>›</span></Link>
      <Link to="/profil">⚙️ Edit Profil <span>›</span></Link>
      {canWrite && <Link to="/penulis">✍️ Dashboard Penulis <span>›</span></Link>}
      {canWrite && <Link to="/penulis/novel">📖 Dashboard Novel <span>›</span></Link>}
      {canWrite && <Link to="/penulis/komik">🎨 Dashboard Komik <span>›</span></Link>}
      {user.role === 'admin' && <Link to="/admin">🛡️ Dashboard Admin <span>›</span></Link>}
      <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☀️ Mode terang' : '🌙 Mode gelap'}</button>
      <button onClick={logout}>🚪 Keluar</button></div></div>);
}
