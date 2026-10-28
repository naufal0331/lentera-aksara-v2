import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './api.js';
import { useApp } from './ctx.js';

// ---------- Rating 1-5 bintang di halaman novel ----------
export function RatingBox({ novelId }) {
  const { user } = useApp(); const nav = useNavigate();
  const [r, setR] = useState(null); const [mine, setMine] = useState(0);
  const [hover, setHover] = useState(0); const [msg, setMsg] = useState('');
  const load = () => api('/social/rating/' + novelId).then(setR).catch(() => {});
  useEffect(() => {
    setMine(0); setMsg(''); load();
    if (user) api('/social/rating/' + novelId + '/mine').then(x => setMine(x.stars || 0)).catch(() => {});
  }, [novelId, user?.id]);
  const rate = async s => {
    if (!user) return nav('/masuk');
    setMsg('');
    try { await api('/social/rating/' + novelId, { method: 'PUT', body: { stars: s } }); setMine(s); load(); }
    catch (e) { setMsg(e.message); }
  };
  const own = hover || mine;
  const shown = own || Math.round(r?.avg || 0);
  return (<div className="rating">
    <div className="stars" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Beri nilai novel">
      {[1, 2, 3, 4, 5].map(i => <button type="button" key={i} role="radio" aria-checked={mine === i} aria-label={`${i} bintang`}
        className={'star' + (i <= shown ? ' on' : '') + (own ? ' mine' : '')}
        onMouseEnter={() => setHover(i)} onClick={() => rate(i)}>★</button>)}</div>
    <small>{r && r.count > 0 ? `${r.avg.toFixed(1)} dari 5 · ${r.count} penilaian` : 'Belum ada penilaian'}{mine ? ` · nilaimu ${mine}` : ''}</small>
    {msg && <small className="err">{msg}</small>}</div>);
}

// ---------- Tombol ikuti penulis ----------
export function FollowButton({ novelId }) {
  const { user } = useApp(); const nav = useNavigate();
  const [s, setS] = useState(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  useEffect(() => { setS(null); setErr(''); if (user) api('/social/follow/novel/' + novelId).then(setS).catch(() => {}); }, [novelId, user?.id]);
  if (user && s?.isSelf) return null; // penulis tidak mengikuti dirinya sendiri
  const toggle = async () => {
    if (!user) return nav('/masuk');
    setBusy(true); setErr('');
    try { setS(await api('/social/follow/novel/' + novelId, { method: s?.following ? 'DELETE' : 'PUT' })); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };
  return (<span className="follow">
    <button type="button" className={'btn ' + (s?.following ? 'btn-dark' : 'btn-primary')} onClick={toggle} disabled={busy}>
      {s?.following ? '✓ Mengikuti penulis' : '+ Ikuti penulis'}</button>
    {s ? <small> {s.followers} pengikut</small> : null}
    {err && <small className="err"> {err}</small>}</span>);
}

// ---------- Rating rata-rata untuk banyak novel sekaligus (kartu di beranda) ----------
export function useRatings(items) {
  const [m, setM] = useState({});
  const key = items.slice(0, 60).map(n => n.id).join(',');
  useEffect(() => {
    if (!key) return; let ok = true;
    api('/social/ratings?ids=' + key).then(d => ok && setM(d)).catch(() => {});
    return () => { ok = false; };
  }, [key]);
  return m;
}
