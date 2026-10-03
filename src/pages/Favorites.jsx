import MovieGrid from '../components/MovieGrid';
import './Favorites.css';

export default function Favorites({ favorites, toggleFavorite, isFavorite }) {
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
