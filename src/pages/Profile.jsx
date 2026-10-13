import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import MovieCard from '../components/MovieCard';
import { SkeletonCard } from '../components/Skeleton';
import EditProfileModal from '../components/EditProfileModal';
import { useAuth } from '../hooks/useAuth';
import { useFavorites } from '../hooks/useFavorites';
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

  // Reset status avatar rusak jika photoURL pengguna diperbarui
  useEffect(() => {
    setBrokenAvatarUrl(null);
  }, [user?.photoURL]);

  // Dynamic Document Title: ubah judul tab browser untuk halaman Profile
  useEffect(() => {
    document.title = 'My Profile - Cineva';
  }, []);

  const avatarError = Boolean(brokenAvatarUrl && brokenAvatarUrl === user?.photoURL);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
                console.error("Gagal memuat foto avatar Profile:", user?.photoURL);
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
            <p className="profile-header__email">{user.email}</p>

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
          <h2 className="profile-content__title">Favorited Movies</h2>
        </div>

        {isLoading ? (
          <div className="movie-grid__list">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : favorites.length > 0 ? (
          <div className="movie-grid__list">
            {favorites.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onToggleFavorite={toggleFavorite}
                isFavorite={isFavorite ? isFavorite(movie.id) : true}
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
