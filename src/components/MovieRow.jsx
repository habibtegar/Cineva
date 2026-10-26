import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchCustomUrl, getImageUrl } from '../services/tmdb';
import './MovieRow.css';

export default function MovieRow({
  title,
  fetchUrl,
  exploreLink,
  onToggleFavorite,
  isFavorite,
}) {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const scrollContainerRef = useRef(null);
  const navigate = useNavigate();

  // Tentukan link default jika exploreLink tidak disediakan
  const targetExploreLink = exploreLink || '/explore';

  // Fetch film secara independen untuk baris ini
  useEffect(() => {
    let isCancelled = false;

    async function fetchRowMovies() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchCustomUrl(fetchUrl);
        if (!isCancelled) {
          // Ambil daftar film (TMDB results)
          const results = data.results || [];
          setMovies(results);
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error(`Error fetching movies for ${title}:`, err);
          setError('Failed to load movies.');
          setLoading(false);
        }
      }
    }

    if (fetchUrl) {
      fetchRowMovies();
    }

    return () => {
      isCancelled = true;
    };
  }, [fetchUrl, title]);

  // Cek posisi scroll untuk menampilkan/menyembunyikan panah navigasi
  const checkScrollPosition = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    checkScrollPosition();
    el.addEventListener('scroll', checkScrollPosition, { passive: true });
    window.addEventListener('resize', checkScrollPosition);

    return () => {
      el.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [movies, checkScrollPosition]);

  // Smooth scroll 500px ke kiri atau kanan
  const handleScroll = (direction) => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const scrollAmount = direction === 'left' ? -500 : 500;
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  return (
    <section className="movie-row group relative" aria-label={title}>
      {/* Header Baris: Judul Kategori (Kiri) & Tautan Explore all (Kanan) */}
      <div className="flex items-baseline justify-between mb-3 px-1">
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>{title}</span>
        </h2>

        <Link
          to={targetExploreLink}
          className="text-xs sm:text-sm font-semibold text-zinc-400 hover:text-red-500 transition-colors inline-flex items-center gap-1 group/link"
        >
          <span>Explore all</span>
          <span className="group-hover/link:translate-x-1 transition-transform duration-200">
            &rarr;
          </span>
        </Link>
      </div>

      {/* Area Carousel & Tombol Navigasi Panah Chevron */}
      <div className="relative">
        {/* Tombol Panah Kiri Melayang */}
        <button
          type="button"
          onClick={() => handleScroll('left')}
          disabled={!canScrollLeft}
          aria-label={`Scroll ${title} left`}
          className="movie-row__nav-btn movie-row__nav-btn--prev"
        >
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Tombol Panah Kanan Melayang */}
        <button
          type="button"
          onClick={() => handleScroll('right')}
          disabled={!canScrollRight}
          aria-label={`Scroll ${title} right`}
          className="movie-row__nav-btn movie-row__nav-btn--next"
        >
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Wadah Geser (Scroll Container) */}
        <div
          ref={scrollContainerRef}
          className="movie-row__scroll-container scrollbar-hide"
        >
          {loading ? (
            /* Skeleton Loading State (Independent per Baris) */
            Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={`skeleton-${idx}`}
                className="w-[140px] sm:w-[170px] md:w-[200px] flex-shrink-0 animate-pulse"
              >
                <div className="aspect-[2/3] w-full bg-zinc-800/60 rounded-xl mb-2.5 border border-zinc-800/80" />
                <div className="h-4 bg-zinc-800/70 rounded w-4/5 mb-1.5" />
                <div className="h-3 bg-zinc-800/50 rounded w-1/3" />
              </div>
            ))
          ) : error ? (
            <div className="py-6 px-4 text-xs text-zinc-500 bg-zinc-900/40 rounded-xl w-full text-center border border-zinc-800/60">
              {error}
            </div>
          ) : movies.length === 0 ? (
            <div className="py-6 px-4 text-xs text-zinc-500 bg-zinc-900/40 rounded-xl w-full text-center border border-zinc-800/60">
              No movies available.
            </div>
          ) : (
            movies.map((movie) => {
              const poster = getImageUrl(movie.poster_path, 'w342');
              const year = movie.release_date ? movie.release_date.slice(0, 4) : '—';
              const hasRating = typeof movie.vote_average === 'number' && movie.vote_average > 0;
              const ratingText = hasRating ? movie.vote_average.toFixed(1) : '-';
              const isFav = isFavorite ? isFavorite(movie.id) : false;

              return (
                <div
                  key={movie.id}
                  onClick={() => navigate(`/movie/${movie.id}`)}
                  className="movie-row__card group/card"
                >
                  {/* Poster Wrapper */}
                  <div className="movie-row__poster-wrapper">
                    {poster ? (
                      <img
                        src={poster}
                        alt={movie.title}
                        className="movie-row__poster-img"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-zinc-900 select-none">
                        <span className="text-[10px] font-black tracking-widest text-red-500 uppercase mb-2">
                          Cineva
                        </span>
                        <p className="text-xs font-semibold text-zinc-300 line-clamp-3">
                          {movie.title}
                        </p>
                      </div>
                    )}

                    {/* Badge Rating Bintang di Pojok Atas */}
                    {hasRating && (
                      <div className="movie-row__rating-badge" aria-label={`Rating: ${ratingText}`}>
                        <svg className="w-3 h-3 fill-amber-400" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        <span>{ratingText}</span>
                      </div>
                    )}

                    {/* Tombol Favorit Cepat (Bookmark) */}
                    {onToggleFavorite && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(movie);
                        }}
                        className={`movie-row__fav-btn ${isFav ? 'movie-row__fav-btn--active' : ''}`}
                        title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                        aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          viewBox="0 0 24 24"
                          fill={isFav ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Judul Film Ringkas & Tahun Rilis */}
                  <div className="pt-2">
                    <h3
                      className="text-xs sm:text-sm font-semibold text-white group-hover/card:text-red-400 transition-colors line-clamp-1"
                      title={movie.title}
                    >
                      {movie.title}
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{year}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
