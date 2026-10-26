import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import MovieCard from '../components/MovieCard';
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

  // State tab filter: 'all' | 'movie' | 'tv'
  const [filterType, setFilterType] = useState('all');

  // Dynamic Document Title
  useEffect(() => {
    document.title = 'My Favorites - Cineva';
  }, []);

  // Hitung jumlah item per kategori
  const movieCount = favorites.filter(
    (item) => (item.media_type || (item.name ? 'tv' : 'movie')) === 'movie'
  ).length;

  const tvCount = favorites.filter(
    (item) => (item.media_type || (item.name ? 'tv' : 'movie')) === 'tv'
  ).length;

  // Filter daftar data yang dirender sesuai filterType
  const filteredFavorites = favorites.filter((item) => {
    const itemType = item.media_type || (item.name ? 'tv' : 'movie');
    if (filterType === 'movie') return itemType === 'movie';
    if (filterType === 'tv') return itemType === 'tv';
    return true;
  });

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
          <p className="favorites-page__empty-title">Silakan login untuk menyimpan favorit</p>
          <p className="favorites-page__empty-sub">
            Masuk ke akun Anda untuk melihat dan menyinkronkan film dan serial TV favorit.
          </p>
          <button
            type="button"
            className="favorites-page__login-btn"
            onClick={() => navigate('/login')}
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
      {/* Header Halaman */}
      <div className="favorites-page__header">
        <div className="flex items-center gap-3">
          <h1 className="favorites-page__heading text-2xl md:text-3xl font-bold text-white tracking-tight">
            My Favorites
          </h1>
          {favorites.length > 0 && (
            <span className="favorites-page__count-badge">
              {favorites.length}
            </span>
          )}
        </div>
      </div>

      {/* Navigasi Tab Filter: All, Movies, TV Shows */}
      {favorites.length > 0 && (
        <div className="favorites-page__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={filterType === 'all'}
            onClick={() => setFilterType('all')}
            className={`favorites-page__tab${filterType === 'all' ? ' favorites-page__tab--active' : ''}`}
          >
            All <span className="favorites-page__tab-count">({favorites.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterType === 'movie'}
            onClick={() => setFilterType('movie')}
            className={`favorites-page__tab${filterType === 'movie' ? ' favorites-page__tab--active' : ''}`}
          >
            Movies <span className="favorites-page__tab-count">({movieCount})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterType === 'tv'}
            onClick={() => setFilterType('tv')}
            className={`favorites-page__tab${filterType === 'tv' ? ' favorites-page__tab--active' : ''}`}
          >
            TV Shows <span className="favorites-page__tab-count">({tvCount})</span>
          </button>
        </div>
      )}

      {/* Konten Grid */}
      {isLoading ? (
        <section className="movie-grid">
          <div className="movie-grid__list grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <MovieCardSkeleton key={index} />
            ))}
          </div>
        </section>
      ) : favorites.length === 0 ? (
        /* Empty State Total */
        <div className="flex flex-col items-center justify-center mt-20 text-center">
          <div className="w-16 h-16 mb-4 rounded-full bg-zinc-800/60 flex items-center justify-center text-red-500/80">
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
            Yuk, jelajahi dan simpan film serta serial TV favorit Anda di sini!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/explore"
              className="px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-all duration-200 shadow-lg shadow-red-600/30 hover:scale-105 inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Jelajahi Film</span>
            </Link>
            <Link
              to="/tv"
              className="px-6 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-sm transition-all duration-200 border border-zinc-700 hover:scale-105 inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Jelajahi TV Shows</span>
            </Link>
          </div>
        </div>
      ) : filteredFavorites.length === 0 ? (
        /* Empty State Kategori Tab Tertentu */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-zinc-400 text-base mb-4">
            Tidak ada {filterType === 'tv' ? 'serial TV' : 'film'} di daftar favorit Anda.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition cursor-pointer"
            >
              Tampilkan Semua ({favorites.length})
            </button>
            <Link
              to={filterType === 'tv' ? '/tv' : '/explore'}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition cursor-pointer"
            >
              Jelajahi {filterType === 'tv' ? 'TV Shows' : 'Film'}
            </Link>
          </div>
        </div>
      ) : (
        /* Render Grid Kartu Favorit */
        <section className="movie-grid">
          <div className="movie-grid__list grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
            {filteredFavorites.map((item) => {
              const mediaType = item.media_type || (item.name ? 'tv' : 'movie');
              return (
                <MovieCard
                  key={`${mediaType}-${item.id}`}
                  movie={item}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={isFavorite}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
