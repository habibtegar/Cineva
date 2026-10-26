import { useState, useEffect } from 'react';
import TVCard from '../components/TVCard';
import MovieCardSkeleton from '../components/MovieCardSkeleton';
import ErrorState from '../components/ErrorState';
import {
  getTVPopular,
  getTVTopRated,
  getTVAiringToday,
  getTVGenres,
  discoverTV,
} from '../services/tmdb';
import './TVShows.css';

const TABS = [
  { key: 'popular', label: 'Popular' },
  { key: 'top_rated', label: 'Top Rated' },
  { key: 'airing_today', label: 'Airing Today' },
];

const PAGE_SIZE = 12;

export default function TVShows({ toggleFavorite, isFavorite }) {
  // State TV Shows & Pagination
  const [shows, setShows] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Active Category Tab
  const [activeTab, setActiveTab] = useState('popular');

  // Filters & Sorting
  const [genres, setGenres] = useState([]);
  const [activeGenre, setActiveGenre] = useState('');
  const [sortBy, setSortBy] = useState('popularity.desc');

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Dynamic Document Title
  useEffect(() => {
    document.title = 'TV Shows — Cineva';
    window.scrollTo(0, 0);
  }, []);

  // Fetch official TV genres on mount
  useEffect(() => {
    getTVGenres()
      .then((data) => setGenres(data.genres || []))
      .catch((err) => console.error('Failed to fetch TV genres:', err));
  }, []);

  // Fetch TV shows whenever activeTab, page, activeGenre, sortBy, or retryCount changes
  useEffect(() => {
    let isCancelled = false;

    const fetchTVShows = async () => {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      try {
        let data;

        // Jika ada filter genre atau custom sort aktif, gunakan discoverTV
        if (activeGenre || sortBy !== 'popularity.desc') {
          const params = {
            page,
            sort_by: sortBy,
          };
          if (activeGenre) {
            params.with_genres = activeGenre;
          }
          if (sortBy === 'vote_average.desc') {
            params['vote_count.gte'] = 50; // Filter serial TV dengan vote cukup agar rating akurat
          }
          data = await discoverTV(params);
        } else {
          // Gunakan endpoint preset standar TMDB (Popular, Top Rated, Airing Today)
          const fetchFn = {
            popular: (p) => getTVPopular(p),
            top_rated: (p) => getTVTopRated(p),
            airing_today: (p) => getTVAiringToday(p),
          }[activeTab] || getTVPopular;

          data = await fetchFn(page);
        }

        if (isCancelled) return;

        setShows((prevShows) =>
          page === 1 ? data.results || [] : [...prevShows, ...(data.results || [])]
        );
        setTotalPages(data.total_pages || 1);
      } catch (err) {
        if (isCancelled) return;
        console.error('Failed to fetch TV shows:', err);
        setError('Failed to load TV shows. Please check your internet connection.');
      } finally {
        if (!isCancelled) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    };

    fetchTVShows();

    return () => {
      isCancelled = true;
    };
  }, [activeTab, page, activeGenre, sortBy, retryCount]);

  // Tab change handler — clears custom genre & sort to restore preset
  const handleTabChange = (tabKey) => {
    if (tabKey === activeTab && !activeGenre) return;
    setActiveTab(tabKey);
    setActiveGenre('');
    setSortBy('popularity.desc');
    setPage(1);
  };

  // Load More pagination
  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  const currentTabLabel = TABS.find((t) => t.key === activeTab)?.label || 'Popular';
  const currentGenreLabel = genres.find((g) => g.id === Number(activeGenre))?.name || '';

  const sectionTitle = activeGenre
    ? `${currentGenreLabel} TV Shows`
    : `${currentTabLabel} TV Shows`;

  if (error && page === 1) {
    return (
      <div className="tv-page page-container">
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
    <div className="tv-page">
      <div className="page-container">
        {/* =============================================
            1. Header Judul Halaman TV Shows
            ============================================= */}
        <header className="tv__header">
          <div className="tv__badge">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>Television Series</span>
          </div>
          <h1 className="tv__title text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
            📺 TV Shows
          </h1>
          <p className="tv__subtitle text-zinc-400 text-sm md:text-base max-w-2xl leading-relaxed">
            Explore popular television series, top rated sagas, and shows airing today across global networks.
          </p>
        </header>

        {/* =============================================
            3. Controls (Tabs Switcher & Dropdown Filter)
            ============================================= */}
        <div className="tv__controls">
          {/* Tab Switcher: Popular, Top Rated, Airing Today */}
          <div className="tv__tabs flex overflow-x-auto scrollbar-none gap-2 pb-1" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key && !activeGenre}
                className={`tv__tab shrink-0${
                  activeTab === tab.key && !activeGenre
                    ? ' tv__tab--active'
                    : ''
                }`}
                onClick={() => handleTabChange(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filters: Dropdown Genre & Contextual Sort */}
          <div className="tv__filters">
            {/* Genre Dropdown */}
            {genres.length > 0 && (
              <div className="tv__select-inner">
                <select
                  className="tv__select"
                  value={activeGenre}
                  onChange={(e) => {
                    setActiveGenre(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Filter TV shows by genre"
                >
                  <option value="">All Genres</option>
                  {genres.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <svg
                  className="tv__select-arrow"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            )}

            {/* Sort Dropdown: Ditampilkan saat genre dipilih agar fokus dan tidak redundan dengan tab preset */}
            {activeGenre && (
              <div className="tv__select-inner">
                <select
                  className="tv__select"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Sort TV shows"
                >
                  <option value="popularity.desc">Most Popular</option>
                  <option value="vote_average.desc">Highest Rated</option>
                  <option value="first_air_date.desc">Newest Air Date</option>
                </select>
                <svg
                  className="tv__select-arrow"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            )}

            {/* Reset Filter Button */}
            {activeGenre && (
              <button
                type="button"
                className="tv__reset-btn"
                onClick={() => {
                  setActiveGenre('');
                  setSortBy('popularity.desc');
                  setPage(1);
                }}
                title="Reset TV filters"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Section Heading (tanpa teks Page 1 of 1001) */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
            {sectionTitle}
          </h2>
        </div>

        {/* =============================================
            Grid Serial TV & Status Loading
            ============================================= */}
        {loading && page === 1 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
            {Array.from({ length: PAGE_SIZE }).map((_, index) => (
              <MovieCardSkeleton key={index} />
            ))}
          </div>
        ) : shows.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
              {shows.map((show) => (
                <TVCard
                  key={show.id}
                  show={show}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={isFavorite ? isFavorite(show.id) : false}
                />
              ))}
            </div>

            {/* Tombol Load More di tengah bawah untuk Infinite Pagination */}
            {page < totalPages && (
              <div className="tv__load-more">
                <button
                  type="button"
                  className="tv__load-btn"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <span className="tv__load-spinner" />
                      <span>Loading more shows...</span>
                    </span>
                  ) : (
                    'Load More TV Shows'
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          /* Empty filter state */
          <div className="tv__empty-filter">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
              <polyline points="17 2 12 7 7 2" />
            </svg>
            <p className="tv__empty-title">
              No TV shows found for <strong>{currentGenreLabel}</strong>.
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveGenre('');
                setSortBy('popularity.desc');
                setPage(1);
              }}
              className="tv__empty-reset"
            >
              Show All TV Shows
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
