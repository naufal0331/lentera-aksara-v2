import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { asset } from './asset.js';
import { api } from './api.js';
import { useApp } from './ctx.js';

const PUB = { draft: 'Draf', pending: 'Menunggu moderasi', published: 'Terbit', rejected: 'Ditolak' };
export const Guard = ({ children }) => { const { user } = useApp();
  return user && ['author', 'admin'].includes(user.role) ? children
    : <p className="state">Halaman ini khusus penulis. <Link to="/masuk">Masuk</Link> atau <Link to="/daftar">daftar sebagai penulis</Link>.</p>; };

export function AuthorDash() {
  const [s, set] = useState({ loading: true });
  useEffect(() => { api('/author/novels').then(data => set({ data }), e => set({ error: e.message })); }, []);
  if (s.loading) return <p className="state">Memuat…</p>;
  if (s.error) return <p className="state err">{s.error}</p>;
  const sum = k => s.data.reduce((a, n) => a + Number(n[k]), 0);
  return (<>
    <div className="row" style={{ justifyContent: 'space-between' }}><h2>✍️ Dashboard Penulis</h2>
      <Link className="btn btn-primary" to="/penulis/novel/baru">+ Novel Baru</Link></div>
    <div className="stats">{[['Novel', s.data.length], ['Bab', sum('chapters')], ['Pembaca', sum('views')], ['Disimpan', sum('saves')]].map(([l, v]) =>
      <div className="card" key={l}><b>{v.toLocaleString('id-ID')}</b><small>{l}</small></div>)}</div>
    {s.data.length === 0 ? <p className="state">Anda belum punya novel. Klik “Novel Baru” untuk mulai menulis.</p> :
      s.data.map(n => <Link key={n.id} to={`/penulis/novel/${n.id}`} className="arow card">
        <img src={asset(n.cover_url || '/covers/pena.svg')} alt="" />
        <div><b>{n.title}</b><div className="row"><span className="badge">{PUB[n.publish_status]}</span>
          <span className={'badge ' + n.status}>{n.status === 'completed' ? 'Tamat' : 'Berlanjut'}</span></div>
          <small>{n.chapters} bab · 👁 {n.views} · 📚 {n.saves} disimpan</small></div></Link>)}</>);
}

