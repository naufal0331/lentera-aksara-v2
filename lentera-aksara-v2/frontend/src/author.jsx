import { useEffect, useRef, useState } from 'react';
import {
  Link,
  useParams,
  useNavigate,
  useSearchParams
} from 'react-router-dom';

import { asset } from './asset.js';
import { api } from './api.js';
import { useApp } from './ctx.js';

const PUB = {
  draft: 'Draf',
  pending: 'Menunggu moderasi',
  published: 'Terbit',
  rejected: 'Ditolak'
};

const pad2 = n => String(n).padStart(2, '0');
// ISO -> nilai <input type="datetime-local"> (waktu setempat)
const toLocalInput = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
const fmtWhen = v => new Date(v).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
// Mode penerbitan bab: draft | scheduled | published (diturunkan dari data server bila belum dipilih)
const modeOf = c => c.mode || (c.status === 'published' ? 'published' : c.publish_at ? 'scheduled' : 'draft');
const whenOf = c => c.when ?? toLocalInput(c.publish_at);

export const Guard = ({ children }) => {
  const { user } = useApp();

  return user && ['author', 'admin'].includes(user.role)
    ? children
    : (
      <p className="state">
        Halaman ini khusus penulis.{' '}
        <Link to="/masuk">Masuk</Link> atau{' '}
        <Link to="/daftar">daftar sebagai penulis</Link>.
      </p>
    );
};

