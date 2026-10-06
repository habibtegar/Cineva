import { useState, useEffect, useCallback } from 'react';
import HeroSection from '../components/HeroSection';
import MovieGrid from '../components/MovieGrid';
import TrailerModal from '../components/TrailerModal';
import { SkeletonGrid, SkeletonHero } from '../components/Skeleton';
import ErrorState from '../components/ErrorState';
import {
  getTrending,
  getPopular,
  getTopRated,
  getUpcoming,
  getGenres,
  getMovieDetail,
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

  // All category data
  const [allMovies, setAllMovies] = useState({
    trending: [], popular: [], topRated: [], upcoming: [],
  });

  // Active category tab
  const [activeTab, setActiveTab] = useState('trending');

  // Genre filter (applied to the active tab)
  const [genres, setGenres] = useState([]);
  const [activeGenre, setActiveGenre] = useState('');

  // Per-tab page (for Load More)
  const [tabPage, setTabPage] = useState({ trending: 1, popular: 1, topRated: 1, upcoming: 1 });

  // Global load state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch hero trailer key once hero is set
  useEffect(() => {
    if (!hero) return;
    getMovieDetail(hero.id)
      .then((detail) => {
        const trailer = detail.videos?.results?.find(
          (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
        );
        setHeroTrailerKey(trailer?.key || null);
      })
      .catch(() => {});
  }, [hero]);

  // Initial data fetch
  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      getTrending(),
      getPopular(),
      getTopRated(),
      getUpcoming(),
      getGenres(),
    ])
      .then(([trendingData, popularData, topRatedData, upcomingData, genreData]) => {
        const trending = trendingData.results || [];
        setHero(trending[0] || null);
        setAllMovies({
          trending,
          popular: popularData.results || [],
          topRated: topRatedData.results || [],
          upcoming: upcomingData.results || [],
        });
        setGenres(genreData.genres || []);
      })
      .catch((err) => {
        console.error('Failed to fetch movies:', err);
        setError('Failed to load movies. Please check your API key and try again.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Load more for current active tab (append next page)
  const handleLoadMoreTab = async () => {
    const nextPage = tabPage[activeTab] + 1;
    setLoadingMore(true);
    try {
      const fetchFn = {
        trending: getTrending,
        popular: getPopular,
        topRated: getTopRated,
        upcoming: getUpcoming,
      }[activeTab];

      const data = activeTab === 'trending'
        ? await fetchFn('week', nextPage)
        : await fetchFn(nextPage);

      setAllMovies((prev) => ({
        ...prev,
        [activeTab]: [...prev[activeTab], ...(data.results || [])],
      }));
      setTabPage((prev) => ({ ...prev, [activeTab]: nextPage }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  };

  // Movies from currently active tab
  const tabMovies = allMovies[activeTab] || [];

  // Filter active tab's movies by chosen genre
  const currentMovies = activeGenre
    ? tabMovies.filter((movie) => movie.genre_ids?.includes(Number(activeGenre)))
    : tabMovies;

  const currentTabLabel = TABS.find((t) => t.key === activeTab)?.label || '';
  const currentGenreLabel = genres.find((g) => g.id === Number(activeGenre))?.name || '';
  
  // Dynamic section title — e.g. "Trending • Action" or "Top Rated Movies"
  const sectionTitle = activeGenre
    ? `${currentTabLabel} • ${currentGenreLabel}`
    : `${currentTabLabel} Movies`;

  if (error) {
    return (
      <div className="page-container" style={{ paddingTop: 80 }}>
        <ErrorState message={error} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div className="home">
      {/* Hero */}
      {loading ? (
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
          <div className="home__tabs" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key}
                className={`home__tab${activeTab === tab.key ? ' home__tab--active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
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
                  <option value="">Semua Genre</option>
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
                  title="Reset filter genre"
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </div>

        {/* ---- Movie section ---- */}
        {loading ? (
          <SkeletonGrid count={PAGE_SIZE} />
        ) : currentMovies.length > 0 ? (
          <>
            <MovieGrid
              title={sectionTitle}
              movies={currentMovies}
              onToggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
            />

            {/* Load More */}
            <div className="home__load-more">
              <button
                className="home__load-btn"
                onClick={handleLoadMoreTab}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <span className="home__load-spinner" />
                ) : (
                  'Load More'
                )}
              </button>
            </div>
          </>
        ) : (
          /* Empty state saat filter genre tidak menemukan film di tab ini */
          <div className="home__empty-filter">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <p className="home__empty-title">
              Tidak ada film <strong>{currentGenreLabel}</strong> di kategori <strong>{currentTabLabel}</strong> saat ini.
            </p>
            <button
              onClick={() => setActiveGenre('')}
              className="home__empty-reset"
            >
              Lihat Semua Film {currentTabLabel}
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
