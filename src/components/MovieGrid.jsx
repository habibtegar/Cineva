import MovieCard from './MovieCard';
import './MovieGrid.css';

export default function MovieGrid({ title, movies, onToggleFavorite, isFavorite }) {
  if (!movies || movies.length === 0) return null;

  return (
    <section className="movie-grid">
      {title && <h2 className="movie-grid__title">{title}</h2>}
      <div className="movie-grid__list grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
        {movies.map((movie) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            onToggleFavorite={onToggleFavorite}
            isFavorite={isFavorite ? isFavorite(movie.id) : false}
          />
        ))}
      </div>
    </section>
  );
}