export function AuthorDash({ typeFilter = 'all' }) {
  const [s, set] = useState({ loading: true });

  useEffect(() => {
    api('/author/novels')
      .then(data => set({ data }))
      .catch(e => set({ error: e.message }));
  }, []);

  if (s.loading) {
    return <p className="state">Memuat karya…</p>;
  }

  if (s.error) {
    return <p className="state err">{s.error}</p>;
  }

  const rows = s.data.filter(
    n => typeFilter === 'all' || n.type === typeFilter
  );

  const sum = key =>
    rows.reduce((total, n) => total + Number(n[key] || 0), 0);

  const isComic = typeFilter === 'comic';

  const heading = isComic
    ? '🎨 Dashboard Penulis Komik'
    : typeFilter === 'novel'
      ? '📖 Dashboard Penulis Novel'
      : '✍️ Dashboard Penulis';

  return (
    <>
      <div
        className="row"
        style={{
          justifyContent: 'space-between',
          flexWrap: 'wrap'
        }}
      >
        <h2>{heading}</h2>

        <div className="row" style={{ flexWrap: 'wrap' }}>
          <Link className="btn btn-dark" to="/penulis">
            Semua Karya
          </Link>

          <Link
            className="btn btn-dark"
            to="/penulis/novel"
          >
            📖 Novel
          </Link>

          <Link
            className="btn btn-dark"
            to="/penulis/komik"
          >
            🎨 Komik
          </Link>

          <Link
            className="btn btn-primary"
            to={
              isComic
                ? '/penulis/novel/baru?type=comic'
                : '/penulis/novel/baru'
            }
          >
            {isComic ? '+ Komik Baru' : '+ Novel Baru'}
          </Link>
        </div>
      </div>

      <div className="stats">
        {[
          [
            isComic
              ? 'Komik'
              : typeFilter === 'novel'
                ? 'Novel'
                : 'Semua karya',
            rows.length
          ],
          ['Bab / Episode', sum('chapters')],
          ['Pembaca', sum('views')],
          ['Disimpan', sum('saves')]
        ].map(([label, value]) => (
          <div className="card" key={label}>
            <b>{value.toLocaleString('id-ID')}</b>
            <small>{label}</small>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <p className="state">
            {isComic
              ? 'Belum ada komik. Klik “+ Komik Baru” untuk membuat komik pertama.'
              : typeFilter === 'novel'
                ? 'Belum ada novel. Klik “+ Novel Baru” untuk mulai menulis.'
                : 'Belum ada karya. Mulai dengan membuat novel atau komik.'}
          </p>
        </div>
      ) : (
        rows.map(n => (
          <Link
            key={n.id}
            to={`/penulis/novel/${n.id}`}
            className="arow card"
          >
            <img
              src={asset(n.cover_url || '/covers/pena.svg')}
              alt={`Sampul ${n.title}`}
            />

            <div>
              <b>{n.title}</b>

              <div className="row">
                {n.type === 'comic' && (
                  <span className="badge ongoing">
                    Komik
                  </span>
                )}

                <span className="badge">
                  {PUB[n.publish_status] || 'Draf'}
                </span>

                <span className={'badge ' + n.status}>
                  {n.status === 'completed'
                    ? 'Tamat'
                    : 'Berlanjut'}
                </span>
              </div>

              <small>
                {n.chapters} bab/episode · 👁 {n.views} ·
                {' '}📚 {n.saves} disimpan
              </small>
            </div>
          </Link>
        ))
      )}
    </>
  );
}

export function NovelEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();

  const isNew = id === 'baru';

  const [genres, setGenres] = useState([]);
  const [novel, setNovel] = useState(null);

  const [f, setF] = useState({
    title: '',
    synopsis: '',
    tags: '',
    status: 'ongoing',
    type: searchParams.get('type') === 'comic'
      ? 'comic'
      : 'novel',
    genreIds: []
  });

  const [msg, setMsg] = useState('');
  const [ch, setCh] = useState(null);

  const load = async () => {
    if (isNew) return;

    const n = await api('/author/novels/' + id);

    setNovel(n);

    setF({
      title: n.title,
      synopsis: n.synopsis || '',
      tags: n.tags || '',
      status: n.status,
      type: n.type,
      genreIds: n.genreIds || []
    });
  };

  useEffect(() => {
    api('/novels/genres')
      .then(setGenres)
      .catch(e => setMsg('⚠ ' + e.message));

    load().catch(e => setMsg('⚠ ' + e.message));
  }, [id]);

  const run = async fn => {
    try {
      setMsg('');
      await fn();
    } catch (e) {
      setMsg('⚠ ' + e.message);
    }
  };

  const set = key => e => {
    setF(prev => ({
      ...prev,
      [key]: e.target.value
    }));
  };

  const toggleG = genreId => {
    setF(prev => ({
      ...prev,
      genreIds: prev.genreIds.includes(genreId)
        ? prev.genreIds.filter(x => x !== genreId)
        : [...prev.genreIds, genreId]
    }));
  };

  const save = () => run(async () => {
    if (!f.title.trim()) {
      throw new Error('Judul wajib diisi.');
    }

    if (isNew) {
      const r = await api('/author/novels', {
        method: 'POST',
        body: f
      });

      nav('/penulis/novel/' + r.id);
    } else {
      await api('/author/novels/' + id, {
        method: 'PUT',
        body: f
      });

      await load();
      setMsg('✓ Perubahan berhasil disimpan.');
    }
  });

  const cover = e => run(async () => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('cover', file);

    await api(`/author/novels/${id}/cover`, {
      method: 'POST',
      body: fd
    });

    await load();
    setMsg('✓ Sampul berhasil diperbarui.');
    e.target.value = '';
  });

  const submit = () => run(async () => {
    const r = await api(`/author/novels/${id}/submit`, {
      method: 'POST'
    });

    await load();
    setMsg('✓ ' + r.message);
  });

  const del = () => {
    const label = novel?.type === 'comic' ? 'komik' : 'novel';

    if (!confirm(`Hapus ${label} beserta seluruh babnya?`)) {
      return;
    }

    run(async () => {
      await api('/author/novels/' + id, {
        method: 'DELETE'
      });

      nav('/penulis');
    });
  };

  // ===== Simpan draf otomatis =====
  const [auto, setAuto] = useState(''); const [autoAt, setAutoAt] = useState(null);
  const chRef = useRef(null); chRef.current = ch;
  const savedSnap = useRef(''); const busy = useRef(false);
  const snapOf = c => JSON.stringify([c.title || '', c.content || '']);
  const bkKey = c => `la_draft_${id}_${c?.id || 'new'}`;
  const clearBackup = c => { try { localStorage.removeItem(bkKey(c)); localStorage.removeItem(`la_draft_${id}_new`); } catch {} };
  const refreshChapters = async () => { try { setNovel(await api('/author/novels/' + id)); } catch {} };

  const autosave = async () => {
    if (busy.current) return;
    const cur = chRef.current;
    if (!cur || modeOf(cur) === 'published' || !cur.title?.trim() || snapOf(cur) === savedSnap.current) return;
    busy.current = true; setAuto('saving');
    try {
      const snap = snapOf(cur);
      if (cur.id) {
        await api(`/author/novels/${id}/chapters/${cur.id}/autosave`, { method: 'PUT', body: { title: cur.title, content: cur.content || '' } });
      } else {
        const r = await api(`/author/novels/${id}/chapters`, { method: 'POST', body: { title: cur.title, content: cur.content || '', status: 'draft' } });
        setCh(p => (p && !p.id ? { ...p, id: r.id, number: r.number } : p));
        refreshChapters();
      }
      savedSnap.current = snap; clearBackup(cur);
      setAuto('saved'); setAutoAt(new Date());
    } catch { setAuto('error'); }
    busy.current = false;
    // jika pengguna masih mengetik selama proses simpan, simpan lagi
    const c2 = chRef.current;
    if (c2 && modeOf(c2) !== 'published' && c2.title?.trim() && snapOf(c2) !== savedSnap.current) setTimeout(autosave, 800);
  };

  const curMode = ch ? modeOf(ch) : null;
  useEffect(() => {
    if (!ch || novel?.type === 'comic' || snapOf(ch) === savedSnap.current) return;
    const t1 = setTimeout(() => { // cadangan di perangkat ini
      try { localStorage.setItem(bkKey(ch), JSON.stringify({ title: ch.title, content: ch.content || '', t: Date.now() })); } catch {}
    }, 600);
    if (curMode === 'published') { setAuto('local'); return () => clearTimeout(t1); }
    if (!ch.title?.trim()) { setAuto('notitle'); return () => clearTimeout(t1); }
    setAuto('pending');
    const t2 = setTimeout(autosave, 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [ch?.title, ch?.content, curMode, novel?.type]);

  const openCh = c => run(async () => {
    let data = c ? await api(`/author/novels/${id}/chapters/${c.id}`) : { title: '', content: '', status: 'draft' };
    savedSnap.current = snapOf(data);
    try { // pulihkan tulisan yang belum sempat tersimpan (mis. koneksi putus / tab tertutup)
      const bk = JSON.parse(localStorage.getItem(bkKey(data)) || 'null');
      if (bk && JSON.stringify([bk.title, bk.content]) !== savedSnap.current &&
          confirm(`Ada tulisan yang belum tersimpan dari ${fmtWhen(bk.t)}. Pulihkan?`)) data = { ...data, title: bk.title, content: bk.content };
      else if (bk) localStorage.removeItem(bkKey(data));
    } catch {}
    setAuto(''); setCh(data);
  });

  const saveCh = () => run(async () => {
    while (busy.current) await new Promise(r => setTimeout(r, 150)); // tunggu simpan otomatis selesai
    const cur = chRef.current;

    if (!cur?.title?.trim()) {
      throw new Error('Judul bab atau episode wajib diisi.');
    }

    const mode = modeOf(cur);
    let status = mode === 'published' ? 'published' : 'draft';
    let publishAt = null;

    if (mode === 'scheduled') {
      const d = new Date(whenOf(cur));
      if (!whenOf(cur) || isNaN(d)) throw new Error('Pilih tanggal dan jam terbit.');
      if (d <= new Date()) throw new Error('Waktu terbit harus di masa depan.');
      publishAt = d.toISOString();
    }

    const body = {
      title: cur.title,
      content: cur.content || '',
      status,
      publishAt
    };

    const r = await api(
      `/author/novels/${id}/chapters${cur.id ? '/' + cur.id : ''}`,
      {
        method: cur.id ? 'PUT' : 'POST',
        body
      }
    );

    savedSnap.current = snapOf(cur);
    clearBackup(cur);
    setAuto('');

    await load();

    if (novel.type === 'comic') {
      const chapterId = cur.id || r.id;

      setCh(
        await api(
          `/author/novels/${id}/chapters/${chapterId}`
        )
      );

      setMsg(
        mode === 'scheduled'
          ? `✓ Episode dijadwalkan terbit ${fmtWhen(publishAt)}. Kamu dapat mengunggah halaman komik.`
          : '✓ Episode tersimpan. Kamu dapat mengunggah halaman komik.'
      );
    } else {
      setCh(null);
      setMsg(
        mode === 'scheduled'
          ? `✓ Bab dijadwalkan terbit ${fmtWhen(publishAt)}.`
          : mode === 'published'
            ? '✓ Bab berhasil diterbitkan.'
            : '✓ Draf bab tersimpan.'
      );
    }
  });

  const uploadPages = e => run(async () => {
    const files = [...(e.target.files || [])]
      .sort((a, b) =>
        a.name.localeCompare(
          b.name,
          undefined,
          { numeric: true }
        )
      );

    if (!files.length) return;

    if (files.length > 20) {
      throw new Error('Maksimal 20 gambar sekali unggah.');
    }

    const fd = new FormData();

    files.forEach(file => fd.append('pages', file));

    await api(
      `/author/novels/${id}/chapters/${ch.id}/pages`,
      {
        method: 'POST',
        body: fd
      }
    );

    e.target.value = '';

    setCh(
      await api(
        `/author/novels/${id}/chapters/${ch.id}`
      )
    );

    setMsg('✓ Halaman komik berhasil diunggah.');
  });

  const delPage = p => {
    if (!confirm('Hapus halaman komik ini?')) return;

    run(async () => {
      await api(
        `/author/novels/${id}/chapters/${ch.id}/pages/${p.id}`,
        { method: 'DELETE' }
      );

      setCh(
        await api(
          `/author/novels/${id}/chapters/${ch.id}`
        )
      );
    });
  };

  const delCh = c => {
    const label = novel?.type === 'comic' ? 'episode' : 'bab';

    if (!confirm(`Hapus ${label} ini?`)) return;

    run(async () => {
      await api(
        `/author/novels/${id}/chapters/${c.id}`,
        { method: 'DELETE' }
      );

      setCh(null);
      await load();
    });
  };

  const isComic = f.type === 'comic';

  return (
    <div className="editor">
      <Link to="/penulis">← Dashboard Penulis</Link>

      <h2>
        {isNew
          ? isComic ? 'Komik Baru' : 'Novel Baru'
          : novel?.type === 'comic'
            ? 'Kelola Komik'
            : 'Kelola Novel'}
      </h2>

      {msg && (
        <p className={'state ' + (
          msg.startsWith('⚠') ? 'err' : ''
        )}>
          {msg}
        </p>
      )}

      <div className="card form">
        <input
          placeholder={isComic ? 'Judul komik' : 'Judul novel'}
          value={f.title}
          onChange={set('title')}
        />

        <textarea
          rows={5}
          placeholder={isComic ? 'Sinopsis komik' : 'Sinopsis novel'}
          value={f.synopsis}
          onChange={set('synopsis')}
        />

        <input
          placeholder="Tag (pisahkan dengan koma)"
          value={f.tags}
          onChange={set('tags')}
        />

        <select value={f.status} onChange={set('status')}>
          <option value="ongoing">Berlanjut</option>
          <option value="completed">Tamat</option>
        </select>

        {isNew ? (
          <select
            value={f.type}
            onChange={set('type')}
          >
            <option value="novel">📖 Novel (teks)</option>
            <option value="comic">🎨 Komik (gambar)</option>
          </select>
        ) : (
          <small>
            Jenis karya: {isComic ? 'Komik' : 'Novel'}
          </small>
        )}

        <div className="chips">
          {genres.map(g => (
            <button
              type="button"
              key={g.id}
              className={f.genreIds.includes(g.id) ? 'on' : ''}
              onClick={() => toggleG(g.id)}
            >
              {g.name}
            </button>
          ))}
        </div>

        <button className="btn btn-primary" onClick={save}>
          {isNew
            ? isComic ? 'Buat Komik' : 'Buat Novel'
            : 'Simpan Perubahan'}
        </button>
      </div>

      {!isNew && novel && (
        <>
          <div className="card form">
            <h3>Sampul {novel.type === 'comic' ? 'Komik' : 'Novel'}</h3>

            {novel.cover_url && (
              <img
                className="cover"
                style={{ maxWidth: 160 }}
                src={asset(novel.cover_url)}
                alt={`Sampul ${novel.title}`}
              />
            )}

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={cover}
            />

            <small>Format JPG, PNG, atau WEBP. Maksimal 2 MB.</small>
          </div>

          <div className="card form">
            <div
              className="row"
              style={{ justifyContent: 'space-between' }}
            >
              <h3>
                {novel.type === 'comic' ? 'Episode' : 'Bab'}
                {' '}({novel.chapters.length})
              </h3>

              <button
                className="btn btn-dark"
                onClick={() => openCh(null)}
              >
                {novel.type === 'comic'
                  ? '+ Episode Baru'
                  : '+ Bab Baru'}
              </button>
            </div>

            <ul className="chlist">
              {novel.chapters.map(c => (
                <li
                  key={c.id}
                  className="row"
                  style={{ justifyContent: 'space-between' }}
                >
                  <span>
                    {novel.type === 'comic' ? 'Episode' : 'Bab'}
                    {' '}{c.number} — {c.title}
                    {' '}
                    <span className="badge">
                      {c.status === 'published'
                        ? 'Terbit'
                        : c.publish_at
                          ? `Terjadwal · ${fmtWhen(c.publish_at)}`
                          : 'Draf'}
                    </span>
                  </span>

                  <span>
                    <button
                      className="icon"
                      onClick={() => openCh(c)}
                    >
                      Edit
                    </button>

                    <button
                      className="icon"
                      onClick={() => delCh(c)}
                    >
                      Hapus
                    </button>
                  </span>
                </li>
              ))}
            </ul>

            {ch && (
              <div className="form">
                <input
                  placeholder={
                    novel.type === 'comic'
                      ? 'Judul episode'
                      : 'Judul bab'
                  }
                  value={ch.title}
                  onChange={e =>
                    setCh({ ...ch, title: e.target.value })
                  }
                />

                {novel.type === 'comic' ? (
                  ch.id ? (
                    <div className="form">
                      <h4>Halaman Komik</h4>

                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        onChange={uploadPages}
                      />

                      <small>
                        JPG, PNG, atau WEBP. Maksimal 3 MB
                        per gambar dan 20 gambar sekali unggah.
                        Urutan gambar mengikuti nama file
                        (001, 002, 003, dan seterusnya).
                      </small>

                      <div className="pgrid">
                        {(ch.pages || []).map((p, i) => (
                          <div className="pthumb" key={p.id}>
                            <img
                              src={asset(p.image_url)}
                              alt={`Halaman ${i + 1}`}
                            />

                            <span>{i + 1}</span>

                            <button
                              className="icon"
                              onClick={() => delPage(p)}
                              aria-label="Hapus halaman"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="state">
                      Simpan episode terlebih dahulu,
                      kemudian unggah halaman komik.
                    </p>
                  )
                ) : (
                  <textarea
                    rows={14}
                    placeholder="Tulis isi bab di sini…"
                    value={ch.content}
                    onChange={e =>
                      setCh({ ...ch, content: e.target.value })
                    }
                  />
                )}

                <select
                  value={modeOf(ch)}
                  onChange={e =>
                    setCh({ ...ch, mode: e.target.value })
                  }
                >
                  <option value="draft">Simpan sebagai draf</option>
                  <option value="scheduled">Jadwalkan terbit</option>
                  <option value="published">Terbitkan sekarang</option>
                </select>

                {modeOf(ch) === 'scheduled' && (
                  <label>
                    Terbit pada{' '}
                    <input
                      type="datetime-local"
                      value={whenOf(ch)}
                      min={toLocalInput(new Date().toISOString())}
                      onChange={e =>
                        setCh({ ...ch, when: e.target.value })
                      }
                    />
                    <small>
                      Bab otomatis tampil untuk pembaca pada waktu ini
                      (selisih maksimal sekitar 1 menit).
                    </small>
                  </label>
                )}

                {novel.type !== 'comic' && auto && (
                  <small className={'autosave ' + auto}>
                    {{
                      pending: 'Perubahan belum tersimpan…',
                      saving: 'Menyimpan draf…',
                      saved: `✓ Draf tersimpan otomatis${autoAt ? ' pukul ' + autoAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}`,
                      error: '⚠ Gagal menyimpan otomatis. Tulisanmu aman di perangkat ini; tekan Simpan saat koneksi pulih.',
                      notitle: 'Isi judul bab agar draf tersimpan otomatis.',
                      local: 'Bab ini sudah terbit. Perubahan baru hanya tersimpan di perangkat ini sampai kamu menekan Simpan.'
                    }[auto]}
                  </small>
                )}

                <div className="row">
                  <button
                    className="btn btn-primary"
                    onClick={saveCh}
                  >
                    Simpan {novel.type === 'comic' ? 'Episode' : 'Bab'}
                  </button>

                  <button
                    className="btn btn-dark"
                    onClick={() => setCh(null)}
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="card form">
            <h3>Penerbitan</h3>

            <p>
              Status:{' '}
              <span className="badge">
                {PUB[novel.publish_status] || 'Draf'}
              </span>
            </p>

            <div className="row">
              <button
                className="btn btn-primary"
                onClick={submit}
              >
                Ajukan Terbit
              </button>

              <button className="btn btn-dark" onClick={del}>
                {novel.type === 'comic' ? 'Hapus Komik' : 'Hapus Novel'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}