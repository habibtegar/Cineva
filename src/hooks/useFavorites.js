import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'cineva_favorites';

function readFavorites() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function writeFavorites(favorites) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
}

/**
 * Hook to manage favorite movies in localStorage.
 * Returns { favorites, isFavorite, toggleFavorite }
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState(readFavorites);

  // Sync state to localStorage whenever favorites change
  useEffect(() => {
    writeFavorites(favorites);
  }, [favorites]);

  const isFavorite = useCallback(
    (movieId) => favorites.some((m) => m.id === movieId),
    [favorites]
  );

  const toggleFavorite = useCallback((movie) => {
    setFavorites((prev) => {
      const exists = prev.some((m) => m.id === movie.id);
      if (exists) {
        return prev.filter((m) => m.id !== movie.id);
      }
      // Store only the essential fields to keep localStorage lean
      return [
        ...prev,
        {
          id: movie.id,
          title: movie.title,
          poster_path: movie.poster_path,
          release_date: movie.release_date,
          vote_average: movie.vote_average,
        },
      ];
    });
  }, []);

  return { favorites, isFavorite, toggleFavorite };
}
