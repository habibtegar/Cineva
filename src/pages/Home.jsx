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
  getMoviesByGenre,
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

  // Active tab
  const [activeTab, setActiveTab] = useState('trending');

  // Genre filter
  const [genres, setGenres] = useState([]);
  const [activeGenre, setActiveGenre] = useState(null);
  const [genreMovies, setGenreMovies] = useState([]);
  const [genrePage, setGenrePage] = useState(1);
  const [genreLoading, setGenreLoading] = useState(false);
  const [genreHasMore, setGenreHasMore] = useState(false);

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

  // Load more for tabs (append next page)
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

  // Genre selection
  const handleGenreSelect = async (genreId) => {
    if (activeGenre === genreId) {
      setActiveGenre(null);
      setGenreMovies([]);
      return;
    }
    setActiveGenre(genreId);
    setGenrePage(1);
    setGenreLoading(true);
    try {
      const data = await getMoviesByGenre(genreId, 1);
      setGenreMovies(data.results || []);
      setGenreHasMore((data.total_pages || 1) > 1);
    } catch (e) {
      console.error(e);
    } finally {
      setGenreLoading(false);
    }
  };

  const handleLoadMoreGenre = async () => {
    const nextPage = genrePage + 1;
    setLoadingMore(true);
    try {
      const data = await getMoviesByGenre(activeGenre, nextPage);
      setGenreMovies((prev) => [...prev, ...(data.results || [])]);
      setGenrePage(nextPage);
      setGenreHasMore(nextPage < (data.total_pages || 1));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  };

  // Current displayed movies (genre overrides tab)
  const currentMovies = activeGenre ? genreMovies : allMovies[activeTab] || [];
  const currentTabLabel = TABS.find((t) => t.key === activeTab)?.label || '';
  const currentGenreLabel = genres.find((g) => g.id === activeGenre)?.name || '';
  // Dynamic section title — e.g. "Trending Movies", "Action Movies"
  const sectionTitle = activeGenre
    ? `${currentGenreLabel} Movies`
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
          onWatchTrailer={heroTrailerKey ? () => setTrailerOpen(true) : undefined}
        />
      )}

      <div className="page-container">
        {/* ---- Category tabs + Genre filter ---- */}
        <div className="home__controls">
          {/* Tabs */}
          <div className="home__tabs" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key && !activeGenre}
                className={`home__tab${activeTab === tab.key && !activeGenre ? ' home__tab--active' : ''}`}
                onClick={() => {
                  setActiveTab(tab.key);
                  setActiveGenre(null);
                  setGenreMovies([]);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Genre filter */}
          {genres.length > 0 && (
            <div className="home__genre-wrap">
              <select
                className="home__genre-select"
                value={activeGenre || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  handleGenreSelect(val ? Number(val) : null);
                }}
                aria-label="Filter by genre"
              >
                <option value="">All Genres</option>
                {genres.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <svg className="home__genre-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          )}
        </div>

        {/* ---- Movie section ---- */}
        {loading || genreLoading ? (
          <SkeletonGrid count={PAGE_SIZE} />
        ) : (
          <>
            <MovieGrid
              title={sectionTitle}
              movies={currentMovies}
              onToggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
            />

            {/* Load More */}
            {currentMovies.length > 0 && (
              <div className="home__load-more">
                <button
                  className="home__load-btn"
                  onClick={activeGenre ? handleLoadMoreGenre : handleLoadMoreTab}
                  disabled={loadingMore || (activeGenre && !genreHasMore)}
                >
                  {loadingMore ? (
                    <span className="home__load-spinner" />
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </>
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
