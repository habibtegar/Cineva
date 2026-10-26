import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
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
const FAVORITE_TOAST_ID = 'fav-modal-toast';

// Cooldown proteksi spam klik (350ms)
const SPAM_COOLDOWN_MS = 350;
let lastFavoriteActionTime = 0;

/**
 * Toast feedback modal modern di tengah layar untuk penambahan / penghapusan favorit.
 */
function showFavoriteModalToast(isAdded) {
  // Dismiss notifikasi favorit sebelumnya seketika agar tidak menumpuk
  toast.dismiss(FAVORITE_TOAST_ID);

  toast.custom(
    (t) => {
      const content = (
        <div
          className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-zinc-900/95 text-white px-6 py-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-2xl border border-zinc-800/80 backdrop-blur-md min-w-[200px] pointer-events-none select-none transition-all duration-200 ease-out ${
            t.visible ? 'opacity-100 scale-100 fav-modal-enter' : 'opacity-0 scale-95'
          }`}
          role="status"
          aria-live="polite"
        >
          {/* Ikon melingkar di atas */}
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
            {isAdded ? (
              <svg
                viewBox="0 0 24 24"
                fill="#ef4444"
                stroke="#ef4444"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                aria-hidden="true"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6 text-zinc-400"
                aria-hidden="true"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            )}
          </div>

          {/* Teks di bawah */}
          <span className="text-sm font-medium text-zinc-100 tracking-wide text-center">
            {isAdded ? 'Added to Favorites' : 'Removed from Favorites'}
          </span>
        </div>
      );

      return typeof document !== 'undefined'
        ? createPortal(content, document.body)
        : content;
    },
    {
      id: FAVORITE_TOAST_ID,
      duration: 1200,
    }
  );
}

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
          id: 'cineva-auth-toast',
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

        // Tampilkan feedback pop-up kotak di tengah layar
        showFavoriteModalToast(false);

        try {
          await deleteDoc(movieDocRef);
        } catch (error) {
          console.error('Failed to remove favorite from Firestore:', error);
          // Rollback jika gagal
          setFavorites((prev) => [...prev, movie]);
          toast.dismiss(FAVORITE_TOAST_ID);
          toast.error(`Gagal menghapus ${movieTitle} dari favorit`, {
            id: 'cineva-error-toast',
            position: 'top-center',
            duration: 3000,
          });
        } finally {
          pendingOperationsRef.current.delete(movieIdStr);
        }
        const movieData = {
          id: movie.id,
          title: movie.title || movie.name || '',
          poster_path: movie.poster_path || '',
          release_date: movie.release_date || movie.first_air_date || '',
          vote_average: movie.vote_average ?? 0,
          media_type: movie.media_type || (movie.name ? 'tv' : 'movie'),
        };

        // Optimistic update: tambahkan ke state lokal
        setFavorites((prev) => [...prev, movieData]);

        // Tampilkan feedback pop-up kotak di tengah layar
        showFavoriteModalToast(true);

        try {
          await setDoc(movieDocRef, movieData);
        } catch (error) {
          console.error('Failed to save favorite to Firestore:', error);
          // Rollback jika gagal
          setFavorites((prev) => prev.filter((m) => String(m.id) !== movieIdStr));
          toast.dismiss(FAVORITE_TOAST_ID);
          toast.error(`Gagal menambahkan ${movieTitle} ke favorit`, {
            id: 'cineva-error-toast',
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

export default useFavorites;

