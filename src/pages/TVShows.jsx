import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MovieCardSkeleton from '../components/MovieCardSkeleton';
import ErrorState from '../components/ErrorState';
import {
  getTVPopular,
  getTVTopRated,
  getTVAiringToday,
  getTVGenres,
  discoverTV,
  getImageUrl,
} from '../services/tmdb';
import './TVShows.css';

const TABS = [
  { key: 'popular', label: 'Popular' },
  { key: 'top_rated', label: 'Top Rated' },
  { key: 'airing_today', label: 'Airing Today' },
];

const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Most Popular' },
  { value: 'vote_average.desc', label: 'Highest Rated' },
  { value: 'first_air_date.desc', label: 'Newest Releases' },
];

const PAGE_SIZE = 12;

export default function TVShows({ toggleFavorite, isFavorite }) {
  const navigate = useNavigate();

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

        // Jika ada filter genre atau custom sort yang aktif, gunakan discoverTV
        if (activeGenre || sortBy !== 'popularity.desc') {
          const params = {
            page,
            sort_by: sortBy,
          };
          if (activeGenre) {
            params.with_genres = activeGenre;
          }
          if (sortBy === 'vote_average.desc') {
            params['vote_count.gte'] = 50; // Filter out series with very few votes for clean ratings
          }
          data = await discoverTV(params);
        } else {
          // Gunakan tab endpoint standar TMDB
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

  // Tab change
  const handleTabChange = (tabKey) => {
    if (tabKey === activeTab) return;
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
    ? `${currentTabLabel} • ${currentGenreLabel}`
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
            Header Judul Halaman TV Shows
            ============================================= */}
        <header className="tv__header">
          <div className="tv__badge">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>Television Series</span>
          </div>
          <h1 className="tv__title">📺 TV Shows & Series</h1>
          <p className="tv__subtitle">
            Explore popular television series, top rated sagas, and shows airing today across global networks.
          </p>
        </header>

        {/* =============================================
            Controls (Tabs Switcher & Dropdown Filters)
            ============================================= */}
        <div className="tv__controls">
          {/* Tab Switcher: Popular, Top Rated, Airing Today */}
          <div className="tv__tabs flex overflow-x-auto scrollbar-none gap-2 pb-1" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key && !activeGenre && sortBy === 'popularity.desc'}
                className={`tv__tab shrink-0${
                  activeTab === tab.key && !activeGenre && sortBy === 'popularity.desc'
                    ? ' tv__tab--active'
                    : ''
                }`}
                onClick={() => handleTabChange(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filters: Dropdown Genre & Dropdown Sort */}
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

            {/* Sort Dropdown */}
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
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
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

            {/* Reset Filter Button */}
            {(activeGenre || sortBy !== 'popularity.desc') && (
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

        {/* Section Heading */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
            {sectionTitle}
          </h2>
          <span className="text-xs text-zinc-400 font-medium">
            Page {page} of {totalPages}
          </span>
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
              {shows.map((show) => {
                const poster = getImageUrl(show.poster_path, 'w342');
                const year = show.first_air_date ? show.first_air_date.slice(0, 4) : '—';
                const hasRating = typeof show.vote_average === 'number' && show.vote_average > 0;
                const ratingText = hasRating ? show.vote_average.toFixed(1) : '-';
                const isFav = isFavorite ? isFavorite(show.id) : false;

                // Objek yang kompatibel dengan toggleFavorite
                const showItem = {
                  ...show,
                  title: show.name,
                  release_date: show.first_air_date,
                  media_type: 'tv',
                };

                return (
                  <article
                    key={show.id}
                    className="tv-card group/card"
                    onClick={() => navigate(`/tv/${show.id}`)}
                  >
                    {/* Poster Link Wrap */}
                    <div className="tv-card__poster-link">
                      {poster ? (
                        <img
                          src={poster}
                          alt={show.name}
                          className="tv-card__poster"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-900 flex flex-col justify-between p-3 select-none text-center">
                          <span className="text-[10px] font-black tracking-widest text-red-500 uppercase mt-4">
                            Cineva TV
                          </span>
                          <p className="text-xs font-semibold text-zinc-200 line-clamp-3">
                            {show.name}
                          </p>
                          <div className="h-2" />
                        </div>
                      )}

                      {/* Gradient Overlay */}
                      <div className="tv-card__overlay" />

                      {/* Rating Badge */}
                      {hasRating && (
                        <div className="tv-card__rating" aria-label={`Rating: ${ratingText}`}>
                          <svg className="w-3 h-3 fill-amber-400" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          <span>{ratingText}</span>
                        </div>
                      )}

                      {/* Favorite Button */}
                      {toggleFavorite && (
                        <button
                          type="button"
                          className={`tv-card__fav ${isFav ? 'tv-card__fav--active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(showItem);
                          }}
                          aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill={isFav ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Show Information */}
                    <div className="tv-card__info">
                      <h3 className="tv-card__title line-clamp-1" title={show.name}>
                        {show.name}
                      </h3>
                      <div className="tv-card__meta">
                        <span>{year}</span>
                        <span>•</span>
                        <span>TV Series</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Tombol Load More */}
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
