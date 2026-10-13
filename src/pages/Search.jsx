import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MovieGrid from '../components/MovieGrid';
import MovieCardSkeleton from '../components/MovieCardSkeleton';
import ErrorState from '../components/ErrorState';
import { searchMovies, getGenres, discoverMovies } from '../services/tmdb';
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
        setError('Pencarian gagal. Silakan coba lagi.');
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
      <div className="search-page__bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Cari judul film..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="search-page__input"
          autoFocus
          aria-label="Cari judul film"
        />
        {inputValue && (
          <button
            className="search-page__clear"
            onClick={() => { setInputValue(''); navigate('/search'); }}
            aria-label="Clear search"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Advanced Filter Dropdowns (Genre & Year) */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Genre Dropdown */}
        <div className="relative flex-1 min-w-[150px] sm:min-w-[180px]">
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="w-full appearance-none bg-zinc-900/90 text-zinc-200 border border-zinc-800 hover:border-zinc-700 text-sm rounded-xl pl-3.5 pr-9 py-2.5 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition cursor-pointer shadow-sm"
            aria-label="Filter berdasarkan genre"
          >
            <option value="" className="bg-zinc-900 text-zinc-300">Semua Genre</option>
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
            aria-label="Filter berdasarkan tahun"
          >
            <option value="" className="bg-zinc-900 text-zinc-300">Semua Tahun</option>
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
          {totalResults.toLocaleString()} film ditemukan
          {trimmedUrl && <span> untuk <strong>&ldquo;{trimmedUrl}&rdquo;</strong></span>}
          {selectedGenreName && <span className="text-zinc-300 font-medium"> &bull; Genre: {selectedGenreName}</span>}
          {selectedYear && <span className="text-zinc-300 font-medium"> &bull; Tahun: {selectedYear}</span>}
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
          <div className="flex flex-col items-center justify-center mt-20 text-center">
            <div className="w-16 h-16 mb-4 rounded-full bg-zinc-800/60 flex items-center justify-center text-gray-500">
              {/* Ikon pencarian coret */}
              <svg
                className="w-8 h-8 text-gray-400"
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
            <p className="text-gray-400 text-base md:text-lg">
              Ups, film yang Anda cari tidak ditemukan.
            </p>
          </div>
        )
      )}
    </div>
  );
}
