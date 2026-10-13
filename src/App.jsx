import { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Search from './pages/Search';
import MovieDetail from './pages/MovieDetail';
import PersonDetail from './pages/PersonDetail';
import Favorites from './pages/Favorites';
import Profile from './pages/Profile';
import Login from './pages/Login';
import { useFavorites } from './hooks/useFavorites';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const location = useLocation();
  const { favorites, isFavorite, toggleFavorite, loading } = useFavorites();

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
          <h1 className="text-4xl md:text-6xl font-bold text-red-600 tracking-[0.3em] uppercase drop-shadow-[0_0_35px_rgba(220,38,38,0.65)] animate-pulse">
            Cineva
          </h1>
          <p className="mt-3 text-xs md:text-sm text-zinc-400 font-medium tracking-[0.35em] uppercase opacity-75">
            Discover Your Next Favorite Film
          </p>
        </div>
      </div>
    );
  }

  // Sembunyikan Navbar dan Footer saat pengguna berada di halaman login
  const isAuthPage = location.pathname.startsWith('/login');

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#18181b',
            color: '#f4f4f5',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
            fontSize: '14px',
            borderRadius: '10px',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#18181b',
            },
          },
          error: {
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
            path="/favorites"
            element={
              <Favorites
                favorites={favorites}
                toggleFavorite={toggleFavorite}
                isFavorite={isFavorite}
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
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
      {!isAuthPage && <Footer />}
    </>
  );
}