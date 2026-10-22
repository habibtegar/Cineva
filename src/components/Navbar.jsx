import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
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
  const { user: authUser, logout } = useAuth();
  const [currentUser, setCurrentUser] = useState(authUser);

  // Sinkronkan dengan context user jika authUser berubah
  useEffect(() => {
    setCurrentUser(authUser);
  }, [authUser]);

  // Dengarkan perubahan data user secara langsung menggunakan listener onAuthStateChanged dari Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || '',
          emailVerified: firebaseUser.emailVerified,
        });
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const user = currentUser ?? authUser;

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [brokenAvatarUrl, setBrokenAvatarUrl] = useState(null);

  // Reset status avatar rusak jika URL foto user diperbarui
  useEffect(() => {
    setBrokenAvatarUrl(null);
  }, [user?.photoURL]);

  const avatarImgError = Boolean(brokenAvatarUrl && brokenAvatarUrl === user?.photoURL);
  const userInitial = (user?.displayName || user?.email || 'U').charAt(0).toUpperCase();

  const navigate = useNavigate();
  const location = useLocation();
  const isSearchPage = location.pathname === '/search';
  const inputRef = useRef(null);
  const mobileInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const mobileSearchDropdownRef = useRef(null);
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

  // Focus mobile input when search opens
  useEffect(() => {
    if (mobileSearchOpen) {
      const timer = setTimeout(() => {
        mobileInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [mobileSearchOpen]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
      if (profileContainerRef.current && !profileContainerRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
      if (
        mobileSearchDropdownRef.current &&
        !mobileSearchDropdownRef.current.contains(e.target) &&
        !e.target.closest('.navbar__mobile-search-btn')
      ) {
        setMobileSearchOpen(false);
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
    setMobileSearchOpen(false);
    setQuery('');
  }, [location.pathname, location.search]);

  // Scroll detection: deteksi apakah layar sudah di-scroll (window.scrollY > 10)
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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
        setMobileSearchOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const handleSelectMovie = (movieId) => {
    setShowDropdown(false);
    setShowProfileMenu(false);
    setMobileSearchOpen(false);
    setQuery('');
    setDrawerOpen(false);
    navigate(`/movie/${movieId}`);
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      setShowDropdown(false);
      setMobileSearchOpen(false);
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
      inputRef.current?.blur();
      mobileInputRef.current?.blur();
      setDrawerOpen(false);
    }
  };

  return (
    <>
      <nav
        className={`navbar fixed top-0 w-full z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#0f0f0f] border-b border-gray-800'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="navbar__inner flex justify-between items-center w-full">
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
                to="/actors"
                className={`navbar__link${location.pathname === '/actors' ? ' navbar__link--active' : ''}`}
              >
                Actors
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
              {!isSearchPage && (
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
              )}

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
                    {user?.photoURL && !avatarImgError ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'Profile'}
                        className="navbar__avatar-img"
                        referrerPolicy="no-referrer"
                        onError={() => setBrokenAvatarUrl(user?.photoURL)}
                      />
                    ) : (user?.displayName || user?.email) ? (
                      <span className="navbar__avatar-initial">
                        {userInitial}
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
                        {user?.photoURL && !avatarImgError ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName || 'Profile'}
                            className="navbar__avatar-img navbar__avatar-img--large"
                            referrerPolicy="no-referrer"
                            onError={() => setBrokenAvatarUrl(user?.photoURL)}
                          />
                        ) : (user?.displayName || user?.email) ? (
                          <span className="navbar__avatar-initial navbar__avatar-initial--large">
                            {userInitial}
                          </span>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        )}
                      </div>
                      <div className="navbar__profile-info min-w-0 flex-1">
                        <span
                          className="navbar__profile-name truncate max-w-[160px] block"
                          title={user ? user.displayName : 'Guest User'}
                        >
                          {user ? (user.displayName || 'User') : 'Guest User'}
                        </span>
                        <span
                          className="navbar__profile-status truncate max-w-[160px] block"
                          title={user ? user.email : 'Signed out'}
                        >
                          {user ? (user.email || 'Google Account') : 'Signed out'}
                        </span>
                      </div>
                    </div>

                    <div className="navbar__profile-divider" />

                    <div className="navbar__profile-menu-items">
                      <Link
                        to="/profile"
                        className="navbar__profile-menu-item"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        <span>My Profile</span>
                      </Link>

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
                          onClick={() => {
                            setShowProfileMenu(false);
                            navigate('/login');
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                            <polyline points="10 17 15 12 10 7" />
                            <line x1="15" y1="12" x2="3" y2="12" />
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

          {/* Mobile Actions: Search Icon + Hamburger Menu */}
          <div className="navbar__mobile-actions flex items-center gap-2 md:hidden">
            {!isSearchPage && (
              <button
                type="button"
                className={`navbar__mobile-search-btn${mobileSearchOpen ? ' navbar__mobile-search-btn--active' : ''}`}
                onClick={() => {
                  setMobileSearchOpen((prev) => !prev);
                  setDrawerOpen(false);
                }}
                aria-label={mobileSearchOpen ? 'Close search' : 'Open search'}
                title={mobileSearchOpen ? 'Close search' : 'Search movies'}
              >
                {mobileSearchOpen ? (
                  <svg
                    className="navbar__mobile-search-btn-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                ) : (
                  <svg
                    className="navbar__mobile-search-btn-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                )}
              </button>
            )}

            {/* Burger button — mobile only */}
            <button
              className={`navbar__burger${drawerOpen ? ' navbar__burger--active' : ''}`}
              onClick={() => {
                setDrawerOpen((prev) => !prev);
                setMobileSearchOpen(false);
              }}
              aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={drawerOpen}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        {/* Mobile Floating Search Dropdown */}
        {!isSearchPage && mobileSearchOpen && (
          <div
            className="navbar__mobile-search-dropdown"
            ref={mobileSearchDropdownRef}
          >
            <form
              className="navbar__mobile-search-form"
              onSubmit={handleSearchSubmit}
            >
              <svg
                className="navbar__mobile-search-form-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={mobileInputRef}
                type="text"
                placeholder="Search movies..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (e.target.value.trim().length >= 2) setShowDropdown(true);
                }}
                className="navbar__mobile-search-input"
                aria-label="Search movies"
              />
              {query && (
                <button
                  type="button"
                  className="navbar__mobile-search-clear"
                  onClick={() => {
                    setQuery('');
                    setSearchResults([]);
                    mobileInputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </form>

            {/* Live Search Results inside Mobile Dropdown */}
            {query.trim().length >= 2 && (
              <div className="navbar__mobile-search-results">
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
                        const year = movie.release_date
                          ? movie.release_date.slice(0, 4)
                          : '—';
                        const rating = movie.vote_average
                          ? movie.vote_average.toFixed(1)
                          : null;

                        return (
                          <button
                            key={movie.id}
                            type="button"
                            className="navbar__dropdown-item"
                            onClick={() => {
                              handleSelectMovie(movie.id);
                              setMobileSearchOpen(false);
                            }}
                          >
                            {poster ? (
                              <img
                                src={poster}
                                alt={movie.title}
                                className="navbar__dropdown-poster"
                              />
                            ) : (
                              <div className="navbar__dropdown-poster navbar__dropdown-poster--empty">
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                >
                                  <rect
                                    x="2"
                                    y="2"
                                    width="20"
                                    height="20"
                                    rx="2.18"
                                    ry="2.18"
                                  />
                                  <line x1="7" y1="7" x2="17" y2="17" />
                                </svg>
                              </div>
                            )}
                            <div className="navbar__dropdown-info">
                              <h4 className="navbar__dropdown-title">
                                {movie.title}
                              </h4>
                              <div className="navbar__dropdown-meta">
                                <span className="navbar__dropdown-year">
                                  {year}
                                </span>
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
        )}
      </nav>

      {/* Mobile drawer backdrop overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity duration-300 cursor-pointer ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
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

        {/* Mobile user profile bar */}
        <div className="navbar__drawer-user">
          <div className="navbar__avatar navbar__avatar--drawer">
            {user?.photoURL && !avatarImgError ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Profile'}
                className="navbar__avatar-img"
                referrerPolicy="no-referrer"
                onError={() => setBrokenAvatarUrl(user?.photoURL)}
              />
            ) : (user?.displayName || user?.email) ? (
              <span className="navbar__avatar-initial">
                {userInitial}
              </span>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </div>
          <div className="navbar__drawer-user-info min-w-0 flex-1">
            <span
              className="navbar__drawer-user-name truncate block"
              title={user ? user.displayName : 'Guest User'}
            >
              {user ? (user.displayName || 'User') : 'Guest User'}
            </span>
            <span
              className="navbar__drawer-user-status truncate block"
              title={user ? user.email : 'Google Account'}
            >
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
              Sign Out
            </button>
          ) : (
            <button
              type="button"
              className="navbar__drawer-login-btn"
              onClick={() => {
                setDrawerOpen(false);
                navigate('/login');
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
          <Link
            to="/actors"
            className={`navbar__drawer-link${location.pathname === '/actors' ? ' navbar__drawer-link--active' : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Actors
          </Link>
          <Link
            to="/profile"
            className={`navbar__drawer-link${location.pathname === '/profile' ? ' navbar__drawer-link--active' : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Profile
          </Link>
        </nav>
      </aside>
    </>
  );
}
