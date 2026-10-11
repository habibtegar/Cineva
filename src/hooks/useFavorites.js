import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from './firebase';
import { useAuth } from './useAuth';

/**
 * Hook to manage favorite movies stored in Firebase Cloud Firestore.
 * Synchronized with the logged-in Google account under users/{user.uid}/favorites.
 */
export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  // Ambil daftar film favorit dari Firestore berdasarkan user.uid saat aplikasi dimuat atau user berubah
  useEffect(() => {
    let isMounted = true;

    async function fetchFavorites() {
      if (!user?.uid) {
        setFavorites([]);
        return;
      }

      setLoading(true);
      try {
        const favsRef = collection(db, 'users', user.uid, 'favorites');
        const querySnapshot = await getDocs(favsRef);
        if (isMounted) {
          const loadedFavorites = querySnapshot.docs.map((docSnap) => ({
            id: docSnap.data().id ?? (Number(docSnap.id) || docSnap.id),
            ...docSnap.data(),
          }));
          setFavorites(loadedFavorites);
        }
      } catch (error) {
        console.error('Failed to load favorites from Firestore:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchFavorites();

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  const isFavorite = useCallback(
    (movieId) => favorites.some((m) => String(m.id) === String(movieId)),
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (movie) => {
      // Tombol 'Favorite' hanya bisa diklik jika pengguna sudah login (cek dari AuthContext)
      if (!user?.uid) {
        toast.error('Silakan login untuk menyimpan film');
        return;
      }

      const movieIdStr = String(movie.id);
      const isAlreadyFav = favorites.some((m) => String(m.id) === movieIdStr);
      const movieDocRef = doc(db, 'users', user.uid, 'favorites', movieIdStr);

      if (isAlreadyFav) {
        // Optimistic update: hapus dari state lokal
        setFavorites((prev) => prev.filter((m) => String(m.id) !== movieIdStr));

        try {
          await deleteDoc(movieDocRef);
          toast.success('Dihapus dari favorit');
        } catch (error) {
          console.error('Failed to remove favorite from Firestore:', error);
          // Rollback jika gagal
          setFavorites((prev) => [...prev, movie]);
          toast.error('Gagal menghapus dari favorit');
        }
      } else {
        const movieData = {
          id: movie.id,
          title: movie.title || '',
          poster_path: movie.poster_path || '',
          release_date: movie.release_date || '',
          vote_average: movie.vote_average ?? 0,
        };

        // Optimistic update: tambahkan ke state lokal
        setFavorites((prev) => [...prev, movieData]);

        try {
          await setDoc(movieDocRef, movieData);
          toast.success('Berhasil ditambahkan ke favorit');
        } catch (error) {
          console.error('Failed to save favorite to Firestore:', error);
          // Rollback jika gagal
          setFavorites((prev) => prev.filter((m) => String(m.id) !== movieIdStr));
          toast.error('Gagal menambahkan ke favorit');
        }
      }
    },
    [user, favorites]
  );

  return { favorites, isFavorite, toggleFavorite, loading };
}
