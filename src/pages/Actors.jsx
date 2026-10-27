import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPopularActors, getImageUrl } from '../services/tmdb';
import ErrorState from '../components/ErrorState';

function ActorCardSkeleton() {
  return (
    <div className="flex flex-col animate-pulse">
      <div className="aspect-[2/3] w-full rounded-xl bg-zinc-800/60 border border-zinc-800/80" />
      <div className="h-4 w-3/4 bg-zinc-800/80 rounded mt-2.5" />
      <div className="h-3 w-1/2 bg-zinc-800/50 rounded mt-1.5" />
    </div>
  );
}

function ActorCard({ person }) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  const photo = !imgError && person.profile_path ? getImageUrl(person.profile_path, 'w500') : null;
  const initial = person.name ? person.name.charAt(0).toUpperCase() : '?';

  // Extract 1-2 titles from known_for (movies: title, TV shows: name)
  const knownForTitles = person.known_for
    ?.map((item) => item.title || item.name)
    .filter(Boolean)
    .slice(0, 2)
    .join(', ');

  const handleNavigate = () => {
    navigate(`/person/${person.id}`);
  };

  return (
    <div
      onClick={handleNavigate}
      className="group flex flex-col cursor-pointer transition-all duration-300 hover:scale-105"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNavigate();
        }
      }}
      aria-label={`View details for ${person.name}`}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800/80 shadow-md group-hover:border-zinc-700/80 group-hover:shadow-xl group-hover:shadow-red-600/10 transition-all duration-300">
        {photo ? (
          <img
            src={photo}
            alt={person.name}
            className="w-full h-full object-cover rounded-xl transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900/90 text-zinc-500 rounded-xl p-4">
            <div className="w-16 h-16 rounded-full bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center mb-2 shadow-inner">
              {initial ? (
                <span className="text-xl font-bold text-zinc-300">{initial}</span>
              ) : (
                <svg
                  className="w-8 h-8 text-zinc-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </div>
            <span className="text-xs text-zinc-500 font-medium">No Photo</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none rounded-b-xl" />
      </div>

      <h3 className="font-semibold text-white mt-2 group-hover:text-red-500 transition-colors text-sm md:text-base line-clamp-1">
        {person.name}
      </h3>

      <p className="text-xs text-zinc-400 truncate mt-0.5" title={knownForTitles}>
        {knownForTitles || person.known_for_department || 'Actor'}
      </p>
    </div>
  );
}

export default function Actors() {
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Set document title
  useEffect(() => {
    document.title = 'Popular Actors - Cineva';
  }, []);

  const fetchActors = useCallback((pageNum) => {
    setLoading(true);
    setError(null);

    getPopularActors(pageNum)
      .then((data) => {
        setActors(data.results || []);
        // TMDB max page limit is 500
        setTotalPages(Math.min(data.total_pages || 1, 500));
      })
      .catch((err) => {
        console.error('Failed to fetch popular actors:', err);
        setError('Failed to load popular actors. Please check your internet connection.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchActors(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [fetchActors, page]);

  const handlePrevPage = () => {
    if (page > 1) {
      setPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage((prev) => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white pt-24 md:pt-28 pb-16">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 md:px-8">
        {/* Header Halaman */}
        <div className="relative mb-8 md:mb-10">
          {/* Subtle cinematic glow accent */}
          <div className="absolute -top-10 left-0 w-72 h-36 bg-red-600/10 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-red-950/40 text-red-400 border border-red-500/30 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Featured Talents
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight uppercase">
                Popular <span className="text-red-600 drop-shadow-[0_0_25px_rgba(220,38,38,0.45)]">Actors</span>
              </h1>
              <p className="mt-2 text-sm sm:text-base text-zinc-400 font-normal max-w-xl">
                Explore the most popular actors and celebrities right now.
              </p>
            </div>

            {/* Current page indicator pill */}
            {!loading && !error && (
              <div className="text-xs text-zinc-400 bg-zinc-900/80 border border-zinc-800 rounded-lg px-3 py-1.5 self-start md:self-end">
                Page <span className="text-white font-medium">{page}</span> of{' '}
                <span className="text-white font-medium">{totalPages}</span>
              </div>
            )}
          </div>
        </div>

        {/* State: Error */}
        {error ? (
          <div className="py-16">
            <ErrorState message={error} onRetry={() => fetchActors(page)} />
          </div>
        ) : loading ? (
          /* State: Loading / Skeleton */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {Array.from({ length: 20 }).map((_, idx) => (
              <ActorCardSkeleton key={idx} />
            ))}
          </div>
        ) : (
          /* State: Success / Grid */
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {actors.map((person) => (
                <ActorCard key={person.id} person={person} />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-12 pt-6 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={page <= 1}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5"
                  aria-label="Previous page"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Previous
                </button>

                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  <span className="px-3.5 py-1.5 rounded-lg bg-red-600 text-white shadow-lg shadow-red-600/30">
                    {page}
                  </span>
                  <span className="text-zinc-500 px-1">/</span>
                  <span className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400">
                    {totalPages}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={page >= totalPages}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5"
                  aria-label="Next page"
                >
                  Next
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
