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
import MovieGrid from '../components/MovieGrid';
import MovieCardSkeleton from '../components/MovieCardSkeleton';
import TrailerModal from '../components/TrailerModal';
import { SkeletonHero } from '../components/Skeleton';
import ErrorState from '../components/ErrorState';
import {
  getTrending,
  getPopular,
  getTopRated,
  getUpcoming,
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

const TABS = [
  { key: 'trending',  label: 'Trending' },
  { key: 'popular',   label: 'Popular' },
  { key: 'topRated',  label: 'Top Rated' },
  { key: 'upcoming',  label: 'Upcoming' },
];

const PAGE_SIZE = 12;

export default function Home({ toggleFavorite, isFavorite }) {
  // Hero
  const [hero, setHero] = useState(null);
  const [heroTrailerKey, setHeroTrailerKey] = useState(null);
  const [trailerOpen, setTrailerOpen] = useState(false);

  // Daftar film (movies) & State Halaman (page)
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Active category tab
  const [activeTab, setActiveTab] = useState('trending');

  // Genre filter (applied to the active tab)
  const [genres, setGenres] = useState([]);
  const [activeGenre, setActiveGenre] = useState('');

  // Global load & pagination state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Auth & Navigation
  const { user } = useAuth();
  const navigate = useNavigate();

  // Top Community Feedbacks
  const [topFeedbacks, setTopFeedbacks] = useState([]);

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

        // Urutkan berdasarkan upvotes terbanyak, lalu tanggal terbaru
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

        // Ambil maksimal 3 feedback teratas
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

    // Optimistic UI update agar seketika berubah
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

  // Dynamic Document Title: ubah judul tab browser untuk halaman Home
  useEffect(() => {
    document.title = 'Home - Cineva';
  }, []);

  // Fetch official TMDB genre list on mount
  useEffect(() => {
    getGenres()
      .then((data) => setGenres(data.genres || []))
      .catch((err) => console.error('Failed to fetch genres:', err));
  }, []);

  // Fetch hero trailer key once hero is set
  useEffect(() => {
    if (!hero) return;
    getMovieDetail(hero.id)
      .then((detail) => {
        const trailer = getTrailerVideo(detail.videos?.results);
        setHeroTrailerKey(trailer?.key || null);
      })
      .catch(() => {});
  }, [hero]);

  // Fetch movies whenever activeTab, page, or retryCount changes
  useEffect(() => {
    let isCancelled = false;

    const fetchCategoryMovies = async () => {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      try {
        const fetchFn = {
          trending: (p) => getTrending('week', p),
          popular: (p) => getPopular(p),
          topRated: (p) => getTopRated(p),
          upcoming: (p) => getUpcoming(p),
        }[activeTab] || getPopular;

        // Parameter API: Pemanggilan API TMDB dengan parameter halaman dinamis (&page=${page})
        const data = await fetchFn(page);
        if (isCancelled) return;

        // Penggabungan Array (Append):
        // Saat hasil fetch berhasil, jangan langsung menimpa state film lama. Gunakan logika spread operator
        setMovies((prevMovies) => (page === 1 ? (data.results || []) : [...prevMovies, ...(data.results || [])]));
        setTotalPages(data.total_pages || 1);

        // Pilih film acak dari hasil fetch untuk banner Hero jika belum di-set
        if (!hero && data.results && data.results.length > 0) {
          const randomIndex = Math.floor(Math.random() * data.results.length);
          setHero(data.results[randomIndex]);
        }
      } catch (err) {
        if (isCancelled) return;
        console.error('Failed to fetch movies:', err);
        setError('Failed to load movies. Please check your API key and try again.');
      } finally {
        if (!isCancelled) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    };

    fetchCategoryMovies();

    return () => {
      isCancelled = true;
    };
  }, [activeTab, page, retryCount]);

  // Ganti tab kategori dan reset halaman ke 1
  const handleTabChange = (tabKey) => {
    if (tabKey === activeTab) return;
    setActiveTab(tabKey);
    setPage(1);
  };

  // Fungsi Klik: Buat fungsi penanganan tombol yang akan menambah angka halaman
  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  // Filter film tab aktif berdasarkan genre terpilih
  const currentMovies = activeGenre
    ? movies.filter((movie) => movie.genre_ids?.includes(Number(activeGenre)))
    : movies;

  const currentTabLabel = TABS.find((t) => t.key === activeTab)?.label || '';
  const currentGenreLabel = genres.find((g) => g.id === Number(activeGenre))?.name || '';
  
  // Dynamic section title — e.g. "Trending • Action" or "Top Rated Movies"
  const sectionTitle = activeGenre
    ? `${currentTabLabel} • ${currentGenreLabel}`
    : `${currentTabLabel} Movies`;

  if (error) {
    return (
      <div className="page-container" style={{ paddingTop: 80 }}>
        <ErrorState message={error} onRetry={() => { setError(null); setPage(1); setRetryCount((c) => c + 1); }} />
      </div>
    );
  }

  return (
    <div className="home">
      {/* Hero */}
      {loading && page === 1 ? (
        <SkeletonHero />
      ) : (
        <HeroSection
          movie={hero}
          genres={genres}
          onWatchTrailer={heroTrailerKey ? () => setTrailerOpen(true) : undefined}
        />
      )}

      <div className="page-container">
        {/* ---- Category tabs (left) + Genre filter (right) ---- */}
        <div className="home__controls">
          {/* Tabs: Trending, Popular, Top Rated, Upcoming */}
          <div className="home__tabs flex overflow-x-auto scrollbar-none gap-2 pb-1" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key}
                className={`home__tab shrink-0${activeTab === tab.key ? ' home__tab--active' : ''}`}
                onClick={() => handleTabChange(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Genre filter dropdown */}
          {genres.length > 0 && (
            <div className="home__genre-filter">
              <div className="home__select-inner">
                <select
                  className="home__select"
                  value={activeGenre}
                  onChange={(e) => setActiveGenre(e.target.value)}
                  aria-label="Filter by genre"
                >
                  <option value="">All Genres</option>
                  {genres.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <svg className="home__select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              {activeGenre && (
                <button
                  type="button"
                  className="home__reset-genre"
                  onClick={() => setActiveGenre('')}
                  title="Reset genre filter"
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </div>

        {/* ---- Movie section ---- */}
        {loading && page === 1 ? (
          <section className="movie-grid">
            <div className="movie-grid__list grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
              {Array.from({ length: PAGE_SIZE }).map((_, index) => (
                <MovieCardSkeleton key={index} />
              ))}
            </div>
          </section>
        ) : currentMovies.length > 0 ? (
          <>
            <MovieGrid
              title={sectionTitle}
              movies={currentMovies}
              onToggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
            />

            {/* Load More */}
            {page < totalPages && (
              <div className="home__load-more">
                <button
                  className="home__load-btn"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <span className="home__load-spinner" />
                      <span>Loading...</span>
                    </span>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          /* Empty state when genre filter finds no movies in this tab */
          <div className="home__empty-filter">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <p className="home__empty-title">
              No movies found for <strong>{currentGenreLabel}</strong> in <strong>{currentTabLabel}</strong>.
            </p>
            <button
              onClick={() => setActiveGenre('')}
              className="home__empty-reset"
            >
              Show All {currentTabLabel} Movies
            </button>
          </div>
        )}

        {/* ---- Top Community Feedback Section (Fallback: Sembunyikan jika belum ada feedback) ---- */}
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
