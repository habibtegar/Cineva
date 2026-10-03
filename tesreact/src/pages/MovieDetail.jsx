import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import CastCard from '../components/CastCard';
import MovieGrid from '../components/MovieGrid';
import TrailerModal from '../components/TrailerModal';
import { SkeletonDetail } from '../components/Skeleton';
import ErrorState from '../components/ErrorState';
import { getMovieDetail, getBackdropUrl, getImageUrl } from '../services/tmdb';
import './MovieDetail.css';

export default function MovieDetail({ toggleFavorite, isFavorite }) {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trailerOpen, setTrailerOpen] = useState(false);

  const fetchMovie = () => {
    setLoading(true);
    setError(null);
    getMovieDetail(id)
      .then((data) => setMovie(data))
      .catch((err) => {
        console.error('Failed to fetch movie detail:', err);
        setError('Could not load movie details.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMovie();
  }, [id]);

  if (loading) return <SkeletonDetail />;

  if (error) {
    return (
      <div className="page-container" style={{ paddingTop: 100 }}>
        <ErrorState message={error} onRetry={fetchMovie} />
      </div>
    );
  }

  if (!movie) return null;

  const backdrop = getBackdropUrl(movie.backdrop_path, 'original');
  const poster = getImageUrl(movie.poster_path, 'w500');
  const year = movie.release_date ? movie.release_date.slice(0, 4) : '—';
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
  const voteCount = movie.vote_count ? movie.vote_count.toLocaleString() : null;
  const runtime = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : null;
  const genres = movie.genres ? movie.genres.map((g) => g.name) : [];
  const cast = movie.credits?.cast?.slice(0, 14) || [];
  const similar = movie.similar?.results?.slice(0, 6) || [];

  const trailer = movie.videos?.results?.find(
    (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
  );

  const fav = isFavorite ? isFavorite(movie.id) : false;

  return (
    <div className="detail">
      {/* Backdrop */}
      <div className="detail__backdrop">
        {backdrop && <img src={backdrop} alt="" className="detail__backdrop-img" />}
        <div className="detail__backdrop-gradient-side" />
        <div className="detail__backdrop-gradient-bottom" />
      </div>

      {/* Main content */}
      <div className="detail__body page-container">
        <div className="detail__top">
          {poster && (
            <img src={poster} alt={movie.title} className="detail__poster" />
          )}

          <div className="detail__info">
            <h1 className="detail__title">{movie.title}</h1>
            {movie.tagline && (
              <p className="detail__tagline">{movie.tagline}</p>
            )}

            <div className="detail__meta">
              {year && <span className="detail__meta-pill">{year}</span>}
              {runtime && <span className="detail__meta-pill">{runtime}</span>}
              <span className="detail__meta-pill detail__meta-pill--rating">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {rating}
                {voteCount && <span className="detail__vote-count">({voteCount})</span>}
              </span>
            </div>

            {genres.length > 0 && (
              <div className="detail__genres">
                {genres.map((g) => (
                  <span key={g} className="detail__genre">{g}</span>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="detail__actions">
              {trailer && (
                <button
                  className="detail__action-btn detail__action-btn--play"
                  onClick={() => setTrailerOpen(true)}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Watch Trailer
                </button>
              )}
              {toggleFavorite && (
                <button
                  className={`detail__action-btn detail__action-btn--fav${fav ? ' detail__action-btn--fav-active' : ''}`}
                  onClick={() => toggleFavorite(movie)}
                >
                  <svg viewBox="0 0 24 24" fill={fav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  {fav ? 'Saved' : 'Add to Favorites'}
                </button>
              )}
            </div>

            {movie.overview && (
              <div className="detail__overview">
                <h2 className="detail__section-title">Overview</h2>
                <p>{movie.overview}</p>
              </div>
            )}
          </div>
        </div>

        {/* Cast */}
        {cast.length > 0 && (
          <section className="detail__cast">
            <h2 className="detail__section-title">Cast</h2>
            <div className="detail__cast-list">
              {cast.map((person) => (
                <CastCard key={person.credit_id || person.id} person={person} />
              ))}
            </div>
          </section>
        )}

        {/* Similar Movies */}
        {similar.length > 0 && (
          <MovieGrid
            title="More Like This"
            movies={similar}
            onToggleFavorite={toggleFavorite}
            isFavorite={isFavorite}
          />
        )}
      </div>

      {/* Trailer modal */}
      {trailerOpen && trailer && (
        <TrailerModal
          trailerKey={trailer.key}
          title={movie.title}
          onClose={() => setTrailerOpen(false)}
        />
      )}
    </div>
  );
}
