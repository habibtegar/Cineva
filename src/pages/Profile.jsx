import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { sendEmailVerification } from 'firebase/auth';
import toast from 'react-hot-toast';
import MovieCard from '../components/MovieCard';
import { SkeletonCard } from '../components/Skeleton';
import EditProfileModal from '../components/EditProfileModal';
import { useAuth } from '../hooks/useAuth';
import { useFavorites } from '../hooks/useFavorites';
import { auth } from '../services/firebase';
import { getAuthErrorMessage } from '../utils/authErrors';
import '../components/MovieGrid.css';
import './Profile.css';

export default function Profile({
  favorites: propFavorites,
  toggleFavorite: propToggleFavorite,
  isFavorite: propIsFavorite,
  loading: propLoading,
}) {
  const { user, logout } = useAuth();
  const fallbackFavoritesHook = useFavorites();
  const navigate = useNavigate();
  const [brokenAvatarUrl, setBrokenAvatarUrl] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [sortBy, setSortBy] = useState('recently_added');

  // Reset status avatar rusak jika photoURL pengguna diperbarui
  useEffect(() => {
    setBrokenAvatarUrl(null);
  }, [user?.photoURL]);

  // Dynamic Document Title: ubah judul tab browser untuk halaman Profile
  useEffect(() => {
    document.title = 'My Profile - Cineva';
  }, []);

  const avatarError = Boolean(brokenAvatarUrl && brokenAvatarUrl === user?.photoURL);

  // Prefer props passed from App.jsx, fallback to hook directly
  const favorites = propFavorites ?? fallbackFavoritesHook.favorites;
  const toggleFavorite = propToggleFavorite ?? fallbackFavoritesHook.toggleFavorite;
  const isFavorite = propIsFavorite ?? fallbackFavoritesHook.isFavorite;
  const isLoading = propLoading ?? fallbackFavoritesHook.loading;

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const displayName = user?.displayName || 'Pengguna Cineva';
  const userInitial = displayName.charAt(0).toUpperCase() || 'U';
  const favoritesCount = favorites.length;

  // Tanggal bergabung dari metadata Firebase (user.metadata.creationTime)
  const memberSince = useMemo(() => {
    const rawCreationTime =
      user?.metadata?.creationTime || auth.currentUser?.metadata?.creationTime;
    if (!rawCreationTime) return null;
    try {
      const date = new Date(rawCreationTime);
      if (isNaN(date.getTime())) return null;
      const month = date.toLocaleString('en-US', { month: 'long' });
      const year = date.getFullYear();
      return `Member since ${month} ${year}`;
    } catch {
      return null;
    }
  }, [user?.metadata?.creationTime]);

  const isVerified = Boolean(user?.emailVerified ?? auth.currentUser?.emailVerified);

  const handleSendVerification = async () => {
    if (!auth.currentUser) return;
    setIsSendingVerification(true);
    try {
      await sendEmailVerification(auth.currentUser);
      toast.success('Verification email sent! Check your inbox or spam folder.');
    } catch (err) {
      console.error('Failed to send verification email:', err);
      toast.error(getAuthErrorMessage(err) || 'Failed to send verification email.');
    } finally {
      setIsSendingVerification(false);
    }
  };

  // Penyortiran kartu film favorit secara real-time
  const sortedFavorites = useMemo(() => {
    if (!favorites || favorites.length === 0) return [];
    const list = [...favorites];
    switch (sortBy) {
      case 'highest_rating':
        return list.sort((a, b) => {
          const ratingA = Number(a.vote_average) || 0;
          const ratingB = Number(b.vote_average) || 0;
          return ratingB - ratingA;
        });
      case 'release_date':
        return list.sort((a, b) => {
          const dateA = a.release_date ? new Date(a.release_date).getTime() : 0;
          const dateB = b.release_date ? new Date(b.release_date).getTime() : 0;
          return dateB - dateA;
        });
      case 'title_asc':
        return list.sort((a, b) => {
          const titleA = (a.title || a.name || '').toLowerCase();
          const titleB = (b.title || b.name || '').toLowerCase();
          return titleA.localeCompare(titleB);
        });
      case 'recently_added':
      default:
        return list;
    }
  }, [favorites, sortBy]);

  // Unauthenticated View
  if (!user) {
    return (
      <div className="profile-page page-container">
        <div className="profile-empty">
          <div className="profile-empty__icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h2 className="profile-empty__title">Silakan login untuk melihat profil</h2>
          <p className="profile-empty__desc">
            Masuk ke akun Anda untuk mengakses profil dan menyinkronkan film favorit Anda.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="profile-empty__btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            <span>Masuk ke Akun Anda</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page page-container">
      {/* Header Profil (Clean & Minimalist) */}
      <header className="profile-header">
        <div className="profile-header__avatar">
          {user.photoURL && !avatarError ? (
            <img
              src={user.photoURL}
              alt={displayName}
              className="profile-header__avatar-img"
              referrerPolicy="no-referrer"
              onError={() => {
                console.error('Gagal memuat foto avatar Profile:', user?.photoURL);
                setBrokenAvatarUrl(user?.photoURL);
              }}
            />
          ) : (
            <span className="profile-header__avatar-initial">
              {userInitial}
            </span>
          )}
        </div>

        <div className="profile-header__body">
          <div className="profile-header__info">
            <h1 className="profile-header__name">{displayName}</h1>

            {/* Email & Status Badge */}
            <div className="profile-header__email-row">
              <span className="profile-header__email">{user.email}</span>
              {isVerified ? (
                <span className="profile-header__badge profile-header__badge--verified" title="Email is verified">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Verified</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendVerification}
                  disabled={isSendingVerification}
                  className="profile-header__verify-btn"
                  title="Send verification email"
                >
                  {isSendingVerification ? (
                    <>
                      <span className="profile-spinner-mini" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                      <span>Verify Email</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Member Since (dari metadata Firebase) */}
            {memberSince && (
              <p className="profile-header__member-since">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>{memberSince}</span>
              </p>
            )}

            {/* Statistik Murni dari Firestore */}
            <div className="profile-header__stat">
              <span className="profile-header__stat-count">{favoritesCount}</span>
              <span className="profile-header__stat-label">
                {favoritesCount === 1 ? 'Favorited Movie' : 'Favorited Movies'}
              </span>
            </div>
          </div>

          <div className="profile-header__actions flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="profile-header__edit-btn"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>Edit Profile</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="profile-header__signout-btn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Daftar Film Favorit — Menggunakan Card & Grid Asli Home */}
      <section className="profile-content">
        <div className="profile-content__header">
          <div className="profile-content__title-wrap">
            <h2 className="profile-content__title">Favorited Movies</h2>
            {favorites.length > 0 && (
              <span className="profile-content__count-badge">{favorites.length}</span>
            )}
          </div>

          {favorites.length > 0 && (
            <div className="profile-sort">
              <label htmlFor="profile-sort-select" className="profile-sort__label">
                <svg className="profile-sort__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M6 12h12m-9 6h6" />
                </svg>
                <span className="profile-sort__label-text">Sort by:</span>
              </label>
              <div className="profile-sort__select-wrapper">
                <select
                  id="profile-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="profile-sort__select"
                  aria-label="Sort favorited movies"
                >
                  <option value="recently_added">Recently Added</option>
                  <option value="highest_rating">Highest Rating</option>
                  <option value="release_date">Release Date</option>
                  <option value="title_asc">Title (A–Z)</option>
                </select>
                <svg className="profile-sort__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="movie-grid__list grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : sortedFavorites.length > 0 ? (
          <div className="movie-grid__list grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
            {sortedFavorites.map((movie) => (
              <MovieCard
                key={`${movie.media_type || 'movie'}-${movie.id}`}
                movie={movie}
                onToggleFavorite={toggleFavorite}
                isFavorite={isFavorite ? isFavorite(movie.id, movie.media_type || (movie.name ? 'tv' : 'movie')) : true}
              />
            ))}
          </div>
        ) : (
          <div className="profile-empty">
            <div className="profile-empty__icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <h3 className="profile-empty__title">Belum ada film favorit yang disimpan.</h3>
            <p className="profile-empty__desc">
              Jelajahi film di halaman utama dan klik ikon hati pada poster untuk menyimpannya ke profil Anda.
            </p>
            <Link to="/" className="profile-empty__btn">
              Jelajahi Film
            </Link>
          </div>
        )}
      </section>

      {/* Modal Edit Profil */}
      {isEditModalOpen && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </div>
  );
}