export function NovelEditor() {
  const { id } = useParams(); const nav = useNavigate(); const isNew = id === 'baru';
  const [genres, setGenres] = useState([]); const [novel, setNovel] = useState(null);
  const [f, setF] = useState({ title: '', synopsis: '', tags: '', status: 'ongoing', genreIds: [] });
  const [msg, setMsg] = useState(''); const [ch, setCh] = useState(null);
  const load = async () => { if (isNew) return; const n = await api('/author/novels/' + id); setNovel(n);
    setF({ title: n.title, synopsis: n.synopsis || '', tags: n.tags || '', status: n.status, genreIds: n.genreIds }); };
  useEffect(() => { api('/novels/genres').then(setGenres); load().catch(e => setMsg('⚠ ' + e.message)); }, [id]);
  const run = async fn => { try { setMsg(''); await fn(); } catch (e) { setMsg('⚠ ' + e.message); } };
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const toggleG = g => setF({ ...f, genreIds: f.genreIds.includes(g) ? f.genreIds.filter(x => x !== g) : [...f.genreIds, g] });
  const save = () => run(async () => { if (isNew) { const r = await api('/author/novels', { method: 'POST', body: f }); nav('/penulis/novel/' + r.id); }
    else { await api('/author/novels/' + id, { method: 'PUT', body: f }); await load(); setMsg('✓ Tersimpan'); } });
  const cover = e => run(async () => { const fd = new FormData(); fd.append('cover', e.target.files[0]);
    await api(`/author/novels/${id}/cover`, { method: 'POST', body: fd }); await load(); setMsg('✓ Cover diperbarui'); });
  const submit = () => run(async () => { const r = await api(`/author/novels/${id}/submit`, { method: 'POST' }); await load(); setMsg('✓ ' + r.message); });
  const del = () => confirm('Hapus novel beserta semua babnya?') && run(async () => { await api('/author/novels/' + id, { method: 'DELETE' }); nav('/penulis'); });
  const openCh = c => run(async () => setCh(c ? await api(`/author/novels/${id}/chapters/${c.id}`) : { title: '', content: '', status: 'draft' }));
  const saveCh = () => run(async () => { const b = { title: ch.title, content: ch.content, status: ch.status };
    await api(`/author/novels/${id}/chapters${ch.id ? '/' + ch.id : ''}`, { method: ch.id ? 'PUT' : 'POST', body: b });
    setCh(null); await load(); setMsg('✓ Bab tersimpan'); });
  const delCh = c => confirm('Hapus bab ini?') && run(async () => { await api(`/author/novels/${id}/chapters/${c.id}`, { method: 'DELETE' }); await load(); });
  return (<div className="editor"><Link to="/penulis">← Dashboard</Link><h2>{isNew ? 'Novel Baru' : 'Kelola Novel'}</h2>
    {msg && <p className={'state ' + (msg.startsWith('⚠') ? 'err' : '')}>{msg}</p>}
    <div className="card form">
      <input placeholder="Judul novel" value={f.title} onChange={set('title')} />
      <textarea rows={5} placeholder="Sinopsis" value={f.synopsis} onChange={set('synopsis')} />
      <input placeholder="Tag (pisahkan dengan koma)" value={f.tags} onChange={set('tags')} />
      <select value={f.status} onChange={set('status')}><option value="ongoing">Berlanjut</option><option value="completed">Tamat</option></select>
      <div className="chips">{genres.map(g => <button type="button" key={g.id} className={f.genreIds.includes(g.id) ? 'on' : ''} onClick={() => toggleG(g.id)}>{g.name}</button>)}</div>
      <button className="btn btn-primary" onClick={save}>{isNew ? 'Buat Novel' : 'Simpan Perubahan'}</button></div>
    {!isNew && novel && <>
      <div className="card form"><h3>Cover</h3>{novel.cover_url && <img className="cover" style={{ maxWidth: 160 }} src={asset(novel.cover_url)} alt="" />}
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={cover} /><small>JPG/PNG/WEBP, maks. 2 MB</small></div>
      <div className="card form"><div className="row" style={{ justifyContent: 'space-between' }}><h3>Bab ({novel.chapters.length})</h3>
        <button className="btn btn-dark" onClick={() => openCh(null)}>+ Bab Baru</button></div>
        <ul className="chlist">{novel.chapters.map(c => <li key={c.id} className="row" style={{ justifyContent: 'space-between' }}>
          <span>Bab {c.number} — {c.title} <span className="badge">{c.status === 'published' ? 'Terbit' : 'Draf'}</span></span>
          <span><button className="icon" onClick={() => openCh(c)}>Edit</button> <button className="icon" onClick={() => delCh(c)}>Hapus</button></span></li>)}</ul>
        {ch && <div className="form"><input placeholder="Judul bab" value={ch.title} onChange={e => setCh({ ...ch, title: e.target.value })} />
          <textarea rows={14} placeholder="Tulis isi bab di sini…" value={ch.content} onChange={e => setCh({ ...ch, content: e.target.value })} />
          <select value={ch.status} onChange={e => setCh({ ...ch, status: e.target.value })}><option value="draft">Simpan sebagai draf</option><option value="published">Terbitkan bab</option></select>
          <div className="row"><button className="btn btn-primary" onClick={saveCh}>Simpan Bab</button><button className="btn btn-dark" onClick={() => setCh(null)}>Batal</button></div></div>}</div>
      <div className="card form"><h3>Penerbitan</h3><p>Status: <span className="badge">{PUB[novel.publish_status]}</span></p>
        <div className="row"><button className="btn btn-primary" onClick={submit}>Ajukan Terbit</button><button className="btn btn-dark" onClick={del}>Hapus Novel</button></div></div></>}</div>);
}
