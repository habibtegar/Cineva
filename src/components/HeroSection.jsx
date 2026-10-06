import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getBackdropUrl } from '../services/tmdb';
import './HeroSection.css';

export default function HeroSection({ movie, genres = [], onWatchTrailer }) {
  const [imgLoaded, setImgLoaded] = useState(false);

  if (!movie) return null;

  const backdrop = getBackdropUrl(movie.backdrop_path, 'original');
  const year = movie.release_date ? movie.release_date.slice(0, 4) : '';
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '';

  // Resolve genre names
  const movieGenres = movie.genre_ids && genres.length > 0
    ? movie.genre_ids
        .map((id) => genres.find((g) => g.id === id)?.name)
        .filter(Boolean)
        .slice(0, 3)
    : movie.genres
      ? movie.genres.map((g) => g.name).slice(0, 3)
      : [];

  return (
    <section className="hero">
      <div className="hero__backdrop">
        {backdrop && (
          <img
            src={backdrop}
            alt=""
            className={`hero__backdrop-img${imgLoaded ? ' hero__backdrop-img--loaded' : ''}`}
            onLoad={() => setImgLoaded(true)}
          />
        )}
        <div className="hero__gradient-side" />
        <div className="hero__gradient-bottom" />
      </div>

      <div className="hero__content">
        <div className="hero__badges">
          {year && <span className="hero__badge">{year}</span>}
          {rating && (
            <span className="hero__badge hero__badge--rating">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {rating}
            </span>
          )}
          {movieGenres.map((genre) => (
            <span key={genre} className="hero__badge hero__badge--genre">
              {genre}
            </span>
          ))}
        </div>

        <h1 className="hero__title">{movie.title}</h1>

        <p className="hero__overview">
          {movie.overview
            ? movie.overview.length > 220
              ? movie.overview.slice(0, 220) + '...'
              : movie.overview
            : ''}
        </p>

        <div className="hero__actions">
          {onWatchTrailer && (
            <button className="hero__btn hero__btn--play" onClick={onWatchTrailer}>
              <svg className="hero__btn-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Watch Trailer
            </button>
          )}
          <Link to={`/movie/${movie.id}`} className="hero__btn hero__btn--secondary">
            <svg className="hero__btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            View Details
          </Link>
        </div>
      </div>
    </section>
  );
}
