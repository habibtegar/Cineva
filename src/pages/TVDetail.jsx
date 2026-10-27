import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import CastCard from '../components/CastCard';
import TVCard from '../components/TVCard';
import TrailerModal from '../components/TrailerModal';
import { SkeletonDetail } from '../components/Skeleton';
import ErrorState from '../components/ErrorState';
import {
  getTVDetail,
  getTVSeasonDetail,
  getBackdropUrl,
  getImageUrl,
  getTrailerVideo,
} from '../services/tmdb';
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
import './TVDetail.css';

// Format Firestore timestamp to readable date
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

// Subcomponent: Community Review Item
function CommunityReviewItem({ review, currentUserId, onDelete, isDeleting }) {
  const [expanded, setExpanded] = useState(false);
  const currentUser = auth.currentUser;
  const isCurrentUser = Boolean(
    currentUser && review.userId && review.userId === currentUser.uid
  );
  const isOwner = Boolean(
    isCurrentUser || (currentUserId && review.userId === currentUserId)
  );

  const authorName = isCurrentUser
    ? (currentUser.displayName || review.userName || 'Anonymous')
    : (review.userName || 'Anonymous');

  const authorPhoto = isCurrentUser
    ? (currentUser.photoURL !== undefined ? currentUser.photoURL : review.userPhoto)
    : review.userPhoto;

  const content = review.comment || '';
  const isLong = content.length > 320;
  const displayContent = isLong && !expanded ? `${content.slice(0, 320)}...` : content;
  const initial = (authorName || 'U').charAt(0).toUpperCase();

  return (
    <article className="detail__review-item">
      <div className="detail__review-header">
        <div className="detail__review-author">
          <div className="detail__review-avatar">
            {authorPhoto ? (
              <img
                src={authorPhoto}
                alt={authorName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <span>{initial}</span>
            )}
          </div>
          <div>
            <div className="detail__review-name-wrap">
              {review.userId && review.userId !== 'anonymous' ? (
                <Link
                  to={`/user/${review.userId}`}
                  className="detail__review-name hover:underline text-white font-medium"
                >
                  {authorName}
                </Link>
              ) : (
                <span className="detail__review-name font-medium">{authorName}</span>
              )}
              {isOwner && <span className="detail__review-badge-you">You</span>}
            </div>
            <span className="detail__review-date">
              {formatCommunityDate(review.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {review.rating > 0 && (
            <div className="detail__review-rating">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span>{review.rating}/10</span>
            </div>
          )}

          {isOwner && (
            <button
              type="button"
              className="text-zinc-500 hover:text-red-400 text-xs p-1 transition-colors cursor-pointer"
              title="Delete review"
              onClick={() => onDelete(review.id)}
              disabled={isDeleting}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <p className="detail__review-content">{displayContent}</p>

      {isLong && (
        <button
          type="button"
          className="detail__review-expand-btn text-xs font-semibold text-red-500 hover:underline mt-2 cursor-pointer"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </article>
  );
}

// Format episode air date
function formatAirDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// Subcomponent: Episode Card / List Row ala Netflix
function EpisodeRowItem({ episode }) {
  const [imgError, setImgError] = useState(false);
  const stillUrl = !imgError && episode.still_path ? getImageUrl(episode.still_path, 'w300') : null;
  const formattedDate = formatAirDate(episode.air_date);

  return (
    <article className="group relative flex flex-col sm:flex-row items-start gap-4 p-4 rounded-xl bg-zinc-900/50 hover:bg-zinc-900/90 border border-zinc-800/70 hover:border-zinc-700 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-black/60">
      {/* 16:9 Thumbnail Still */}
      <div className="relative w-full sm:w-60 md:w-64 shrink-0 aspect-video rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800/80 flex items-center justify-center">
        {stillUrl ? (
          <img
            src={stillUrl}
            alt={episode.name || `Episode ${episode.episode_number}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 text-zinc-600 p-2 text-center">
            <svg
              className="w-8 h-8 text-zinc-700"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
              <polyline points="17 2 12 7 7 2" />
            </svg>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              No Preview
            </span>
          </div>
        )}

        {/* Play Icon Overlay on Hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
            <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* Episode Number badge */}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[11px] font-bold text-white border border-white/10 shadow-sm">
          E{episode.episode_number}
        </div>
      </div>

      {/* Episode Details */}
      <div className="flex-1 min-w-0 w-full py-0.5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
          <h3 className="text-base font-bold text-white group-hover:text-red-400 transition-colors leading-snug">
            E{episode.episode_number} • {episode.name || `Episode ${episode.episode_number}`}
          </h3>
          {episode.vote_average > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 shrink-0">
              ★ {episode.vote_average.toFixed(1)}
            </span>
          )}
        </div>

        {/* Info Tambahan: Tanggal Rilis & Durasi */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mb-2">
          {formattedDate && (
            <span className="flex items-center gap-1 text-zinc-400">
              <svg className="w-3.5 h-3.5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {formattedDate}
            </span>
          )}
          {episode.runtime ? (
            <span className="flex items-center gap-1 text-zinc-400">
              <svg className="w-3.5 h-3.5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {episode.runtime}m
            </span>
          ) : null}
        </div>

        {/* Overview / Sinopsis */}
        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed line-clamp-3 md:line-clamp-4">
          {episode.overview || 'No synopsis has been provided for this episode.'}
        </p>
      </div>
    </article>
  );
}

export default function TVDetail({ toggleFavorite, isFavorite }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tv, setTv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Trailer modal state
  const [trailerKey, setTrailerKey] = useState(null);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Community reviews state
  const [communityReviews, setCommunityReviews] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [communityComment, setCommunityComment] = useState('');
  const [communityRating, setCommunityRating] = useState(8);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState(null);

  // Seasons & Episodes Explorer state
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);

  // Fetch TV Show details from TMDB
  useEffect(() => {
    let isCancelled = false;

    async function fetchShow() {
      setLoading(true);
      setError(null);
      window.scrollTo(0, 0);

      try {
        const data = await getTVDetail(id);
        if (!isCancelled) {
          setTv(data);
          document.title = `${data.name || 'TV Series'} — Cineva`;

          // Detect trailer video
          const videoResults = data.videos?.results || [];
          const trailer = getTrailerVideo(videoResults);
          setTrailerKey(trailer?.key || null);
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to fetch TV details:', err);
          setError('Failed to load TV series details.');
          setLoading(false);
        }
      }
    }

    if (id) {
      fetchShow();
    }

    return () => {
      isCancelled = true;
    };
  }, [id]);

  // Filter & Urutkan Seasons:
  // Season number 0 (Specials) diletakkan di akhir dan abaikan season tanpa episode
  const validSeasons = useMemo(() => {
    if (!tv?.seasons || !Array.isArray(tv.seasons)) return [];

    const withEpisodes = tv.seasons.filter((s) => (s.episode_count || 0) > 0);
    const regulars = withEpisodes
      .filter((s) => s.season_number > 0)
      .sort((a, b) => a.season_number - b.season_number);
    const specials = withEpisodes.filter((s) => s.season_number === 0);

    return [...regulars, ...specials];
  }, [tv?.seasons]);

  // Sinkronkan selectedSeason default saat validSeasons berubah
  useEffect(() => {
    if (validSeasons.length > 0) {
      const hasSeason = validSeasons.some((s) => s.season_number === selectedSeason);
      if (!hasSeason) {
        const defaultNum =
          validSeasons.find((s) => s.season_number === 1)?.season_number ??
          validSeasons[0].season_number;
        setSelectedSeason(defaultNum);
      }
    }
  }, [validSeasons, id, selectedSeason]);

  // Fetch data episode setiap kali selectedSeason atau id serial berubah
  useEffect(() => {
    if (!id || selectedSeason === null || selectedSeason === undefined) return;

    let isCancelled = false;
    setIsLoadingEpisodes(true);

    getTVSeasonDetail(id, selectedSeason)
      .then((data) => {
        if (!isCancelled) {
          setEpisodes(data?.episodes || []);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error(`Failed to fetch episodes for season ${selectedSeason}:`, err);
          setEpisodes([]);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingEpisodes(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [id, selectedSeason]);

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

        // Sort descending by createdAt
        docs.sort((a, b) => {
          const timeA = a.createdAt?.toMillis
            ? a.createdAt.toMillis()
            : a.createdAt?.seconds
            ? a.createdAt.seconds * 1000
            : a.createdAt
            ? new Date(a.createdAt).getTime()
            : 0;

          const timeB = b.createdAt?.toMillis
            ? b.createdAt.toMillis()
            : b.createdAt?.seconds
            ? b.createdAt.seconds * 1000
            : b.createdAt
            ? new Date(b.createdAt).getTime()
            : 0;

          return timeB - timeA;
        });

        setCommunityReviews(docs);
        setCommunityLoading(false);
      },
      (err) => {
        console.error('Failed to listen to TV reviews:', err);
        setCommunityLoading(false);
      }
    );

    return () => unsubscribe();
  }, [id]);

  // Kirim ulasan komunitas
  const handleAddReview = async (e) => {
    e.preventDefault();

    if (!user) {
      toast('Please log in to post a review!', { icon: '🔒' });
      navigate('/login');
      return;
    }

    const trimmedComment = communityComment.trim();
    if (!trimmedComment) {
      toast.error('Please write your review thoughts.');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const newReview = {
        movieId: String(id),
        mediaType: 'tv',
        title: tv?.name || 'TV Series',
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'User',
        userPhoto: user.photoURL || '',
        comment: trimmedComment,
        rating: Number(communityRating) || 8,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'movie_reviews'), newReview);
      setCommunityComment('');
      toast.success('Your review has been shared!');
    } catch (err) {
      console.error('Failed to submit review:', err);
      toast.error('Failed to publish review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Hapus ulasan
  const handleDeleteReview = async (reviewId) => {
    const confirmed = window.confirm('Are you sure you want to delete your review?');
    if (!confirmed) return;

    setDeletingReviewId(reviewId);
    try {
      await deleteDoc(doc(db, 'movie_reviews', reviewId));
      toast.success('Review removed.');
    } catch (err) {
      console.error('Failed to delete review:', err);
      toast.error('Failed to remove review.');
    } finally {
      setDeletingReviewId(null);
    }
  };

  // Bagikan Tautan
  const handleShare = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        toast.success('Link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      toast.error('Failed to copy link.');
    }
  };

  if (loading) {
    return <SkeletonDetail />;
  }

  if (error || !tv) {
    return (
      <div className="page-container" style={{ paddingTop: 100 }}>
        <ErrorState message={error || 'TV Series not found'} onRetry={() => navigate('/tv')} />
      </div>
    );
  }

  const backdrop = getBackdropUrl(tv.backdrop_path);
  const poster = getImageUrl(tv.poster_path, 'w500');
  const year = tv.first_air_date ? tv.first_air_date.slice(0, 4) : '';
  const seasonsText = tv.number_of_seasons
    ? `${tv.number_of_seasons} ${tv.number_of_seasons > 1 ? 'Seasons' : 'Season'}`
    : '';
  const episodesText = tv.number_of_episodes
    ? `${tv.number_of_episodes} Episodes`
    : '';
  const rating = tv.vote_average ? tv.vote_average.toFixed(1) : '-';
  const voteCount = tv.vote_count ? tv.vote_count.toLocaleString() : null;

  // TV item object for favorites
  const tvItem = {
    ...tv,
    title: tv.name,
    release_date: tv.first_air_date,
    media_type: 'tv',
  };
  const isFav = isFavorite ? isFavorite(tv.id, 'tv') : false;

  // Cast members
  const castList = tv.credits?.cast?.slice(0, 14) || [];

  // Recommendations / More Like This
  const recommendations = (tv.recommendations?.results || tv.similar?.results || []).slice(0, 10);

  return (
    <div className="detail">
      {/* Backdrop Banner */}
      <div className="detail__backdrop">
        {backdrop && <img src={backdrop} alt={tv.name} className="detail__backdrop-img" />}
        <div className="detail__backdrop-gradient-side" />
        <div className="detail__backdrop-gradient-bottom" />
      </div>

      {/* Main Body */}
      <div className="detail__body page-container">
        {/* Back navigation button */}
        <div className="detail__back">
          <button
            type="button"
            onClick={() => navigate(-1)}
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

        {/* Top Section: Poster & Meta Info */}
        <div className="detail__top">
          {/* Poster */}
          <div className="detail__poster-wrap aspect-[2/3] overflow-hidden">
            {poster ? (
              <img
                src={poster}
                alt={tv.name}
                className="detail__poster w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="w-full aspect-[2/3] bg-zinc-900 rounded-xl flex items-center justify-center p-4 text-center">
                <span className="text-sm font-bold text-zinc-400">{tv.name}</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="detail__info">
            <h1 className="detail__title">{tv.name}</h1>
            {tv.tagline && <p className="detail__tagline">{tv.tagline}</p>}

            {/* Meta Pills */}
            <div className="detail__meta">
              {year && <span className="detail__meta-pill">{year}</span>}
              {seasonsText && (
                <span className="detail__meta-pill tv-detail__seasons-badge">
                  {seasonsText}
                </span>
              )}
              {episodesText && (
                <span className="detail__meta-pill">{episodesText}</span>
              )}
              {tv.status && (
                <span className="detail__meta-pill text-zinc-300">
                  {tv.status}
                </span>
              )}
              <span className="detail__meta-pill detail__meta-pill--rating">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {rating}
                {voteCount && <span className="detail__vote-count">({voteCount})</span>}
              </span>
            </div>

            {/* Genres */}
            {tv.genres?.length > 0 && (
              <div className="detail__genres">
                {tv.genres.map((g) => (
                  <span key={g.id} className="detail__genre">
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="detail__actions">
              {trailerKey && (
                <button
                  type="button"
                  className="detail__action-btn detail__action-btn--play cursor-pointer"
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
                  className={`detail__action-btn detail__action-btn--fav cursor-pointer${
                    isFav ? ' detail__action-btn--fav-active' : ''
                  }`}
                  onClick={() => toggleFavorite(tvItem, 'tv')}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill={isFav ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  {isFav ? 'Saved' : 'Add to Favorites'}
                </button>
              )}

              <button
                type="button"
                className={`detail__action-btn detail__action-btn--share cursor-pointer${
                  copied ? ' detail__action-btn--copied' : ''
                }`}
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

            {/* Overview / Sinopsis */}
            {tv.overview && (
              <div className="detail__overview">
                <h2 className="detail__section-title">Overview</h2>
                <p>{tv.overview}</p>
              </div>
            )}

            {/* Creators / Networks */}
            {tv.created_by?.length > 0 && (
              <div className="detail__crew">
                <div className="detail__crew-item">
                  <span className="detail__crew-role">Creator</span>
                  <span className="detail__crew-name">
                    {tv.created_by.map((c) => c.name).join(', ')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =============================================
            Seasons & Episodes Explorer Section
            ============================================= */}
        {validSeasons.length > 0 && (
          <section className="detail__episodes-section mb-14" aria-labelledby="tv-seasons-title">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-3">
                <h2 id="tv-seasons-title" className="detail__section-title mb-0">
                  Episodes
                </h2>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-600/15 text-red-400 border border-red-500/30">
                  Season {selectedSeason === 0 ? 'Specials' : selectedSeason}
                </span>
              </div>

              {/* Total episode indicator */}
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 bg-zinc-900/60 border border-zinc-800/80 px-3 py-1.5 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span>
                  {isLoadingEpisodes
                    ? 'Loading episodes...'
                    : `${episodes.length} ${episodes.length === 1 ? 'Episode' : 'Episodes'}`}
                </span>
              </div>
            </div>

            {/* Season Selector: Dropdown + Quick Tab Pills */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {/* Dark mode custom select */}
              <div className="relative inline-block">
                <label htmlFor="tv-season-dropdown" className="sr-only">
                  Select Season
                </label>
                <select
                  id="tv-season-dropdown"
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(Number(e.target.value))}
                  className="appearance-none bg-zinc-900/90 border border-zinc-700/80 hover:border-red-500/60 text-white font-semibold text-sm rounded-xl pl-4 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all cursor-pointer shadow-lg shadow-black/40"
                >
                  {validSeasons.map((s) => (
                    <option
                      key={s.id || s.season_number}
                      value={s.season_number}
                      className="bg-zinc-900 text-white"
                    >
                      {s.name || (s.season_number === 0 ? 'Specials' : `Season ${s.season_number}`)} ({s.episode_count} eps)
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>

              {/* Quick Pills row */}
              {validSeasons.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto max-w-full scrollbar-none py-1">
                  {validSeasons.map((s) => {
                    const isActive = s.season_number === selectedSeason;
                    return (
                      <button
                        key={s.id || s.season_number}
                        type="button"
                        onClick={() => setSelectedSeason(s.season_number)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          isActive
                            ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                            : 'bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                        }`}
                      >
                        {s.season_number === 0 ? 'Specials' : `Season ${s.season_number}`}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Episode List / Skeletons */}
            {isLoadingEpisodes ? (
              <div className="space-y-3.5">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 animate-pulse"
                  >
                    <div className="w-full sm:w-60 md:w-64 aspect-video bg-zinc-800/60 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2.5 py-1 w-full">
                      <div className="h-5 bg-zinc-800/80 rounded w-2/5" />
                      <div className="h-3.5 bg-zinc-800/50 rounded w-1/4" />
                      <div className="space-y-1.5 pt-2">
                        <div className="h-3 bg-zinc-800/40 rounded w-full" />
                        <div className="h-3 bg-zinc-800/40 rounded w-4/5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : episodes.length > 0 ? (
              <div className="space-y-3.5">
                {episodes.map((ep) => (
                  <EpisodeRowItem key={ep.id || ep.episode_number} episode={ep} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-4 rounded-xl bg-zinc-900/30 border border-zinc-800/60 text-zinc-400">
                <svg
                  className="w-10 h-10 mx-auto text-zinc-600 mb-2"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
                  <polyline points="17 2 12 7 7 2" />
                </svg>
                <p className="text-sm font-medium">No episodes found for this season.</p>
              </div>
            )}
          </section>
        )}

        {/* Cast Section */}
        {castList.length > 0 && (
          <section className="detail__cast-section">
            <h2 className="detail__section-title">Top Billed Cast</h2>
            <div className="detail__cast-list flex overflow-x-auto scrollbar-none gap-4 pb-2">
              {castList.map((person) => (
                <CastCard key={person.id} cast={person} />
              ))}
            </div>
          </section>
        )}

        {/* =============================================
            Firebase Community Reviews Section
            ============================================= */}
        <section className="detail__reviews" aria-labelledby="tv-community-reviews-title">
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-zinc-800">
            <h2 id="tv-community-reviews-title" className="detail__section-title mb-0">
              Community Reviews
            </h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 font-semibold">
              {communityReviews.length} Reviews
            </span>
          </div>

          {/* Form Kirim Review */}
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-5 mb-8 backdrop-blur-md">
            <h3 className="text-sm font-bold text-white mb-3">
              Leave a Review for {tv.name}
            </h3>

            {user ? (
              <form onSubmit={handleAddReview} className="space-y-4">
                <div className="flex items-center gap-3">
                  <label htmlFor="tv-rating-select" className="text-xs font-semibold text-zinc-400">
                    Your Rating:
                  </label>
                  <select
                    id="tv-rating-select"
                    value={communityRating}
                    onChange={(e) => setCommunityRating(Number(e.target.value))}
                    className="bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1 text-xs text-white"
                  >
                    {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((r) => (
                      <option key={r} value={r}>
                        ★ {r} / 10
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  rows={3}
                  placeholder="Share your thoughts on this series (episodes, plot, characters)..."
                  value={communityComment}
                  onChange={(e) => setCommunityComment(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-700/80 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-all resize-y"
                  required
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingReview || !communityComment.trim()}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-red-600/30"
                  >
                    {isSubmittingReview ? 'Posting...' : 'Post Review'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4 text-xs text-zinc-400">
                <span>Please </span>
                <Link to="/login" className="text-red-400 font-semibold hover:underline">
                  sign in
                </Link>
                <span> to share your review with the Cineva community.</span>
              </div>
            )}
          </div>

          {/* Review List */}
          {communityLoading ? (
            <div className="space-y-3">
              {[1, 2].map((n) => (
                <div key={n} className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 animate-pulse h-24" />
              ))}
            </div>
          ) : communityReviews.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-6">
              No reviews yet for this series. Be the first to share your opinion!
            </p>
          ) : (
            <div className="space-y-4">
              {communityReviews.map((rev) => (
                <CommunityReviewItem
                  key={rev.id}
                  review={rev}
                  currentUserId={user?.uid}
                  onDelete={handleDeleteReview}
                  isDeleting={deletingReviewId === rev.id}
                />
              ))}
            </div>
          )}
        </section>

        {/* =============================================
            More Like This / Recommendations Section
            ============================================= */}
        {recommendations.length > 0 && (
          <section className="detail__recommendations mt-16 pt-8 border-t border-zinc-800">
            <h2 className="detail__section-title">More Like This</h2>
            <div className="tv-recommendations__grid">
              {recommendations.map((rec) => (
                <TVCard
                  key={rec.id}
                  show={rec}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={isFavorite}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Trailer Modal */}
      {trailerOpen && trailerKey && (
        <TrailerModal
          trailerKey={trailerKey}
          title={tv.name}
          onClose={() => setTrailerOpen(false)}
        />
      )}
    </div>
  );
}
