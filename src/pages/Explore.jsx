import { useState, useEffect } from 'react';
import MovieGrid from '../components/MovieGrid';
import MovieCardSkeleton from '../components/MovieCardSkeleton';
import ErrorState from '../components/ErrorState';
import {
  getTrending,
  getPopular,
  getTopRated,
  getUpcoming,
  getGenres,
} from '../services/tmdb';
import './Explore.css';

const TABS = [
  { key: 'trending', label: 'Trending' },
  { key: 'popular', label: 'Popular' },
  { key: 'topRated', label: 'Top Rated' },
  { key: 'upcoming', label: 'Upcoming' },
];

const PAGE_SIZE = 12;

export default function Explore({ toggleFavorite, isFavorite }) {
  // Daftar film (movies) & State Halaman (page)
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Active category tab
  const [activeTab, setActiveTab] = useState('trending');

  // Genre filter (applied to the active tab)
  const [genres, setGenres] = useState([]);
  const [activeGenre, setActiveGenre] = useState('');

  // Global load & pagination state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Dynamic Document Title
  useEffect(() => {
    document.title = 'Explore All Movies — Cineva';
    window.scrollTo(0, 0);
  }, []);

  // Fetch official TMDB genre list on mount
  useEffect(() => {
    getGenres()
      .then((data) => setGenres(data.genres || []))
      .catch((err) => console.error('Failed to fetch genres in Explore:', err));
  }, []);

  // Fetch movies whenever activeTab, page, or retryCount changes
  useEffect(() => {
    let isCancelled = false;

    const fetchCategoryMovies = async () => {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      try {
        const fetchFn = {
          trending: (p) => getTrending('week', p),
          popular: (p) => getPopular(p),
          topRated: (p) => getTopRated(p),
          upcoming: (p) => getUpcoming(p),
        }[activeTab] || getPopular;

        const data = await fetchFn(page);
        if (isCancelled) return;

        setMovies((prevMovies) =>
          page === 1 ? data.results || [] : [...prevMovies, ...(data.results || [])]
        );
        setTotalPages(data.total_pages || 1);
      } catch (err) {
        if (isCancelled) return;
        console.error('Failed to fetch movies:', err);
        setError('Failed to load movies. Please check your internet connection.');
      } finally {
        if (!isCancelled) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    };

    fetchCategoryMovies();

    return () => {
      isCancelled = true;
    };
  }, [activeTab, page, retryCount]);

  // Ganti tab kategori dan reset halaman ke 1
  const handleTabChange = (tabKey) => {
    if (tabKey === activeTab) return;
    setActiveTab(tabKey);
    setPage(1);
  };

  // Fungsi Tambah Halaman (Load More)
  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  // Filter film tab aktif berdasarkan genre terpilih
  const currentMovies = activeGenre
    ? movies.filter((movie) => movie.genre_ids?.includes(Number(activeGenre)))
    : movies;

  const currentTabLabel = TABS.find((t) => t.key === activeTab)?.label || '';
  const currentGenreLabel = genres.find((g) => g.id === Number(activeGenre))?.name || '';

  const sectionTitle = activeGenre
    ? `${currentTabLabel} • ${currentGenreLabel}`
    : `${currentTabLabel} Movies`;

  if (error && page === 1) {
    return (
      <div className="explore-page page-container">
        <ErrorState
          message={error}
          onRetry={() => {
            setError(null);
            setPage(1);
            setRetryCount((c) => c + 1);
          }}
        />
      </div>
    );
  }

  return (
    <div className="explore-page">
      <div className="page-container">
        {/* =============================================
            Header Judul Halaman Explore
            ============================================= */}
        <header className="explore__header">
          <div className="explore__badge">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>Curated Film Catalog</span>
          </div>
          <h1 className="explore__title">🎬 Explore All Movies</h1>
          <p className="explore__subtitle">
            Discover trending titles, critically acclaimed classics, and upcoming cinema releases filtered by your favorite genres.
          </p>
        </header>

        {/* =============================================
            Controls (Tab Switcher & Dropdown Filter Genre)
            ============================================= */}
        <div className="explore__controls">
          {/* Tab Switcher: Trending, Popular, Top Rated, Upcoming */}
          <div className="explore__tabs flex overflow-x-auto scrollbar-none gap-2 pb-1" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key}
                className={`explore__tab shrink-0${
                  activeTab === tab.key ? ' explore__tab--active' : ''
                }`}
                onClick={() => handleTabChange(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Dropdown Filter Genre */}
          {genres.length > 0 && (
            <div className="explore__genre-filter">
              <div className="explore__select-inner">
                <select
                  className="explore__select"
                  value={activeGenre}
                  onChange={(e) => setActiveGenre(e.target.value)}
                  aria-label="Filter by genre"
                >
                  <option value="">All Genres</option>
                  {genres.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <svg
                  className="explore__select-arrow"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              {activeGenre && (
                <button
                  type="button"
                  className="explore__reset-genre"
                  onClick={() => setActiveGenre('')}
                  title="Reset genre filter"
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </div>

        {/* =============================================
            Grid Kartu Film & Status Loading
            ============================================= */}
        {loading && page === 1 ? (
          <section className="movie-grid">
            <div className="movie-grid__list grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
              {Array.from({ length: PAGE_SIZE }).map((_, index) => (
                <MovieCardSkeleton key={index} />
              ))}
            </div>
          </section>
        ) : currentMovies.length > 0 ? (
          <>
            <MovieGrid
              title={sectionTitle}
              movies={currentMovies}
              onToggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
            />

            {/* Tombol Load More untuk Infinite Pagination */}
            {page < totalPages && (
              <div className="explore__load-more">
                <button
                  className="explore__load-btn"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <span className="explore__load-spinner" />
                      <span>Loading more films...</span>
                    </span>
                  ) : (
                    'Load More Movies'
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          /* Empty state saat filter genre tidak menemukan film */
          <div className="explore__empty-filter">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <p className="explore__empty-title">
              No movies found for <strong>{currentGenreLabel}</strong> in{' '}
              <strong>{currentTabLabel}</strong>.
            </p>
            <button
              onClick={() => setActiveGenre('')}
              className="explore__empty-reset"
            >
              Show All {currentTabLabel} Movies
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
