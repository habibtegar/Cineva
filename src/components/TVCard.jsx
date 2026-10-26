import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getImageUrl } from '../services/tmdb';
import './MovieCard.css';

export default function TVCard({ show, onToggleFavorite, isFavorite }) {
  const [imgError, setImgError] = useState(false);
  const year = show.first_air_date ? show.first_air_date.slice(0, 4) : '—';
  const hasRating = typeof show.vote_average === 'number' && show.vote_average > 0;
  const ratingText = hasRating ? show.vote_average.toFixed(1) : '-';
  const poster = !imgError && show.poster_path ? getImageUrl(show.poster_path, 'w342') : null;

  // Normalized item for Favorites collection
  const tvItem = {
    ...show,
    id: show.id,
    title: show.name,
    poster_path: show.poster_path,
    release_date: show.first_air_date,
    vote_average: show.vote_average,
    media_type: 'tv',
  };

  const isFav =
    typeof isFavorite === 'function'
      ? isFavorite(show.id, 'tv')
      : Boolean(isFavorite);

  const handleFavClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(tvItem, 'tv');
    }
  };

  return (
    <div className="movie-card transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-red-500/20 cursor-pointer hover:z-10 group/card">
      <Link to={`/tv/${show.id}`} className="movie-card__poster-link" tabIndex={0}>
        {poster ? (
          <img
            src={poster}
            alt={show.name}
            className="movie-card__poster"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-t from-zinc-950 via-zinc-900 to-zinc-800 flex flex-col justify-between p-3 select-none relative overflow-hidden border border-zinc-800/60">
            {/* Logo teks kecil Cineva di atas */}
            <div className="flex items-center justify-center w-full pt-7">
              <span className="text-[10px] font-black tracking-widest text-red-500 uppercase flex items-center gap-1 drop-shadow-sm">
                Cineva TV<span className="inline-block w-1 h-1 rounded-full bg-red-500" />
              </span>
            </div>

            {/* Judul serial di bagian tengah */}
            <div className="my-auto py-2 text-center flex flex-col items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-zinc-400 mb-2 shadow-inner">
                <svg className="w-4 h-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
                  <polyline points="17 2 12 7 7 2" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-zinc-200 line-clamp-3 leading-snug px-1">
                {show.name}
              </p>
            </div>

            {/* Spacing penyeimbang bawah */}
            <div className="h-2" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="movie-card__overlay" />

        {/* Rating badge — top-left */}
        <div
          className={`movie-card__rating-badge${
            !hasRating ? ' movie-card__rating-badge--na bg-zinc-800/80 text-zinc-400 border border-zinc-700/50' : ''
          }`}
          aria-label={hasRating ? `Rating: ${ratingText}` : 'Rating: Not available'}
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className={hasRating ? 'text-amber-400' : 'text-zinc-400'}
            aria-hidden="true"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span>{hasRating ? ratingText : '-'}</span>
        </div>
      </Link>

      {/* Floating Heart Button — top-right with identical design & Firestore toggle */}
      <button
        type="button"
        className={`movie-card__fav${isFav ? ' movie-card__fav--active' : ''}`}
        onClick={handleFavClick}
        aria-label={isFav ? `Remove ${show.name} from favorites` : `Add ${show.name} to favorites`}
        aria-pressed={isFav}
      >
        <svg
          viewBox="0 0 24 24"
          fill={isFav ? '#ef4444' : 'none'}
          stroke={isFav ? '#ef4444' : '#ffffff'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>

      {/* Card Info */}
      <div className="movie-card__info">
        <h3 className="movie-card__title line-clamp-1" title={show.name}>
          <Link to={`/tv/${show.id}`} className="hover:text-red-400 transition-colors">
            {show.name}
          </Link>
        </h3>
        <p className="movie-card__year text-gray-400 text-xs flex items-center gap-1.5">
          <span>{year}</span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-400">TV Series</span>
        </p>
      </div>
    </div>
  );
}
