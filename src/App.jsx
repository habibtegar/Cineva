import { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import toast, { Toaster, useToasterStore } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import BackToTop from './components/BackToTop';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Search from './pages/Search';
import MovieDetail from './pages/MovieDetail';
import PersonDetail from './pages/PersonDetail';
import TVShows from './pages/TVShows';
import TVDetail from './pages/TVDetail';
import Favorites from './pages/Favorites';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import Login from './pages/Login';
import Register from './pages/Register';
import Feedback from './pages/Feedback';
import { useFavorites } from './hooks/useFavorites';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const location = useLocation();
  const { favorites, isFavorite, toggleFavorite, loading } = useFavorites();

  // Batasi agar hanya 1 notifikasi toast yang tampil di layar dalam satu waktu
  const { toasts } = useToasterStore();
  useEffect(() => {
    toasts
      .filter((t) => t.visible)
      .filter((_, i) => i >= 1)
      .forEach((t) => toast.dismiss(t.id));
  }, [toasts]);

  // Timer Initial Splash Screen (2 detik)
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Tampilan Splash Screen saat pertama kali dimuat
  if (showSplash) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 select-none overflow-hidden">
        {/* Glow ambient sinematik */}
        <div className="absolute w-[420px] h-[420px] bg-red-600/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative flex flex-col items-center text-center px-4">
          <h1 className="text-4xl md:text-6xl font-bold text-red-600 tracking-[0.3em] uppercase drop-shadow-[0_0_35px_rgba(220,38,38,0.65)]">
            Cineva
          </h1>
          <p className="mt-3 text-xs md:text-sm text-zinc-400 font-medium tracking-[0.35em] uppercase opacity-75">
            Discover Your Next Favorite Film
          </p>
        </div>
      </div>
    );
  }

  // Sembunyikan Navbar dan Footer saat pengguna berada di halaman login atau register
  const isAuthPage =
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/register');

  return (
    <>
      <Toaster
        position="top-center"
        gutter={8}
        containerClassName="cineva-toaster-container"
        containerStyle={{
          top: 24,
          left: 16,
          right: 16,
          zIndex: 99999,
        }}
        toastOptions={{
          duration: 3000,
          className:
            'cineva-toast bg-zinc-900/85 backdrop-blur-md border border-red-500/40 text-white rounded-xl shadow-2xl px-4 py-3',
          style: {
            background: 'rgba(24, 24, 27, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(239, 68, 68, 0.45)',
            color: '#ffffff',
            boxShadow:
              '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 25px rgba(220, 38, 38, 0.22)',
            borderRadius: '0.75rem',
            padding: '12px 18px',
            fontSize: '14px',
            fontWeight: 500,
            maxWidth: '440px',
          },
          success: {
            duration: 3000,
            style: {
              background: 'rgba(24, 24, 27, 0.85)',
              border: '1px solid rgba(239, 68, 68, 0.45)',
              boxShadow:
                '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 25px rgba(220, 38, 38, 0.22)',
            },
            iconTheme: {
              primary: '#ef4444',
              secondary: '#18181b',
            },
          },
          error: {
            duration: 3000,
            style: {
              background: 'rgba(24, 24, 27, 0.85)',
              border: '1px solid rgba(239, 68, 68, 0.45)',
              boxShadow:
                '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 25px rgba(220, 38, 38, 0.25)',
            },
            iconTheme: {
              primary: '#ef4444',
              secondary: '#18181b',
            },
          },
        }}
      />
      <ScrollToTop />
      {!isAuthPage && <Navbar />}
      <main>
        <Routes>
          <Route
            path="/"
            element={
              <Home toggleFavorite={toggleFavorite} isFavorite={isFavorite} />
            }
          />
          <Route
            path="/explore"
            element={
              <Explore toggleFavorite={toggleFavorite} isFavorite={isFavorite} />
            }
          />
          <Route
            path="/search"
            element={
              <Search toggleFavorite={toggleFavorite} isFavorite={isFavorite} />
            }
          />
          <Route
            path="/movie/:id"
            element={
              <MovieDetail
                toggleFavorite={toggleFavorite}
                isFavorite={isFavorite}
              />
            }
          />
          <Route
            path="/person/:id"
            element={
              <PersonDetail
                toggleFavorite={toggleFavorite}
                isFavorite={isFavorite}
              />
            }
          />
          <Route
            path="/actor/:id"
            element={
              <PersonDetail
                toggleFavorite={toggleFavorite}
                isFavorite={isFavorite}
              />
            }
          />
          <Route
            path="/tv"
            element={
              <TVShows
                toggleFavorite={toggleFavorite}
                isFavorite={isFavorite}
              />
            }
          />
          <Route
            path="/tv/:id"
            element={
              <TVDetail
                toggleFavorite={toggleFavorite}
                isFavorite={isFavorite}
              />
            }
          />
          <Route
            path="/favorites"
            element={
              <Favorites
                favorites={favorites}
                toggleFavorite={toggleFavorite}
                isFavorite={isFavorite}
                loading={loading}
              />
            }
          />
          <Route
            path="/profile"
            element={
              <Profile
                favorites={favorites}
                toggleFavorite={toggleFavorite}
                isFavorite={isFavorite}
                loading={loading}
              />
            }
          />
          <Route
            path="/user/:userId"
            element={
              <PublicProfile
                toggleFavorite={toggleFavorite}
                isFavorite={isFavorite}
              />
            }
          />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </main>
      {!isAuthPage && <Footer />}
      <BackToTop />
    </>
  );
}