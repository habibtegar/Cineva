import { Link } from 'react-router-dom';
import { getImageUrl } from '../services/tmdb';
import './MovieCard.css';

export default function MovieCard({ movie, onToggleFavorite, isFavorite }) {
  const year = movie.release_date ? movie.release_date.slice(0, 4) : '—';
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
  const poster = getImageUrl(movie.poster_path, 'w342');

  const handleFavClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleFavorite) onToggleFavorite(movie);
  };

  return (
    <div className="movie-card">
      <Link to={`/movie/${movie.id}`} className="movie-card__poster-link" tabIndex={0}>
        {poster ? (
          <img
            src={poster}
            alt={movie.title}
            className="movie-card__poster"
            loading="lazy"
          />
        ) : (
          <div className="movie-card__no-poster">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="movie-card__overlay" />

        {/* Rating badge — top-left, always visible */}
        <div className="movie-card__rating-badge" aria-label={`Rating: ${rating}`}>
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          {rating}
        </div>
      </Link>

      {/* Favorite button — top-right, standardized */}
      <button
        type="button"
        className={`movie-card__fav${isFavorite ? ' movie-card__fav--active' : ''}`}
        onClick={handleFavClick}
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        aria-pressed={isFavorite}
      >
        <svg
          viewBox="0 0 24 24"
          fill={isFavorite ? '#ef4444' : 'none'}
          stroke={isFavorite ? '#ef4444' : '#ffffff'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>

      {/* Card info */}
      <div className="movie-card__info">
        <h3 className="movie-card__title line-clamp-1" title={movie.title}>
          {movie.title}
        </h3>
        {/* Year — higher contrast #9ca3af text-xs */}
        <p className="movie-card__year text-gray-400 text-xs">{year}</p>
      </div>
    </div>
  );
}
