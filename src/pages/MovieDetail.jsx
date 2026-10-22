import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CastCard from '../components/CastCard';
import MovieGrid from '../components/MovieGrid';
import TrailerModal from '../components/TrailerModal';
import { SkeletonDetail } from '../components/Skeleton';
import ErrorState from '../components/ErrorState';
import { getMovieDetail, getBackdropUrl, getImageUrl, getTrailerVideo } from '../services/tmdb';
import { useAuth } from '../hooks/useAuth';
import { db, auth } from '../services/firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import './MovieDetail.css';

// Avatar helper for reviews
function getAvatarUrl(path) {
  if (!path) return null;
  if (path.startsWith('/http')) return path.slice(1);
  if (path.startsWith('http')) return path;
  return `https://image.tmdb.org/t/p/w185${path}`;
}

// Format review date in English (e.g. Oct 14, 2026)
function formatReviewDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr.slice(0, 10);
  }
}

// Format Firestore timestamp to English date (e.g. Oct 22, 2026)
function formatCommunityDate(createdAt) {
  if (!createdAt) return 'Just now';
  try {
    let date;
    if (createdAt.toDate && typeof createdAt.toDate === 'function') {
      date = createdAt.toDate();
    } else if (createdAt.seconds) {
      date = new Date(createdAt.seconds * 1000);
    } else {
      date = new Date(createdAt);
    }
    if (isNaN(date.getTime())) return 'Recently';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

// Currency formatter
function formatCurrency(num) {
  if (!num || num === 0) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(num);
}

// Language name formatter
function getLanguageName(code) {
  if (!code) return '—';
  try {
    const langNames = new Intl.DisplayNames(['en'], { type: 'language' });
    return langNames.of(code) || code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

// Community Review Card subcomponent
function CommunityReviewItem({ review, currentUserId, onDelete, isDeleting }) {
  const [expanded, setExpanded] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const isOwner = (currentUserId && review.userId === currentUserId) ||
                  (auth.currentUser && review.userId === auth.currentUser.uid);
  const content = review.comment || '';
  const isLong = content.length > 320;
  const displayContent = isLong && !expanded ? `${content.slice(0, 320)}...` : content;
  const initial = (review.userName || 'U').charAt(0).toUpperCase();

  return (
    <div className="detail__review-card relative">
      <div className="detail__review-header">
        <div className="detail__review-author-info">
          {review.userPhoto && !avatarError ? (
            <img
              src={review.userPhoto}
              alt={review.userName}
              className="detail__review-avatar"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div
              className="detail__review-avatar detail__review-avatar--placeholder"
              style={{
                color: '#ef4444',
                background: 'rgba(239, 68, 68, 0.12)',
                borderColor: 'rgba(239, 68, 68, 0.25)',
              }}
            >
              {initial}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h4 className="detail__review-author">{review.userName || 'Anonymous'}</h4>
              {isOwner && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-950/40 text-red-400 border border-red-500/30">
                  You
                </span>
              )}
            </div>
            <span className="detail__review-date">{formatCommunityDate(review.createdAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {review.rating && (
            <div className="detail__review-rating">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span>{review.rating} / 10</span>
            </div>
          )}

          {isOwner && (
            <button
              type="button"
              className="detail__review-delete-btn"
              onClick={() => onDelete(review.id)}
              disabled={isDeleting}
              title="Delete review"
              aria-label="Delete review"
            >
              {isDeleting ? (
                <span className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin inline-block" />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      <p className="detail__review-content break-words">{displayContent}</p>

      {isLong && (
        <button
          type="button"
          className="detail__review-readmore"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? 'Show Less' : 'Read More'}
        </button>
      )}
    </div>
  );
}

// Write a Review Form component
function ReviewForm({ movieId, user }) {
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const ratingDescriptions = {
    1: '1/10 - Appalling',
    2: '2/10 - Horrible',
    3: '3/10 - Very Bad',
    4: '4/10 - Bad',
    5: '5/10 - Average',
    6: '6/10 - Fine',
    7: '7/10 - Good',
    8: '8/10 - Very Good',
    9: '9/10 - Great',
    10: '10/10 - Masterpiece',
  };

  if (!user) {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 md:p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-400 flex-shrink-0">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Have you watched this movie?</p>
            <p className="text-xs text-zinc-400 mt-0.5">Please sign in to rate and review this movie.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-all shadow-md shadow-red-600/20 whitespace-nowrap self-start sm:self-auto cursor-pointer"
        >
          Sign In
        </button>
      </div>
    );
  }

  const activeRating = hoverRating || rating;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a star rating between 1 and 10.');
      return;
    }
    const trimmed = comment.trim();
    if (!trimmed) {
      toast.error('Please write your review comment.');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'movie_reviews'), {
        movieId: String(movieId),
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'User',
        userPhoto: user.photoURL || '',
        rating: Number(rating),
        comment: trimmed,
        createdAt: serverTimestamp(),
      });

      toast.success('Review submitted successfully!');
      setComment('');
      setRating(0);
      setHoverRating(0);
    } catch (err) {
      console.error('Failed to submit review:', err);
      toast.error('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="detail__review-form">
      <h3 className="detail__review-form-title">
        <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Write a Review
      </h3>

      {/* Interactive 1-10 Star Rating */}
      <div className="detail__review-stars">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => {
          const isFilled = activeRating >= star;
          return (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className={`detail__star-btn${isFilled ? ' detail__star-btn--active' : ''}`}
              title={`${star} / 10`}
              aria-label={`Rate ${star} out of 10`}
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill={isFilled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          );
        })}
        <span className="detail__star-rating-label">
          {activeRating > 0 ? ratingDescriptions[activeRating] : 'Select your rating (1-10)'}
        </span>
      </div>

      {/* Review Textarea */}
      <textarea
        className="detail__review-textarea"
        rows={3}
        placeholder="Share your thoughts about this movie... What did you love or dislike?"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={submitting}
        maxLength={2000}
      />

      <div className="flex items-center justify-between mt-2">
        <span className="text-[11px] text-zinc-500">
          {comment.length}/2000 characters
        </span>
        <button
          type="submit"
          disabled={submitting || rating === 0 || !comment.trim()}
          className="detail__review-submit-btn"
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
              Submitting...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Submit Review
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// Review card subcomponent with Read More toggle (TMDB)
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

      <p className="detail__review-content break-words">{displayContent}</p>

      {isLong && (
        <button
          type="button"
          className="detail__review-readmore"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? 'Show Less' : 'Read More'}
        </button>
      )}
    </div>
  );
}

export default function MovieDetail({ toggleFavorite, isFavorite }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [communityReviews, setCommunityReviews] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleShare = async () => {
    // 1. Pengecekan API: Cek apakah browser mendukung Web Share API (misal di smartphone/HP)
    if (navigator.share) {
      try {
        await navigator.share({
          title: movie.title,
          text: 'Tonton ' + movie.title + ' di Cineva sekarang!',
          url: window.location.href,
        });
      } catch (err) {
        // Jangan munculkan error jika user sengaja menutup/membatalkan menu share bawaan HP
        if (err.name !== 'AbortError') {
          console.error('Error sharing content:', err);
        }
      }
    } else {
      // 2. Fallback Salin Link (Desktop): Jika navigator.share tidak tersedia (misal di PC/Laptop)
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
        toast.success('Link film berhasil disalin ke clipboard!');
        setTimeout(() => setCopied(false), 2200);
      } catch (err) {
        console.error('Failed to copy URL:', err);
        toast.error('Gagal menyalin link.');
      }
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
    window.scrollTo(0, 0);
  }, [id]);

  // Real-time listener untuk ulasan komunitas dari Firebase Firestore
  useEffect(() => {
    if (!id) return;

    setCommunityLoading(true);
    const reviewsRef = collection(db, 'movie_reviews');
    const q = query(
      reviewsRef,
      where('movieId', 'in', [String(id), Number(id)])
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        // Sort descending by createdAt timestamp
        docs.sort((a, b) => {
          const timeA = a.createdAt?.toMillis
            ? a.createdAt.toMillis()
            : a.createdAt
            ? new Date(a.createdAt).getTime()
            : 0;
          const timeB = b.createdAt?.toMillis
            ? b.createdAt.toMillis()
            : b.createdAt
            ? new Date(b.createdAt).getTime()
            : 0;
          return timeB - timeA;
        });
        setCommunityReviews(docs);
        setCommunityLoading(false);
      },
      (err) => {
        console.error('Failed to listen to community reviews:', err);
        setCommunityLoading(false);
      }
    );

    return () => unsubscribe();
  }, [id]);

  const handleDeleteCommunityReview = async (reviewId) => {
    const confirmed = window.confirm('Are you sure you want to delete your review?');
    if (!confirmed) return;

    setDeletingId(reviewId);
    try {
      await deleteDoc(doc(db, 'movie_reviews', reviewId));
      toast.success('Review deleted successfully');
    } catch (err) {
      console.error('Failed to delete review:', err);
      toast.error('Failed to delete review. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  // Dynamic Document Title: pantau perubahan data film dan ubah judul tab browser
  useEffect(() => {
    if (movie?.title) {
      document.title = `${movie.title} - Cineva`;
    }

    return () => {
      document.title = 'Cineva';
    };
  }, [movie]);

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

  const director = movie.credits?.crew?.find((c) => c.job === 'Director')?.name;
  const writer = movie.credits?.crew?.find(
    (c) => c.job === 'Screenplay' || c.job === 'Writer' || c.job === 'Story'
  )?.name;

  const trailer = getTrailerVideo(movie.videos?.results);

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
        {/* Back navigation button matching PersonDetail */}
        <div className="detail__back">
          <button
            type="button"
            onClick={handleBack}
            className="detail__back-btn"
            aria-label="Back"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </button>
        </div>

        <div className="detail__top">
          {/* Poster */}
          <div className="detail__poster-wrap">
            {poster && (
              <img src={poster} alt={movie.title} className="detail__poster" />
            )}
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
                  type="button"
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
                  type="button"
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
                type="button"
                className={`detail__action-btn detail__action-btn--share${copied ? ' detail__action-btn--copied' : ''}`}
                onClick={handleShare}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                {copied ? 'Link Copied!' : 'Share'}
              </button>
            </div>

            {movie.overview && (
              <div className="detail__overview">
                <h2 className="detail__section-title">Overview</h2>
                <p>{movie.overview}</p>
              </div>
            )}

            {(director || writer) && (
              <div className="detail__crew">
                {director && (
                  <div className="detail__crew-item">
                    <span className="detail__crew-role">Director</span>
                    <span className="detail__crew-name">{director}</span>
                  </div>
                )}
                {writer && (
                  <div className="detail__crew-item">
                    <span className="detail__crew-role">Writer</span>
                    <span className="detail__crew-name">{writer}</span>
                  </div>
                )}
              </div>
            )}
          </div>

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

        {/* Cast */}
        {cast.length > 0 && (
          <section className="detail__cast">
            <h2 className="detail__section-title">Cast</h2>
            <div className="detail__cast-list overflow-x-auto scrollbar-none flex gap-4">
              {cast.map((person) => (
                <CastCard
                  key={person.credit_id || person.id}
                  person={person}
                  cast={person}
                />
              ))}
            </div>
          </section>
        )}

        {/* Reviews Section (Community + TMDB) */}
        <section className="detail__reviews">
          <h2 className="detail__section-title mb-5">
            Reviews{' '}
            {(communityReviews.length + reviews.length) > 0 && (
              <span className="detail__reviews-count">
                ({communityReviews.length + reviews.length})
              </span>
            )}
          </h2>

          {/* Form Tambah Ulasan (Write a Review) */}
          <ReviewForm movieId={id} user={user} />

          {/* 1. Community Reviews (Firestore) */}
          <div className="mb-8">
            <div className="detail__reviews-subheading">
              <span className="detail__reviews-subheading-dot bg-red-500" />
              <span>Community Reviews</span>
              <span className="text-xs font-semibold text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-700/60">
                {communityReviews.length}
              </span>
            </div>

            {communityLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, idx) => (
                  <div key={idx} className="detail__review-card animate-pulse">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-800" />
                      <div className="space-y-1.5 flex-1">
                        <div className="w-28 h-3.5 bg-zinc-800 rounded" />
                        <div className="w-20 h-2.5 bg-zinc-800/60 rounded" />
                      </div>
                    </div>
                    <div className="w-full h-3 bg-zinc-800/60 rounded mb-2" />
                    <div className="w-3/4 h-3 bg-zinc-800/40 rounded" />
                  </div>
                ))}
              </div>
            ) : communityReviews.length > 0 ? (
              <div className="detail__reviews-list space-y-4">
                {communityReviews.map((rev) => (
                  <CommunityReviewItem
                    key={rev.id}
                    review={rev}
                    currentUserId={user?.uid}
                    onDelete={handleDeleteCommunityReview}
                    isDeleting={deletingId === rev.id}
                  />
                ))}
              </div>
            ) : (
              <div className="detail__no-reviews">
                <p>No community reviews yet. Be the first to share your review above!</p>
              </div>
            )}
          </div>

          {/* 2. External Critic Reviews (TMDB) */}
          <div>
            <div className="detail__reviews-subheading">
              <span className="detail__reviews-subheading-dot bg-amber-500" />
              <span>External Critic Reviews</span>
              <span className="text-xs font-semibold text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-700/60">
                {reviews.length}
              </span>
            </div>

            {reviews.length > 0 ? (
              <div className="detail__reviews-list space-y-4">
                {reviews.map((rev) => (
                  <ReviewItem key={rev.id} review={rev} />
                ))}
              </div>
            ) : (
              <p className="text-zinc-500 text-sm py-2">No external reviews available from TMDB.</p>
            )}
          </div>
        </section>

        {/* Similar Movies */}
        {similar.length > 0 && (
          <section className="detail__similar pb-16">
            <MovieGrid
              title="More Like This"
              movies={similar}
              onToggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
            />
          </section>
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
