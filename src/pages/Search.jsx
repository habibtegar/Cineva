import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MovieGrid from '../components/MovieGrid';
import MovieCard from '../components/MovieCard';
import MovieCardSkeleton from '../components/MovieCardSkeleton';
import ErrorState from '../components/ErrorState';
import { searchMovies, getGenres, discoverMovies, getTrending, getPopular } from '../services/tmdb';
import './Search.css';

/**
 * Local debounce hook for the inline search input on the Search page.
 */
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// Generate array of years from current year backwards to 2000
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2000 + 1 }, (_, i) => String(CURRENT_YEAR - i));

export default function Search({ toggleFavorite, isFavorite }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlQuery = searchParams.get('q') || '';

  // Local input state so user can refine query directly on the page
  const [inputValue, setInputValue] = useState(urlQuery);
  const debouncedInput = useDebounce(inputValue, 400);

  // Filter states: genre & year
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [genres, setGenres] = useState([]);

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const abortRef = useRef(null);
  const searchInputRef = useRef(null);

  // Rekomendasi alternatif saat hasil pencarian kosong
  const [recommendations, setRecommendations] = useState([]);
  const [recLoading, setRecLoading] = useState(false);

  // Dynamic Document Title: ubah judul tab browser untuk halaman Search
  useEffect(() => {
    const query = (urlQuery || inputValue).trim();
    if (query) {
      document.title = `Search: ${query} - Cineva`;
    } else {
      document.title = 'Search Movies - Cineva';
    }
  }, [urlQuery, inputValue]);

  // Fetch official TMDB genre list on mount
  useEffect(() => {
    getGenres()
      .then((data) => setGenres(data.genres || []))
      .catch((err) => console.error('Failed to fetch genres:', err));
  }, []);

  // Fetch trending/popular recommendations for empty state
  useEffect(() => {
    let isActive = true;
    setRecLoading(true);

    getTrending('week', 1)
      .then((data) => {
        if (!isActive) return;
        const list = data?.results || [];
        if (list.length > 0) {
          setRecommendations(list.slice(0, 6));
        } else {
          return getPopular(1);
        }
      })
      .then((popData) => {
        if (!isActive || !popData) return;
        const list = popData?.results || [];
        if (list.length > 0) {
          setRecommendations(list.slice(0, 6));
        }
      })
      .catch((err) => {
        console.error('Failed to fetch recommendations:', err);
      })
      .finally(() => {
        if (isActive) setRecLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  // Reset pencarian dan kembalikan filter ke default
  const handleResetSearch = () => {
    setInputValue('');
    setSelectedGenre('');
    setSelectedYear('');
    setResults([]);
    setTotalResults(0);
    setTotalPages(1);
    navigate('/search', { replace: true });
    searchInputRef.current?.focus();
  };

  // Sync input with URL param when navigating from Navbar
  useEffect(() => {
    setInputValue(urlQuery);
    setPage(1);
  }, [urlQuery]);

  // Update URL when debounced input changes (keeps browser history consistent)
  useEffect(() => {
    const trimmed = debouncedInput.trim();
    if (trimmed.length >= 2 && trimmed !== urlQuery) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`, { replace: true });
    }
  }, [debouncedInput, navigate, urlQuery]);

  // Fetch results whenever URL query OR filters change
  useEffect(() => {
    const trimmed = urlQuery.trim();

    // If no text query and no filter is active, clear results
    if (!trimmed && !selectedGenre && !selectedYear) {
      setResults([]);
      setTotalResults(0);
      setTotalPages(1);
      return;
    }

    // Cancel previous request
    if (abortRef.current) abortRef.current = false;
    const isActive = { current: true };
    abortRef.current = isActive;

    setLoading(true);
    setError(null);
    setPage(1);

    const fetchPromise = trimmed
      ? searchMovies(trimmed, 1, { primary_release_year: selectedYear || undefined })
      : discoverMovies({
          with_genres: selectedGenre || undefined,
          primary_release_year: selectedYear || undefined,
          page: 1,
        });

    fetchPromise
      .then((data) => {
        if (!isActive.current) return;
        let movies = data.results || [];
        if (trimmed && selectedGenre) {
          movies = movies.filter((m) => m.genre_ids?.includes(Number(selectedGenre)));
        }
        setResults(movies);
        setTotalResults(trimmed && selectedGenre ? movies.length : (data.total_results || 0));
        setTotalPages(data.total_pages || 1);
      })
      .catch((err) => {
        if (!isActive.current) return;
        console.error('Search / Discover failed:', err);
        setError('Search failed. Please try again.');
      })
      .finally(() => {
        if (isActive.current) setLoading(false);
      });

    return () => {
      isActive.current = false;
    };
  }, [urlQuery, selectedGenre, selectedYear]);

  // Load more pages
  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const trimmed = urlQuery.trim();
      const data = trimmed
        ? await searchMovies(trimmed, nextPage, { primary_release_year: selectedYear || undefined })
        : await discoverMovies({
            with_genres: selectedGenre || undefined,
            primary_release_year: selectedYear || undefined,
            page: nextPage,
          });

      let newMovies = data.results || [];
      if (trimmed && selectedGenre) {
        newMovies = newMovies.filter((m) => m.genre_ids?.includes(Number(selectedGenre)));
      }
      // Penggabungan Array (Append): Gabungkan film lama dengan film baru menggunakan spread operator
      setResults((prevMovies) => (nextPage === 1 ? newMovies : [...prevMovies, ...newMovies]));
      setPage((prev) => prev + 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  };

  const trimmedUrl = urlQuery.trim();
  const hasMore = page < totalPages;
  const selectedGenreName = genres.find((g) => String(g.id) === String(selectedGenre))?.name || '';
  const hasActiveFilterOrQuery = Boolean(trimmedUrl || selectedGenre || selectedYear);
  const movies = results;
  const isLoading = loading;

  return (
    <div className="search-page page-container">
      {/* Inline search input on page */}
      <form
        className="search-page__bar"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = inputValue.trim();
          if (trimmed && trimmed !== urlQuery) {
            navigate(`/search?q=${encodeURIComponent(trimmed)}`, { replace: true });
          }
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search movies..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="search-page__input"
          autoFocus
          aria-label="Search movies"
        />
        {inputValue && (
          <button
            type="button"
            className="search-page__clear"
            onClick={() => { setInputValue(''); navigate('/search'); }}
            aria-label="Clear search"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </form>

      {/* Advanced Filter Dropdowns (Genre & Year) */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Genre Dropdown */}
        <div className="relative flex-1 min-w-[150px] sm:min-w-[180px]">
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="w-full appearance-none bg-zinc-900/90 text-zinc-200 border border-zinc-800 hover:border-zinc-700 text-sm rounded-xl pl-3.5 pr-9 py-2.5 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition cursor-pointer shadow-sm"
            aria-label="Filter by genre"
          >
            <option value="" className="bg-zinc-900 text-zinc-300">All Genres</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id} className="bg-zinc-900 text-zinc-200">
                {g.name}
              </option>
            ))}
          </select>
          <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-zinc-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>

        {/* Release Year Dropdown */}
        <div className="relative flex-1 min-w-[130px] sm:min-w-[150px]">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full appearance-none bg-zinc-900/90 text-zinc-200 border border-zinc-800 hover:border-zinc-700 text-sm rounded-xl pl-3.5 pr-9 py-2.5 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition cursor-pointer shadow-sm"
            aria-label="Filter by year"
          >
            <option value="" className="bg-zinc-900 text-zinc-300">All Years</option>
            {YEARS.map((yr) => (
              <option key={yr} value={yr} className="bg-zinc-900 text-zinc-200">
                {yr}
              </option>
            ))}
          </select>
          <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-zinc-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>

        {/* Reset Filters button */}
        {(selectedGenre || selectedYear) && (
          <button
            type="button"
            onClick={() => {
              setSelectedGenre('');
              setSelectedYear('');
            }}
            className="px-3.5 py-2.5 rounded-xl text-xs font-medium bg-zinc-800/80 hover:bg-zinc-700 active:scale-95 text-zinc-300 hover:text-white border border-zinc-700/60 transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reset Filter
          </button>
        )}
      </div>

      {/* Results Count Summary */}
      {hasActiveFilterOrQuery && !loading && !error && (
        <p className="search-page__count">
          {totalResults.toLocaleString()} {totalResults === 1 ? 'movie' : 'movies'} found
          {trimmedUrl && <span> for <strong>&ldquo;{trimmedUrl}&rdquo;</strong></span>}
          {selectedGenreName && <span className="text-zinc-300 font-medium"> &bull; Genre: {selectedGenreName}</span>}
          {selectedYear && <span className="text-zinc-300 font-medium"> &bull; Year: {selectedYear}</span>}
        </p>
      )}

      {error && <ErrorState message={error} />}

      {isLoading ? (
        <section className="movie-grid">
          <div className="movie-grid__list">
            {Array.from({ length: 12 }).map((_, index) => (
              <MovieCardSkeleton key={index} />
            ))}
          </div>
        </section>
      ) : movies.length > 0 ? (
        <>
          <MovieGrid
            movies={movies}
            onToggleFavorite={toggleFavorite}
            isFavorite={isFavorite}
          />
          {hasMore && (
            <div className="search-page__load-more">
              <button
                className="search-page__load-btn"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <span className="search-page__spinner" />
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
        !isLoading && !error && movies.length === 0 && (
          <div className="search-page__empty-container">
            <div className="search-page__empty">
              <div className="search-page__empty-icon-wrapper">
                {/* Ikon pencarian coret */}
                <svg
                  className="search-page__empty-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="4" y1="4" x2="18" y2="18" />
                </svg>
              </div>
              <p className="search-page__empty-title">
                Oops, no movies found.
              </p>
              <p className="search-page__empty-subtitle">
                Try adjusting your search or filters to find what you're looking for.
              </p>
              <button
                type="button"
                className="search-page__reset-btn"
                onClick={handleResetSearch}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                Reset Search
              </button>
            </div>

            {/* Rekomendasi Alternatif: Mungkin Anda Suka */}
            <div className="search-page__recommendations">
              <div className="search-page__recommendations-header">
                <div className="search-page__recommendations-badge">
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <h2 className="search-page__recommendations-title">
                  Mungkin Anda Suka
                </h2>
              </div>

              {recLoading && recommendations.length === 0 ? (
                <div className="search-page__recommendations-grid">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <MovieCardSkeleton key={index} />
                  ))}
                </div>
              ) : recommendations.length > 0 ? (
                <div className="search-page__recommendations-grid">
                  {recommendations.slice(0, 6).map((movie) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      onToggleFavorite={toggleFavorite}
                      isFavorite={isFavorite ? isFavorite(movie.id) : false}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        )
      )}
    </div>
  );
}
