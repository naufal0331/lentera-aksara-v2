import { useEffect, useState } from 'react';
import { Routes, Route, Link, NavLink, useNavigate } from 'react-router-dom';
import { asset } from './asset.js';
import { AppCtx } from './ctx.js';
import { AdminGuard, AdminDash } from './admin.jsx';
import { Guard, AuthorDash, NovelEditor } from './author.jsx';
import { Home, Novel, Reader, Auth, Library } from './pages.jsx';
import FireBackground from './FireBackground.jsx';
import './styles/fire.css';

export default function App() {
  const nav = useNavigate();
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('la_user') || 'null'));
  const [theme, setTheme] = useState(localStorage.getItem('la_theme') || 'light');
  const [q, setQ] = useState('');
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('la_theme', theme); }, [theme]);
  const login = d => { localStorage.setItem('la_token', d.token); localStorage.setItem('la_user', JSON.stringify(d.user)); setUser(d.user); };
  const logout = () => { localStorage.removeItem('la_token'); localStorage.removeItem('la_user'); setUser(null); nav('/'); };
  const search = e => { e.preventDefault(); nav('/?q=' + encodeURIComponent(q)); };
  return (
    <AppCtx.Provider value={{ user, login, logout, theme, setTheme }}>
      {theme === 'dark' && <FireBackground />}
      <header className="nav">
        <Link to="/" className="brand"><img src={asset('/logo.svg')} alt="Lentera Aksara" /><span>Lentera Aksara</span></Link>
        <form onSubmit={search} className="search"><input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari judul atau penulis…" /></form>
        <nav className="links">
          <button className="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Ganti tema">{theme === 'dark' ? '☀️' : '🌙'}</button>
          {user ? <>{user.role === 'admin' && <Link to="/admin">Admin</Link>}{['author','admin'].includes(user.role) && <Link to="/penulis">Dashboard Penulis</Link>}<Link to="/perpustakaan">Perpustakaan</Link><button className="btn btn-dark" onClick={logout}>Keluar</button></>
                : <><Link to="/masuk">Masuk</Link><Link to="/daftar" className="btn btn-primary">Daftar</Link></>}
        </nav>
      </header>
      <main className="page-enter">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/novel/:id" element={<Novel />} />
          <Route path="/read/:id/:num" element={<Reader />} />
          <Route path="/masuk" element={<Auth mode="masuk" />} />
          <Route path="/daftar" element={<Auth mode="daftar" />} />
          <Route path="/perpustakaan" element={<Library />} />
          <Route path="/penulis" element={<Guard><AuthorDash /></Guard>} />
          <Route path="/penulis/novel/:id" element={<Guard><NovelEditor /></Guard>} />
          <Route path="/admin" element={<AdminGuard><AdminDash /></AdminGuard>} />
          <Route path="*" element={<p className="state">Halaman tidak ditemukan.</p>} />
        </Routes>
      </main>
      <footer className="foot">© Lentera Aksara — Terangi Imajinasi, Hidupkan Cerita.</footer>
      <nav className="tabbar">
        <NavLink to="/" end>🏠<small>Beranda</small></NavLink>
        <NavLink to="/perpustakaan">📚<small>Pustaka</small></NavLink>
        <NavLink to={user ? '/perpustakaan' : '/masuk'}>👤<small>{user ? user.username : 'Masuk'}</small></NavLink>
      </nav>
    </AppCtx.Provider>
  );
}
