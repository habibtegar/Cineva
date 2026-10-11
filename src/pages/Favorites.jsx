import MovieGrid from '../components/MovieGrid';
import { useAuth } from '../hooks/useAuth';
import './Favorites.css';

export default function Favorites({ favorites, toggleFavorite, isFavorite }) {
  const { user, loginWithGoogle } = useAuth();

  if (!user) {
    return (
      <div className="favorites-page page-container">
        <div className="favorites-page__header">
          <h1 className="favorites-page__heading">Favorites</h1>
        </div>
        <div className="favorites-page__empty">
          <div className="favorites-page__empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <p className="favorites-page__empty-title">Silakan login untuk menyimpan film</p>
          <p className="favorites-page__empty-sub">
            Masuk dengan akun Google Anda untuk melihat dan menyinkronkan film favorit.
          </p>
          <button
            type="button"
            className="favorites-page__login-btn"
            onClick={loginWithGoogle}
            style={{
              marginTop: '18px',
              padding: '11px 24px',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              color: '#09090b',
              fontWeight: 600,
              fontSize: '0.88rem',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
              transition: 'background-color 0.2s ease, transform 0.2s ease',
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            Login with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="favorites-page page-container">
      <div className="favorites-page__header">
        <h1 className="favorites-page__heading">Favorites</h1>
        {favorites.length > 0 && (
          <span className="favorites-page__count-badge">
            {favorites.length}
          </span>
        )}
      </div>

      {favorites.length === 0 ? (
        <div className="favorites-page__empty">
          <div className="favorites-page__empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <p className="favorites-page__empty-title">No favorites yet</p>
          <p className="favorites-page__empty-sub">
            Click the <strong>♥</strong> icon on any movie card to save it here.
          </p>
        </div>
      ) : (
        <MovieGrid
          movies={favorites}
          onToggleFavorite={toggleFavorite}
          isFavorite={isFavorite}
        />
      )}
    </div>
  );
}
