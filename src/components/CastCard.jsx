import { Link } from 'react-router-dom';
import { getImageUrl } from '../services/tmdb';
import './CastCard.css';

export default function CastCard({ person }) {
  const photo = getImageUrl(person.profile_path, 'w185');

  return (
    <Link to={`/person/${person.id}`} className="cast-card">
      {photo ? (
        <img src={photo} alt={person.name} className="cast-card__photo" loading="lazy" />
      ) : (
        <div className="cast-card__no-photo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      )}
      <p className="cast-card__name">{person.name}</p>
      <p className="cast-card__character">{person.character}</p>
    </Link>
  );
}
