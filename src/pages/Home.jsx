import { useState, useEffect } from 'react';
import HeroSection from '../components/HeroSection';
import MovieGrid from '../components/MovieGrid';
import MovieCardSkeleton from '../components/MovieCardSkeleton';
import TrailerModal from '../components/TrailerModal';
import { SkeletonHero } from '../components/Skeleton';
import ErrorState from '../components/ErrorState';
import {
  getTrending,
  getPopular,
  getTopRated,
  getUpcoming,
  getGenres,
  getMovieDetail,
  getTrailerVideo,
} from '../services/tmdb';
import './Home.css';

const TABS = [
  { key: 'trending',  label: 'Trending' },
  { key: 'popular',   label: 'Popular' },
  { key: 'topRated',  label: 'Top Rated' },
  { key: 'upcoming',  label: 'Upcoming' },
];

const PAGE_SIZE = 12;

export default function Home({ toggleFavorite, isFavorite }) {
  // Hero
  const [hero, setHero] = useState(null);
  const [heroTrailerKey, setHeroTrailerKey] = useState(null);
  const [trailerOpen, setTrailerOpen] = useState(false);

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

  // Dynamic Document Title: ubah judul tab browser untuk halaman Home
  useEffect(() => {
    document.title = 'Home - Cineva';
  }, []);

  // Fetch official TMDB genre list on mount
  useEffect(() => {
    getGenres()
      .then((data) => setGenres(data.genres || []))
      .catch((err) => console.error('Failed to fetch genres:', err));
  }, []);

  // Fetch hero trailer key once hero is set
  useEffect(() => {
    if (!hero) return;
    getMovieDetail(hero.id)
      .then((detail) => {
        const trailer = getTrailerVideo(detail.videos?.results);
        setHeroTrailerKey(trailer?.key || null);
      })
      .catch(() => {});
  }, [hero]);

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

        // Parameter API: Pemanggilan API TMDB dengan parameter halaman dinamis (&page=${page})
        const data = await fetchFn(page);
        if (isCancelled) return;

        // Penggabungan Array (Append):
        // Saat hasil fetch berhasil, jangan langsung menimpa state film lama. Gunakan logika spread operator
        setMovies((prevMovies) => (page === 1 ? (data.results || []) : [...prevMovies, ...(data.results || [])]));
        setTotalPages(data.total_pages || 1);

        // Pilih film acak dari hasil fetch untuk banner Hero jika belum di-set
        if (!hero && data.results && data.results.length > 0) {
          const randomIndex = Math.floor(Math.random() * data.results.length);
          setHero(data.results[randomIndex]);
        }
      } catch (err) {
        if (isCancelled) return;
        console.error('Failed to fetch movies:', err);
        setError('Failed to load movies. Please check your API key and try again.');
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

  // Fungsi Klik: Buat fungsi penanganan tombol yang akan menambah angka halaman
  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  // Filter film tab aktif berdasarkan genre terpilih
  const currentMovies = activeGenre
    ? movies.filter((movie) => movie.genre_ids?.includes(Number(activeGenre)))
    : movies;

  const currentTabLabel = TABS.find((t) => t.key === activeTab)?.label || '';
  const currentGenreLabel = genres.find((g) => g.id === Number(activeGenre))?.name || '';
  
  // Dynamic section title — e.g. "Trending • Action" or "Top Rated Movies"
  const sectionTitle = activeGenre
    ? `${currentTabLabel} • ${currentGenreLabel}`
    : `${currentTabLabel} Movies`;

  if (error) {
    return (
      <div className="page-container" style={{ paddingTop: 80 }}>
        <ErrorState message={error} onRetry={() => { setError(null); setPage(1); setRetryCount((c) => c + 1); }} />
      </div>
    );
  }

  return (
    <div className="home">
      {/* Hero */}
      {loading && page === 1 ? (
        <SkeletonHero />
      ) : (
        <HeroSection
          movie={hero}
          genres={genres}
          onWatchTrailer={heroTrailerKey ? () => setTrailerOpen(true) : undefined}
        />
      )}

      <div className="page-container">
        {/* ---- Category tabs (left) + Genre filter (right) ---- */}
        <div className="home__controls">
          {/* Tabs: Trending, Popular, Top Rated, Upcoming */}
          <div className="home__tabs flex overflow-x-auto scrollbar-none gap-2 pb-1" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key}
                className={`home__tab shrink-0${activeTab === tab.key ? ' home__tab--active' : ''}`}
                onClick={() => handleTabChange(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Genre filter dropdown */}
          {genres.length > 0 && (
            <div className="home__genre-filter">
              <div className="home__select-inner">
                <select
                  className="home__select"
                  value={activeGenre}
                  onChange={(e) => setActiveGenre(e.target.value)}
                  aria-label="Filter by genre"
                >
                  <option value="">All Genres</option>
                  {genres.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <svg className="home__select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              {activeGenre && (
                <button
                  type="button"
                  className="home__reset-genre"
                  onClick={() => setActiveGenre('')}
                  title="Reset genre filter"
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </div>

        {/* ---- Movie section ---- */}
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

            {/* Load More */}
            {page < totalPages && (
              <div className="home__load-more">
                <button
                  className="home__load-btn"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <span className="home__load-spinner" />
                      <span>Loading...</span>
                    </span>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          /* Empty state when genre filter finds no movies in this tab */
          <div className="home__empty-filter">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <p className="home__empty-title">
              No movies found for <strong>{currentGenreLabel}</strong> in <strong>{currentTabLabel}</strong>.
            </p>
            <button
              onClick={() => setActiveGenre('')}
              className="home__empty-reset"
            >
              Show All {currentTabLabel} Movies
            </button>
          </div>
        )}
      </div>

      {/* Trailer modal */}
      {trailerOpen && heroTrailerKey && (
        <TrailerModal
          trailerKey={heroTrailerKey}
          title={hero?.title || 'Trailer'}
          onClose={() => setTrailerOpen(false)}
        />
      )}
    </div>
  );
}
