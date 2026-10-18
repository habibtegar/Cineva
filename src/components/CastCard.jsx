import { Link } from 'react-router-dom';
import { getImageUrl } from '../services/tmdb';
import './CastCard.css';

export default function CastCard({ person, cast: propCast }) {
  const cast = propCast || person || {};
  const photo = getImageUrl(cast.profile_path, 'w185');

  return (
    <Link
      to={`/person/${cast.id}`}
      className="cast-card hover:scale-105 transition-all duration-200 cursor-pointer"
    >
      {photo ? (
        <img src={photo} alt={cast.name} className="cast-card__photo" loading="lazy" />
      ) : (
        <div className="cast-card__no-photo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      )}
      <p className="cast-card__name line-clamp-1" title={cast.name}>
        {cast.name}
      </p>
      <p className="cast-card__character line-clamp-1" title={cast.character}>
        {cast.character || '—'}
      </p>
    </Link>
  );
}

