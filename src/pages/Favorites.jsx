import { useNavigate } from 'react-router-dom';
import MovieGrid from '../components/MovieGrid';
import { useAuth } from '../hooks/useAuth';
import './Favorites.css';

export default function Favorites({ favorites, toggleFavorite, isFavorite }) {
  const { user } = useAuth();
  const navigate = useNavigate();

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
            Masuk ke akun Anda untuk melihat dan menyinkronkan film favorit.
          </p>
          <button
            type="button"
            className="favorites-page__login-btn"
            onClick={() => navigate('/login')}
            style={{
              marginTop: '18px',
              padding: '11px 24px',
              borderRadius: '8px',
              backgroundColor: '#e50914',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.88rem',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 14px rgba(229, 9, 20, 0.4)',
              transition: 'background-color 0.2s ease, transform 0.2s ease',
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Masuk ke Akun Anda
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
