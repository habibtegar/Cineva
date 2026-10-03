import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MovieGrid from '../components/MovieGrid';
import { SkeletonGrid } from '../components/Skeleton';
import ErrorState from '../components/ErrorState';
import { searchMovies } from '../services/tmdb';
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

export default function Search({ toggleFavorite, isFavorite }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlQuery = searchParams.get('q') || '';

  // Local input state so user can refine query directly on the page
  const [inputValue, setInputValue] = useState(urlQuery);
  const debouncedInput = useDebounce(inputValue, 400);

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const abortRef = useRef(null);

  // Sync input with URL param when navigating from Navbar
  useEffect(() => {
    setInputValue(urlQuery);
    setPage(1);
    setResults([]);
  }, [urlQuery]);

  // Update URL when debounced input changes (keeps browser history consistent)
  useEffect(() => {
    const trimmed = debouncedInput.trim();
    if (trimmed.length >= 2 && trimmed !== urlQuery) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`, { replace: true });
    }
  }, [debouncedInput, navigate, urlQuery]);

  // Fetch results whenever URL query changes
  useEffect(() => {
    const trimmed = urlQuery.trim();
    if (!trimmed) {
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

    searchMovies(trimmed, 1)
      .then((data) => {
        if (!isActive.current) return;
        setResults(data.results || []);
        setTotalResults(data.total_results || 0);
        setTotalPages(data.total_pages || 1);
      })
      .catch((err) => {
        if (!isActive.current) return;
        console.error('Search failed:', err);
        setError('Search failed. Please try again.');
      })
      .finally(() => {
        if (isActive.current) setLoading(false);
      });

    return () => { isActive.current = false; };
  }, [urlQuery]);

  // Load more pages
  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const data = await searchMovies(urlQuery, nextPage);
      setResults((prev) => [...prev, ...(data.results || [])]);
      setPage(nextPage);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  };

  const trimmedUrl = urlQuery.trim();
  const hasMore = page < totalPages;

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
          placeholder="Search movies..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="search-page__input"
          autoFocus
          aria-label="Search movies"
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

      {trimmedUrl && !loading && !error && (
        <p className="search-page__count">
          {totalResults.toLocaleString()} results for <strong>&ldquo;{trimmedUrl}&rdquo;</strong>
        </p>
      )}

      {error && <ErrorState message={error} />}

      {loading ? (
        <SkeletonGrid count={12} />
      ) : results.length > 0 ? (
        <>
          <MovieGrid
            movies={results}
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
                {loadingMore
                  ? <span className="search-page__spinner" />
                  : 'Load More'}
              </button>
            </div>
          )}
        </>
      ) : (
        trimmedUrl && !error && (
          <div className="search-page__empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p>No results for &ldquo;{trimmedUrl}&rdquo;</p>
            <span>Try a different keyword or check your spelling.</span>
          </div>
        )
      )}
    </div>
  );
}
