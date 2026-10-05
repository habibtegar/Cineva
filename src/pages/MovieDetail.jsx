import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import CastCard from '../components/CastCard';
import MovieGrid from '../components/MovieGrid';
import TrailerModal from '../components/TrailerModal';
import { SkeletonDetail } from '../components/Skeleton';
import ErrorState from '../components/ErrorState';
import { getMovieDetail, getBackdropUrl, getImageUrl } from '../services/tmdb';
import './MovieDetail.css';

// Avatar helper for reviews
function getAvatarUrl(path) {
  if (!path) return null;
  if (path.startsWith('/http')) return path.slice(1);
  if (path.startsWith('http')) return path;
  return `https://image.tmdb.org/t/p/w185${path}`;
}

// Format review date
function formatReviewDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr.slice(0, 10);
  }
}

// Review card subcomponent with Read More toggle
function ReviewItem({ review }) {
  const [expanded, setExpanded] = useState(false);
  const authorName = review.author_details?.name || review.author || 'Anonymous';
  const rating = review.author_details?.rating;
  const avatar = getAvatarUrl(review.author_details?.avatar_path);
  const content = review.content || '';
  const isLong = content.length > 320;
  const displayContent = isLong && !expanded ? `${content.slice(0, 320)}...` : content;

  return (
    <div className="detail__review-card">
      <div className="detail__review-header">
        <div className="detail__review-author-info">
          {avatar ? (
            <img src={avatar} alt={authorName} className="detail__review-avatar" />
          ) : (
            <div className="detail__review-avatar detail__review-avatar--placeholder">
              {authorName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h4 className="detail__review-author">{authorName}</h4>
            <span className="detail__review-date">{formatReviewDate(review.created_at)}</span>
          </div>
        </div>

        {rating && (
          <div className="detail__review-rating">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span>{rating} / 10</span>
          </div>
        )}
      </div>

      <p className="detail__review-content">{displayContent}</p>

      {isLong && (
        <button
          type="button"
          className="detail__review-readmore"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show Less' : 'Read More'}
        </button>
      )}
    </div>
  );
}

export default function MovieDetail({ toggleFavorite, isFavorite }) {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = window.location.href;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

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
  const reviews = movie.reviews?.results || [];

  // Filter crew: Director (job === 'Director') & Writer (department === 'Writing' || job === 'Writer')
  const crew = movie.credits?.crew || [];
  const directors = crew
    .filter((person) => person.job === 'Director')
    .reduce((acc, curr) => {
      if (!acc.some((p) => p.name === curr.name)) acc.push(curr);
      return acc;
    }, []);

  const writers = crew
    .filter((person) => person.department === 'Writing' || person.job === 'Writer')
    .reduce((acc, curr) => {
      if (!acc.some((p) => p.name === curr.name)) acc.push(curr);
      return acc;
    }, []);

  // Format currency (USD)
  const formatCurrency = (amount) => {
    if (!amount || amount <= 0) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format language code to display name
  const getLanguageName = (code) => {
    if (!code) return '—';
    try {
      const displayNames = new Intl.DisplayNames(['id', 'en'], { type: 'language' });
      return displayNames.of(code) || code.toUpperCase();
    } catch {
      return code.toUpperCase();
    }
  };

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
          <div className="detail__left-col">
            {poster && (
              <img src={poster} alt={movie.title} className="detail__poster" />
            )}

            {/* Sidebar / Movie Facts */}
            <div className="detail__sidebar">
              <h3 className="detail__sidebar-title">Movie Facts</h3>
              <div className="detail__sidebar-list">
                <div className="detail__sidebar-item">
                  <span className="detail__sidebar-label">Status</span>
                  <span className="detail__sidebar-value">{movie.status || '—'}</span>
                </div>
                <div className="detail__sidebar-item">
                  <span className="detail__sidebar-label">Original Language</span>
                  <span className="detail__sidebar-value">
                    {getLanguageName(movie.original_language)}
                    <span className="detail__sidebar-sub">({movie.original_language?.toUpperCase() || '—'})</span>
                  </span>
                </div>
                <div className="detail__sidebar-item">
                  <span className="detail__sidebar-label">Budget</span>
                  <span className="detail__sidebar-value">{formatCurrency(movie.budget)}</span>
                </div>
                <div className="detail__sidebar-item">
                  <span className="detail__sidebar-label">Revenue</span>
                  <span className="detail__sidebar-value">{formatCurrency(movie.revenue)}</span>
                </div>
              </div>
            </div>
          </div>

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
              <button
                className={`detail__action-btn detail__action-btn--share${copied ? ' detail__action-btn--copied' : ''}`}
                onClick={handleShare}
                title="Share link to this movie"
              >
                {copied ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Link Copied!
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    Share
                  </>
                )}
              </button>
            </div>

            {movie.overview && (
              <div className="detail__overview">
                <h2 className="detail__section-title">Overview</h2>
                <p>{movie.overview}</p>
              </div>
            )}

            {/* Key Crew: Director & Writer */}
            {(directors.length > 0 || writers.length > 0) && (
              <div className="detail__crew">
                {directors.length > 0 && (
                  <div className="detail__crew-item">
                    <span className="detail__crew-role">Director</span>
                    <span className="detail__crew-name">
                      {directors.map((d) => d.name).join(', ')}
                    </span>
                  </div>
                )}
                {writers.length > 0 && (
                  <div className="detail__crew-item">
                    <span className="detail__crew-role">Writer</span>
                    <span className="detail__crew-name">
                      {writers.map((w) => w.name).join(', ')}
                    </span>
                  </div>
                )}
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

        {/* Reviews / Ulasan Penonton */}
        <section className="detail__reviews">
          <h2 className="detail__section-title">
            Reviews
            {reviews.length > 0 && (
              <span className="detail__reviews-count">({reviews.length})</span>
            )}
          </h2>

          {reviews.length > 0 ? (
            <div className="detail__reviews-list">
              {reviews.map((review) => (
                <ReviewItem key={review.id} review={review} />
              ))}
            </div>
          ) : (
            <div className="detail__no-reviews">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <p>Belum ada ulasan untuk film ini.</p>
            </div>
          )}
        </section>

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

      {/* Toast Notification */}
      {copied && (
        <div className="detail__toast">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Link film berhasil disalin!</span>
        </div>
      )}
    </div>
  );
}
