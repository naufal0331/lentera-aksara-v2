import { useEffect, useState } from 'react';
import {
  Routes,
  Route,
  Link,
  NavLink,
  useNavigate
} from 'react-router-dom';

import { asset } from './asset.js';
import { AppCtx } from './ctx.js';
import { AdminGuard, AdminDash } from './admin.jsx';
import {
  Guard,
  AuthorDash,
  NovelEditor
} from './author.jsx';

import {
  Home,
  Novel,
  Reader,
  Auth,
  Library,
  Account
} from './pages.jsx';
import { Bell, Notifications, Bookmarks, Profile } from './social.jsx';

// Pertahankan latar musiman dan CSS yang sudah digunakan proyek.
import FireBackground from './FireBackground.jsx';
import IceBackground from './IceBackground.jsx';
import './styles/seasons.css';

export default function App() {
  const nav = useNavigate();

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('la_user') || 'null');
    } catch {
      return null;
    }
  });

  const [theme, setTheme] = useState(
    () => localStorage.getItem('la_theme') || 'light'
  );

  const [q, setQ] = useState('');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('la_theme', theme);
  }, [theme]);

  const login = (data) => {
    if (data?.token) {
      localStorage.setItem('la_token', data.token);
    }
    if (data?.user) {
      localStorage.setItem('la_user', JSON.stringify(data.user));
      setUser(data.user);
    }
  };

  const logout = () => {
    localStorage.removeItem('la_token');
    localStorage.removeItem('la_user');
    setUser(null);
    nav('/');
  };

  const search = (e) => {
    e.preventDefault();
    nav('/?q=' + encodeURIComponent(q.trim()));
  };

  const canWrite = user &&
    ['author', 'admin'].includes(user.role);

  return (
    <AppCtx.Provider value={{ user, login, logout, theme, setTheme }}>
      {theme === 'dark' ? <IceBackground /> : <FireBackground />}

      <header className="nav">
        <Link to="/" className="brand">
          <img src={asset('/LogoLA.jpeg')} alt="Lentera Aksara" />
          <span>Lentera Aksara</span>
        </Link>

        <form onSubmit={search} className="search">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari judul atau penulis…"
            aria-label="Cari judul atau penulis"
          />
        </form>

        <nav className="links">
          <button
            type="button"
            className="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Ganti tema"
            title={theme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {user ? (
            <>
              {user.role === 'admin' && <Link to="/admin">Admin</Link>}

              {canWrite && (
                <>
                  <Link to="/penulis">Dashboard Penulis</Link>
                  <Link to="/penulis/novel">Dashboard Novel</Link>
                  <Link to="/penulis/komik">Dashboard Komik</Link>
                </>
              )}

              <Link to="/perpustakaan">Perpustakaan</Link>
              <Bell />

              <button
                type="button"
                className="btn btn-dark"
                onClick={logout}
              >
                Keluar
              </button>
            </>
          ) : (
            <>
              <Link to="/masuk">Masuk</Link>
              <Link to="/daftar" className="btn btn-primary">Daftar</Link>
            </>
          )}
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

          {/* Halaman akun (menu profil di HP) */}
          <Route path="/akun" element={<Account />} />
          <Route path="/notifikasi" element={<Notifications />} />
          <Route path="/bookmark" element={<Bookmarks />} />
          <Route path="/profil" element={<Profile />} />

          {/* Dashboard semua karya penulis */}
          <Route
            path="/penulis"
            element={
              <Guard>
                <AuthorDash />
              </Guard>
            }
          />

          {/* Dashboard khusus novel */}
          <Route
            path="/penulis/novel"
            element={
              <Guard>
                <AuthorDash typeFilter="novel" />
              </Guard>
            }
          />

          {/* Dashboard khusus komik */}
          <Route
            path="/penulis/komik"
            element={
              <Guard>
                <AuthorDash typeFilter="comic" />
              </Guard>
            }
          />

          {/* Editor novel dan komik */}
          <Route
            path="/penulis/novel/:id"
            element={
              <Guard>
                <NovelEditor />
              </Guard>
            }
          />

          <Route
            path="/admin"
            element={
              <AdminGuard>
                <AdminDash />
              </AdminGuard>
            }
          />

          <Route
            path="*"
            element={<p className="state">Halaman tidak ditemukan.</p>}
          />
        </Routes>
      </main>

      <footer className="foot">
        © Lentera Aksara — Terangi Imajinasi, Hidupkan Cerita.
      </footer>

      <nav className="tabbar">
        <NavLink to="/" end>
          🏠
          <small>Beranda</small>
        </NavLink>

        <NavLink to="/perpustakaan">
          📚
          <small>Pustaka</small>
        </NavLink>

        <NavLink to={user ? '/akun' : '/masuk'}>
          👤
          <small>{user ? user.username : 'Masuk'}</small>
        </NavLink>
      </nav>
    </AppCtx.Provider>
  );
}
