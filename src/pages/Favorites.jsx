import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import MovieGrid from '../components/MovieGrid';
import MovieCardSkeleton from '../components/MovieCardSkeleton';
import { useAuth } from '../hooks/useAuth';
import { useFavorites } from '../hooks/useFavorites';
import './Favorites.css';

export default function Favorites({
  favorites: propFavorites,
  toggleFavorite: propToggleFavorite,
  isFavorite: propIsFavorite,
  loading: propLoading,
}) {
  const { user } = useAuth();
  const fallbackFavoritesHook = useFavorites();
  const navigate = useNavigate();

  const favorites = propFavorites ?? fallbackFavoritesHook.favorites;
  const toggleFavorite = propToggleFavorite ?? fallbackFavoritesHook.toggleFavorite;
  const isFavorite = propIsFavorite ?? fallbackFavoritesHook.isFavorite;
  const isLoading = propLoading ?? fallbackFavoritesHook.loading;

  // Dynamic Document Title: ubah judul tab browser untuk halaman Favorites
  useEffect(() => {
    document.title = 'My Favorites - Cineva';
  }, []);

  if (!user) {
    return (
      <div className="favorites-page page-container">
        <div className="favorites-page__header">
          <h1 className="favorites-page__heading">Favorites</h1>
        </div>
        <div className="favorites-page__empty">
          <div className="favorites-page__empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <p className="favorites-page__empty-title">Silakan login untuk menyimpan film</p>
          <p className="favorites-page__empty-sub">
            Masuk ke akun Anda untuk melihat dan menyinkronkan film favorit.
          </p>
          <button
            type="button"
            className="favorites-page__login-btn"
            onClick={() => navigate('/login')}
            style={{
              marginTop: '18px',
              padding: '11px 24px',
              borderRadius: '8px',
              backgroundColor: '#e50914',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.88rem',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 14px rgba(229, 9, 20, 0.4)',
              transition: 'background-color 0.2s ease, transform 0.2s ease',
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Masuk ke Akun Anda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="favorites-page page-container">
      <div className="favorites-page__header">
        <h1 className="favorites-page__heading">Favorites</h1>
        {favorites.length > 0 && (
          <span className="favorites-page__count-badge">
            {favorites.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <section className="movie-grid">
          <div className="movie-grid__list grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <MovieCardSkeleton key={index} />
            ))}
          </div>
        </section>
      ) : favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 text-center">
          <div className="w-16 h-16 mb-4 rounded-full bg-zinc-800/60 flex items-center justify-center text-red-500/80">
            {/* Ikon hati retak */}
            <svg
              className="w-8 h-8 text-red-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              <path d="m12 13-1-2 2-2-2-2 1-2" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Daftar favorit Anda masih kosong.
          </h2>
          <p className="text-gray-400 text-sm md:text-base mb-6">
            Yuk, jelajahi dan simpan film favorit Anda di sini!
          </p>
          <Link
            to="/"
            className="px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-all duration-200 shadow-lg shadow-red-600/30 hover:scale-105 inline-flex items-center gap-2 cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span>Jelajahi Film</span>
          </Link>
        </div>
      ) : (
        <MovieGrid
          movies={favorites}
          onToggleFavorite={toggleFavorite}
          isFavorite={isFavorite}
        />
      )}
    </div>
  );
}
