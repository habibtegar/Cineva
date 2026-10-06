import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { searchMovies, getImageUrl } from '../services/tmdb';
import './Navbar.css';

/**
 * Debounce utility — returns debounced value after delay ms.
 */
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function Navbar() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const drawerRef = useRef(null);

  // Debounce search with 300ms delay as requested
  const debouncedQuery = useDebounce(query, 300);

  // Fetch live search results
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    let active = true;

    searchMovies(trimmed, 1)
      .then((data) => {
        if (active) {
          // Take top 5 results max
          setSearchResults(data.results?.slice(0, 5) || []);
          setShowDropdown(true);
        }
      })
      .catch((err) => {
        console.error('Failed to search movies:', err);
        if (active) setSearchResults([]);
      })
      .finally(() => {
        if (active) setIsSearching(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown and drawer when route changes
  useEffect(() => {
    setDrawerOpen(false);
    setShowDropdown(false);
    setQuery('');
  }, [location.pathname, location.search]);

  // Scroll detection
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  // Escape key closes dropdown and drawer
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setShowDropdown(false);
        setDrawerOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const handleSelectMovie = (movieId) => {
    setShowDropdown(false);
    setQuery('');
    setDrawerOpen(false);
    navigate(`/movie/${movieId}`);
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      setShowDropdown(false);
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
      inputRef.current?.blur();
      setDrawerOpen(false);
    }
  };

  return (
    <>
      <nav className={`navbar${scrolled ? ' navbar--scrolled' : ''}`}>
        <div className="navbar__inner">
          {/* Logo */}
          <Link to="/" className="navbar__logo">
            Cineva
          </Link>

          {/* Desktop nav */}
          <div className="navbar__desktop">
            <div className="navbar__links">
              <Link
                to="/"
                className={`navbar__link${location.pathname === '/' ? ' navbar__link--active' : ''}`}
              >
                Home
              </Link>
              <Link
                to="/favorites"
                className={`navbar__link${location.pathname === '/favorites' ? ' navbar__link--active' : ''}`}
              >
                Favorites
              </Link>
            </div>

            {/* Desktop Search with Live Dropdown */}
            <div className="navbar__search-wrapper" ref={searchContainerRef}>
              <form className="navbar__search" onSubmit={handleSearchSubmit}>
                <svg className="navbar__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search movies..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (e.target.value.trim().length >= 2) setShowDropdown(true);
                  }}
                  onFocus={() => {
                    if (query.trim().length >= 2 && searchResults.length > 0) {
                      setShowDropdown(true);
                    }
                  }}
                  className="navbar__search-input"
                  aria-label="Search movies"
                />
                {query && (
                  <button
                    type="button"
                    className="navbar__search-clear"
                    onClick={() => {
                      setQuery('');
                      setSearchResults([]);
                      setShowDropdown(false);
                      inputRef.current?.focus();
                    }}
                    aria-label="Clear search"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </form>

              {/* Live search dropdown (Max 5 results) */}
              {showDropdown && query.trim().length >= 2 && (
                <div className="navbar__dropdown">
                  {isSearching ? (
                    <div className="navbar__dropdown-loading">
                      <span className="navbar__dropdown-spinner" />
                      <span>Mencari film...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <>
                      <div className="navbar__dropdown-list">
                        {searchResults.map((movie) => {
                          const poster = getImageUrl(movie.poster_path, 'w92');
                          const year = movie.release_date ? movie.release_date.slice(0, 4) : '—';
                          const rating = movie.vote_average ? movie.vote_average.toFixed(1) : null;

                          return (
                            <button
                              key={movie.id}
                              type="button"
                              className="navbar__dropdown-item"
                              onClick={() => handleSelectMovie(movie.id)}
                            >
                              {poster ? (
                                <img src={poster} alt={movie.title} className="navbar__dropdown-poster" />
                              ) : (
                                <div className="navbar__dropdown-poster navbar__dropdown-poster--empty">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                                    <line x1="7" y1="7" x2="17" y2="17" />
                                  </svg>
                                </div>
                              )}
                              <div className="navbar__dropdown-info">
                                <h4 className="navbar__dropdown-title">{movie.title}</h4>
                                <div className="navbar__dropdown-meta">
                                  <span className="navbar__dropdown-year">{year}</span>
                                  {rating && (
                                    <span className="navbar__dropdown-rating">
                                      ★ {rating}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        className="navbar__dropdown-footer"
                        onClick={handleSearchSubmit}
                      >
                        Lihat semua hasil untuk "{query}" &rarr;
                      </button>
                    </>
                  ) : (
                    <div className="navbar__dropdown-empty">
                      Tidak ada film ditemukan
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Burger button — mobile only */}
          <button
            className={`navbar__burger${drawerOpen ? ' navbar__burger--active' : ''}`}
            onClick={() => setDrawerOpen((prev) => !prev)}
            aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={drawerOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      {/* Mobile drawer backdrop */}
      <div
        className={`navbar__backdrop${drawerOpen ? ' navbar__backdrop--visible' : ''}`}
        aria-hidden="true"
        onClick={() => setDrawerOpen(false)}
      />

      {/* Mobile drawer — slides in from right */}
      <aside
        ref={drawerRef}
        className={`navbar__drawer${drawerOpen ? ' navbar__drawer--open' : ''}`}
        aria-label="Navigation menu"
      >
        <div className="navbar__drawer-header">
          <span className="navbar__drawer-logo">Cineva</span>
          <button
            className="navbar__drawer-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Drawer search with live dropdown */}
        <div className="navbar__drawer-search-wrap">
          <form className="navbar__drawer-search" onSubmit={handleSearchSubmit}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search movies..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search movies"
            />
          </form>

          {/* Drawer Live Search Results */}
          {query.trim().length >= 2 && searchResults.length > 0 && (
            <div className="navbar__drawer-results">
              {searchResults.map((movie) => {
                const poster = getImageUrl(movie.poster_path, 'w92');
                const year = movie.release_date ? movie.release_date.slice(0, 4) : '—';
                const rating = movie.vote_average ? movie.vote_average.toFixed(1) : null;
                return (
                  <button
                    key={movie.id}
                    type="button"
                    className="navbar__dropdown-item"
                    onClick={() => handleSelectMovie(movie.id)}
                  >
                    {poster && <img src={poster} alt={movie.title} className="navbar__dropdown-poster" />}
                    <div className="navbar__dropdown-info">
                      <h4 className="navbar__dropdown-title">{movie.title}</h4>
                      <div className="navbar__dropdown-meta">
                        <span className="navbar__dropdown-year">{year}</span>
                        {rating && <span className="navbar__dropdown-rating">★ {rating}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Drawer links */}
        <nav className="navbar__drawer-links">
          <Link
            to="/"
            className={`navbar__drawer-link${location.pathname === '/' ? ' navbar__drawer-link--active' : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Home
          </Link>
          <Link
            to="/favorites"
            className={`navbar__drawer-link${location.pathname === '/favorites' ? ' navbar__drawer-link--active' : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            Favorites
          </Link>
        </nav>
      </aside>
    </>
  );
}
