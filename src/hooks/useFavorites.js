import React, { useState, useEffect, useCallback, useRef } from 'react';
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

// ID unik statis untuk memastikan hanya ada 1 toast favorit di layar dan tidak menumpuk
const FAVORITE_TOAST_ID = 'cineva-favorite-toast';

// Cooldown proteksi spam klik (350ms)
const SPAM_COOLDOWN_MS = 350;
let lastFavoriteActionTime = 0;

// Ikon hati merah menyala (glowing red heart) untuk notifikasi penambahan favorit
const glowingRedHeartIcon = React.createElement(
  'svg',
  {
    viewBox: '0 0 24 24',
    fill: '#ef4444',
    className: 'w-5 h-5 shrink-0 animate-pulse',
    style: {
      filter:
        'drop-shadow(0 0 8px rgba(239, 68, 68, 0.95)) drop-shadow(0 0 16px rgba(220, 38, 38, 0.6))',
    },
    'aria-hidden': 'true',
  },
  React.createElement('path', {
    d: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  })
);

// Ikon hati abu-abu (gray heart) untuk notifikasi penghapusan favorit
const grayHeartIcon = React.createElement(
  'svg',
  {
    viewBox: '0 0 24 24',
    fill: '#9ca3af',
    className: 'w-5 h-5 shrink-0 opacity-80',
    style: {
      filter: 'drop-shadow(0 0 4px rgba(156, 163, 175, 0.35))',
    },
    'aria-hidden': 'true',
  },
  React.createElement('path', {
    d: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  })
);

/**
 * Hook to manage favorite movies stored in Firebase Cloud Firestore.
 * Synchronized with the logged-in Google account under users/{user.uid}/favorites.
 */
export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const pendingOperationsRef = useRef(new Set());

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
      if (!movie || !movie.id) return;

      const now = Date.now();
      // Proteksi spam klik beruntun (cooldown 350ms)
      if (now - lastFavoriteActionTime < SPAM_COOLDOWN_MS) {
        return;
      }

      const movieIdStr = String(movie.id);

      // Cegah operasi ganda saat Firestore masih memproses film yang sama
      if (pendingOperationsRef.current.has(movieIdStr)) {
        return;
      }

      lastFavoriteActionTime = now;

      // Tombol 'Favorite' hanya bisa diklik jika pengguna sudah login (cek dari AuthContext)
      if (!user?.uid) {
        toast.dismiss();
        toast.error('Silakan login untuk menyimpan film', {
          id: FAVORITE_TOAST_ID,
          position: 'top-center',
          duration: 3000,
        });
        return;
      }

      pendingOperationsRef.current.add(movieIdStr);
      const movieTitle = movie.title || movie.name || 'Film';
      const isAlreadyFav = favorites.some((m) => String(m.id) === movieIdStr);
      const movieDocRef = doc(db, 'users', user.uid, 'favorites', movieIdStr);

      if (isAlreadyFav) {
        // Optimistic update: hapus dari state lokal
        setFavorites((prev) => prev.filter((m) => String(m.id) !== movieIdStr));

        // Dismiss notifikasi lama seketika agar tidak menumpuk dan tampilkan yang terbaru
        toast.dismiss();
        toast(
          React.createElement(
            'span',
            {
              key: `fav-rem-${movieIdStr}-${Date.now()}`,
              className: 'text-zinc-200 text-sm font-medium tracking-wide flex items-center',
            },
            React.createElement(
              'strong',
              { className: 'font-semibold text-white mr-1' },
              movieTitle
            ),
            'dihapus dari favorit'
          ),
          {
            id: FAVORITE_TOAST_ID,
            position: 'top-center',
            duration: 3000,
            icon: grayHeartIcon,
            style: {
              border: '1px solid rgba(239, 68, 68, 0.45)',
              boxShadow:
                '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 25px rgba(220, 38, 38, 0.22)',
            },
          }
        );

        try {
          await deleteDoc(movieDocRef);
        } catch (error) {
          console.error('Failed to remove favorite from Firestore:', error);
          // Rollback jika gagal
          setFavorites((prev) => [...prev, movie]);
          toast.dismiss();
          toast.error(`Gagal menghapus ${movieTitle} dari favorit`, {
            id: FAVORITE_TOAST_ID,
            position: 'top-center',
            duration: 3000,
          });
        } finally {
          pendingOperationsRef.current.delete(movieIdStr);
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

        // Dismiss notifikasi lama seketika agar tidak menumpuk dan tampilkan yang terbaru
        toast.dismiss();
        toast(
          React.createElement(
            'span',
            {
              key: `fav-add-${movieIdStr}-${Date.now()}`,
              className: 'text-zinc-200 text-sm font-medium tracking-wide flex items-center',
            },
            React.createElement(
              'strong',
              { className: 'font-semibold text-white mr-1' },
              movieTitle
            ),
            'ditambahkan ke favorit'
          ),
          {
            id: FAVORITE_TOAST_ID,
            position: 'top-center',
            duration: 3000,
            icon: glowingRedHeartIcon,
            style: {
              border: '1px solid rgba(239, 68, 68, 0.45)',
              boxShadow:
                '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 25px rgba(220, 38, 38, 0.25)',
            },
          }
        );

        try {
          await setDoc(movieDocRef, movieData);
        } catch (error) {
          console.error('Failed to save favorite to Firestore:', error);
          // Rollback jika gagal
          setFavorites((prev) => prev.filter((m) => String(m.id) !== movieIdStr));
          toast.dismiss();
          toast.error(`Gagal menambahkan ${movieTitle} ke favorit`, {
            id: FAVORITE_TOAST_ID,
            position: 'top-center',
            duration: 3000,
          });
        } finally {
          pendingOperationsRef.current.delete(movieIdStr);
        }
      }
    },
    [user, favorites]
  );

  return { favorites, isFavorite, toggleFavorite, loading };
}
