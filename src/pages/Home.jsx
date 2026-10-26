import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import HeroSection from '../components/HeroSection';
import MovieRow from '../components/MovieRow';
import TrailerModal from '../components/TrailerModal';
import { SkeletonHero } from '../components/Skeleton';
import {
  getTrending,
  getGenres,
  getMovieDetail,
  getTrailerVideo,
} from '../services/tmdb';
import './Home.css';

// Kategori Masukan & Konfigurasi Badge untuk Community Spotlight
const CATEGORY_BADGES = {
  'Feature Request': {
    label: 'Fitur',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ),
  },
  'Bug Report': {
    label: 'Bug',
    badgeClass: 'bg-red-500/15 text-red-300 border-red-500/30',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="8" height="14" x="8" y="6" rx="4" />
        <path d="m19 7-3 2M5 7l3 2M19 19l-3-2M5 19l3-2M20 13h-4M4 13h4M10 4l1 2M14 4l-1 2" />
      </svg>
    ),
  },
  'General Feedback': {
    label: 'Saran',
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
};

export default function Home({ toggleFavorite, isFavorite }) {
  // Hero Banner State
  const [hero, setHero] = useState(null);
  const [heroLoading, setHeroLoading] = useState(true);
  const [heroError, setHeroError] = useState(null);
  const [heroRetryKey, setHeroRetryKey] = useState(0);
  const [heroTrailerKey, setHeroTrailerKey] = useState(null);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [genres, setGenres] = useState([]);

  // Auth & Navigation
  const { user } = useAuth();
  const navigate = useNavigate();

  // Top Community Feedbacks
  const [topFeedbacks, setTopFeedbacks] = useState([]);

  // Dynamic Document Title
  useEffect(() => {
    document.title = 'Home — Cineva';
    window.scrollTo(0, 0);
  }, []);

  // Fetch official TMDB genre list on mount dengan structured try...catch
  useEffect(() => {
    let isCancelled = false;

    async function fetchGenres() {
      try {
        const data = await getGenres();
        if (!isCancelled) {
          setGenres(data?.genres || []);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to fetch genres in Home:', err);
        }
      }
    }

    fetchGenres();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Fetch trending movies for Hero Banner dengan structured try...catch & fallback state
  useEffect(() => {
    let isCancelled = false;

    async function initHeroBanner() {
      try {
        setHeroLoading(true);
        setHeroError(null);
        const data = await getTrending('week', 1);
        if (!isCancelled) {
          if (data?.results && data.results.length > 0) {
            // Select a random movie from top 10 trending for the hero
            const pool = data.results.slice(0, 10);
            const randomIndex = Math.floor(Math.random() * pool.length);
            setHero(pool[randomIndex]);
          } else {
            setHero(null);
            setHeroError('No trending movies available.');
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to load hero movie:', err);
          const isApiKeyIssue =
            !import.meta.env.VITE_TMDB_API_KEY ||
            err?.message?.includes('TMDB API key') ||
            err?.response?.status === 401;

          setHeroError(
            isApiKeyIssue
              ? 'TMDB API key is missing or invalid. Please set VITE_TMDB_API_KEY in Vercel Environment Variables.'
              : 'Failed to load featured movie. Please check your network connection.'
          );
        }
      } finally {
        if (!isCancelled) {
          setHeroLoading(false);
        }
      }
    }

    initHeroBanner();

    return () => {
      isCancelled = true;
    };
  }, [heroRetryKey]);

  // Fetch hero trailer key once hero is set
  useEffect(() => {
    if (!hero?.id) return;
    let isCancelled = false;

    async function fetchTrailer() {
      try {
        const detail = await getMovieDetail(hero.id);
        if (!isCancelled) {
          const trailer = getTrailerVideo(detail?.videos?.results);
          setHeroTrailerKey(trailer?.key || null);
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('Failed to fetch hero trailer:', err);
        }
      }
    }

    fetchTrailer();

    return () => {
      isCancelled = true;
    };
  }, [hero]);

  // Real-time listener untuk 3 feedback teratas berdasarkan jumlah upvotes
  useEffect(() => {
    const feedbacksRef = collection(db, 'feedbacks');
    const unsubscribe = onSnapshot(
      feedbacksRef,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        items.sort((a, b) => {
          const votesA = Array.isArray(a.upvotes) ? a.upvotes.length : 0;
          const votesB = Array.isArray(b.upvotes) ? b.upvotes.length : 0;
          if (votesB !== votesA) return votesB - votesA;

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

        setTopFeedbacks(items.slice(0, 3));
      },
      (err) => {
        console.error('Failed to listen to top feedbacks in Home:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  // Handler Upvote Langsung dari Kartu
  const handleToggleUpvote = async (feedbackItem, e) => {
    if (e) e.stopPropagation();

    if (!user || !user.uid) {
      toast(
        (t) => (
          <div className="flex items-center gap-3">
            <span>Please log in to vote on suggestions!</span>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                navigate('/login');
              }}
              className="px-2.5 py-1 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
            >
              Sign In
            </button>
          </div>
        ),
        { icon: '🔒', duration: 4000 }
      );
      return;
    }

    const currentUpvotes = Array.isArray(feedbackItem.upvotes) ? feedbackItem.upvotes : [];
    const hasVoted = currentUpvotes.includes(user.uid);
    const feedbackRef = doc(db, 'feedbacks', feedbackItem.id);

    setTopFeedbacks((prev) =>
      prev.map((item) => {
        if (item.id === feedbackItem.id) {
          const updatedVotes = hasVoted
            ? (item.upvotes || []).filter((uid) => uid !== user.uid)
            : [...(item.upvotes || []), user.uid];
          return { ...item, upvotes: updatedVotes };
        }
        return item;
      })
    );

    try {
      if (hasVoted) {
        await updateDoc(feedbackRef, {
          upvotes: arrayRemove(user.uid),
        });
      } else {
        await updateDoc(feedbackRef, {
          upvotes: arrayUnion(user.uid),
        });
      }
    } catch (error) {
      console.error('Error toggling upvote in Home:', error);
      toast.error('Unable to register vote. Please check your connection.');
    }
  };

  return (
    <div className="home">
      {/* 1. Hero Banner */}
      {heroLoading ? (
        <SkeletonHero />
      ) : hero ? (
        <HeroSection
          movie={hero}
          genres={genres}
          onWatchTrailer={heroTrailerKey ? () => setTrailerOpen(true) : undefined}
        />
      ) : (
        <div className="w-full pt-28 pb-10 px-4 flex justify-center">
          <div className="max-w-xl w-full bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white">Featured Movie Unavailable</h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md">
              {heroError || 'Unable to connect to TMDB movie service.'}
            </p>
            <button
              type="button"
              onClick={() => setHeroRetryKey((prev) => prev + 1)}
              className="mt-2 px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}

      <div className="page-container">
        {/* 2. Deretan Horizontal Movie Carousels (MovieRow ala Netflix) */}
        <section className="home__movie-rows mb-12">
          <MovieRow
            fetchUrl="/trending/movie/week"
            title="🔥 Trending This Week"
            onToggleFavorite={toggleFavorite}
            isFavorite={isFavorite}
          />
          <MovieRow
            fetchUrl="/movie/top_rated"
            title="⭐ Top Rated Classics"
            onToggleFavorite={toggleFavorite}
            isFavorite={isFavorite}
          />
          <MovieRow
            fetchUrl="/discover/movie?with_genres=28&sort_by=popularity.desc"
            title="💥 Action Blockbusters"
            onToggleFavorite={toggleFavorite}
            isFavorite={isFavorite}
          />
          <MovieRow
            fetchUrl="/movie/upcoming"
            title="🚀 Upcoming in Theaters"
            onToggleFavorite={toggleFavorite}
            isFavorite={isFavorite}
          />
        </section>

        {/* 3. Section Trending Feature Requests / Top Community Feedback */}
        {topFeedbacks.length > 0 && (
          <section className="home__feedback-section mt-16 pt-10 border-t border-zinc-800/80" aria-labelledby="home-feedback-heading">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs uppercase tracking-widest font-semibold text-red-500">
                    Community Spotlight
                  </span>
                </div>
                <h2 id="home-feedback-heading" className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  🔥 Trending Feature Requests
                </h2>
              </div>

              <Link
                to="/feedback"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-400 hover:text-white transition-colors group self-start sm:self-auto"
              >
                <span>Explore all ideas</span>
                <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
              </Link>
            </div>

            {/* Grid Kartu (Maksimal 3 kolom) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topFeedbacks.map((item) => {
                const currentUpvotes = Array.isArray(item.upvotes) ? item.upvotes : [];
                const hasVoted = Boolean(user?.uid && currentUpvotes.includes(user.uid));
                const catBadge = CATEGORY_BADGES[item.category] || CATEGORY_BADGES['Feature Request'];

                return (
                  <div
                    key={item.id}
                    onClick={() => navigate('/feedback')}
                    className="bg-zinc-900/60 hover:bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700/80 rounded-xl p-5 transition-all duration-200 flex flex-col justify-between group shadow-lg hover:shadow-xl hover:shadow-black/50 cursor-pointer"
                  >
                    <div>
                      {/* Badge Kategori (Fitur / Bug / Saran) */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${catBadge.badgeClass}`}
                        >
                          {catBadge.icon}
                          <span>{catBadge.label}</span>
                        </span>
                      </div>

                      {/* Judul Feedback Tebal */}
                      <h3 className="text-base font-bold text-white group-hover:text-red-400 transition-colors line-clamp-1 mb-2">
                        {item.title}
                      </h3>

                      {/* Potongan Ringkas Deskripsi (line-clamp-2) */}
                      <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed line-clamp-2 mb-4">
                        {item.description}
                      </p>
                    </div>

                    {/* Bagian Bawah Kartu: Avatar/Nama & Tombol Upvote */}
                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-800/60 mt-auto">
                      {/* Info Pengusul */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700/60">
                          {item.userPhoto ? (
                            <img
                              src={item.userPhoto}
                              alt={item.userName || 'User'}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="text-[10px] font-semibold text-zinc-300 uppercase">
                              {(item.userName || 'A').charAt(0)}
                            </span>
                          )}
                        </div>

                        {item.userId && item.userId !== 'anonymous' ? (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/user/${item.userId}`);
                            }}
                            className="text-xs text-zinc-400 hover:text-white truncate font-medium hover:underline"
                            title={item.userName}
                          >
                            {item.userName || 'Member'}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-500 truncate font-medium">
                            {item.userName || 'Anonymous'}
                          </span>
                        )}
                      </div>

                      {/* Tombol Upvote Interaktif */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleUpvote(item, e)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          hasVoted
                            ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                            : 'bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-400 hover:text-white border-zinc-700/60'
                        }`}
                        aria-label={`Upvote idea ${item.title}`}
                        title={hasVoted ? 'Remove upvote' : 'Upvote idea'}
                      >
                        <svg
                          className={`w-3.5 h-3.5 transition-transform ${
                            hasVoted ? 'scale-110' : 'group-hover/btn:-translate-y-0.5'
                          }`}
                          viewBox="0 0 24 24"
                          fill={hasVoted ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="18 15 12 9 6 15" />
                        </svg>
                        <span>{currentUpvotes.length}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Trailer modal */}
      {trailerOpen && heroTrailerKey && (
        <TrailerModal
          trailerKey={heroTrailerKey}
          title={hero?.title || 'Trailer'}
          onClose={() => setTrailerOpen(false)}
        />
      )}
    </div>
  );
}
