import { useNavigate, Link } from 'react-router-dom';
import MovieCard from '../components/MovieCard';
import { useAuth } from '../hooks/useAuth';
import { useFavorites } from '../hooks/useFavorites';
import '../components/MovieGrid.css';
import './Profile.css';

export default function Profile({
  favorites: propFavorites,
  toggleFavorite: propToggleFavorite,
  isFavorite: propIsFavorite,
}) {
  const { user, logout, loginWithGoogle } = useAuth();
  const fallbackFavoritesHook = useFavorites();
  const navigate = useNavigate();

  // Prefer props passed from App.jsx, fallback to hook directly
  const favorites = propFavorites ?? fallbackFavoritesHook.favorites;
  const toggleFavorite = propToggleFavorite ?? fallbackFavoritesHook.toggleFavorite;
  const isFavorite = propIsFavorite ?? fallbackFavoritesHook.isFavorite;
  const loading = fallbackFavoritesHook.loading;

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
            Masuk dengan akun Google Anda untuk mengakses profil dan menyinkronkan film favorit Anda.
          </p>
          <button
            type="button"
            onClick={loginWithGoogle}
            className="profile-empty__btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            <span>Sign In dengan Google</span>
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
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={displayName}
              className="profile-header__avatar-img"
              referrerPolicy="no-referrer"
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

          <div className="profile-header__actions">
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

        {loading ? (
          <div className="movie-grid__list">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="profile-skeleton" />
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
            <h3 className="profile-empty__title">Belum ada film favorit</h3>
            <p className="profile-empty__desc">
              Jelajahi film di halaman utama dan klik ikon hati pada poster untuk menyimpannya ke profil Anda.
            </p>
            <Link to="/" className="profile-empty__btn">
              Jelajahi Film
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
