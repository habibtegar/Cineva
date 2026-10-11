import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { searchMovies, getImageUrl } from '../services/tmdb';
import { useAuth } from '../hooks/useAuth';
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
  const { user, loginWithGoogle, logout } = useAuth();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const profileContainerRef = useRef(null);
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

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
      if (profileContainerRef.current && !profileContainerRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdowns and drawer when route changes
  useEffect(() => {
    setDrawerOpen(false);
    setShowDropdown(false);
    setShowProfileMenu(false);
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
        setShowProfileMenu(false);
        setDrawerOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const handleSelectMovie = (movieId) => {
    setShowDropdown(false);
    setShowProfileMenu(false);
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

            <div className="navbar__actions">
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
                        <span>Searching movies...</span>
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
                          See all results for "{query}" &rarr;
                        </button>
                      </>
                    ) : (
                      <div className="navbar__dropdown-empty">
                        No movies found
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Profile / Avatar Indicator */}
              <div className="navbar__profile-wrapper" ref={profileContainerRef}>
                <button
                  type="button"
                  className={`navbar__profile-btn${showProfileMenu ? ' navbar__profile-btn--active' : ''}`}
                  onClick={() => setShowProfileMenu((prev) => !prev)}
                  aria-label="User account profile"
                  aria-expanded={showProfileMenu}
                  aria-haspopup="true"
                  title={user ? (user.displayName || user.email) : 'Profile & Account'}
                >
                  <div className="navbar__avatar">
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'Profile'}
                        className="navbar__avatar-img"
                        referrerPolicy="no-referrer"
                      />
                    ) : user?.displayName ? (
                      <span className="navbar__avatar-initial">
                        {user.displayName.charAt(0).toUpperCase()}
                      </span>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="navbar__avatar-icon">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    )}
                  </div>
                </button>

                {/* Profile / Account Dropdown Menu */}
                {showProfileMenu && (
                  <div className="navbar__profile-dropdown">
                    <div className="navbar__profile-header">
                      <div className="navbar__avatar navbar__avatar--large">
                        {user?.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName || 'Profile'}
                            className="navbar__avatar-img navbar__avatar-img--large"
                            referrerPolicy="no-referrer"
                          />
                        ) : user?.displayName ? (
                          <span className="navbar__avatar-initial navbar__avatar-initial--large">
                            {user.displayName.charAt(0).toUpperCase()}
                          </span>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        )}
                      </div>
                      <div className="navbar__profile-info">
                        <span className="navbar__profile-name" title={user ? user.displayName : 'Guest User'}>
                          {user ? (user.displayName || 'User') : 'Guest User'}
                        </span>
                        <span className="navbar__profile-status" title={user ? user.email : 'Signed out'}>
                          {user ? (user.email || 'Google Account') : 'Signed out'}
                        </span>
                      </div>
                    </div>

                    <div className="navbar__profile-divider" />

                    <div className="navbar__profile-menu-items">
                      <Link
                        to="/favorites"
                        className="navbar__profile-menu-item"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        <span>Favorites</span>
                      </Link>

                      <div className="navbar__profile-divider" />

                      {user ? (
                        <button
                          type="button"
                          className="navbar__profile-login-btn navbar__profile-login-btn--logout"
                          onClick={async () => {
                            try {
                              await logout();
                              setShowProfileMenu(false);
                            } catch (err) {
                              console.error('Logout error:', err);
                            }
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                          </svg>
                          <span>Logout / Sign Out</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="navbar__profile-login-btn"
                          onClick={async () => {
                            try {
                              await loginWithGoogle();
                              setShowProfileMenu(false);
                            } catch (err) {
                              console.error('Login error:', err);
                            }
                          }}
                        >
                          <svg className="navbar__google-icon" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                          </svg>
                          <span>Login / Sign In</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
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

        {/* Mobile user profile bar */}
        <div className="navbar__drawer-user">
          <div className="navbar__avatar navbar__avatar--drawer">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Profile'}
                className="navbar__avatar-img"
                referrerPolicy="no-referrer"
              />
            ) : user?.displayName ? (
              <span className="navbar__avatar-initial">
                {user.displayName.charAt(0).toUpperCase()}
              </span>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </div>
          <div className="navbar__drawer-user-info">
            <span className="navbar__drawer-user-name">
              {user ? (user.displayName || 'User') : 'Guest User'}
            </span>
            <span className="navbar__drawer-user-status">
              {user ? (user.email || 'Google Account') : 'Cineva Free'}
            </span>
          </div>
          {user ? (
            <button
              type="button"
              className="navbar__drawer-login-btn navbar__drawer-login-btn--logout"
              onClick={async () => {
                try {
                  await logout();
                  setDrawerOpen(false);
                } catch (err) {
                  console.error('Logout error:', err);
                }
              }}
            >
              Logout
            </button>
          ) : (
            <button
              type="button"
              className="navbar__drawer-login-btn"
              onClick={async () => {
                try {
                  await loginWithGoogle();
                  setDrawerOpen(false);
                } catch (err) {
                  console.error('Login error:', err);
                }
              }}
            >
              Login
            </button>
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
