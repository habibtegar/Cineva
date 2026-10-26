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
 * Normalisasi data film atau serial TV ke skema standar Cineva
 */
function normalizeFavoriteData(item, explicitMediaType) {
  const mediaType = explicitMediaType || item.media_type || (item.name ? 'tv' : 'movie');
  return {
    id: item.id,
    media_type: mediaType === 'tv' ? 'tv' : 'movie',
    title: item.title || item.name || 'Untitled',
    poster_path: item.poster_path || '',
    vote_average: item.vote_average || 0,
    release_date: item.release_date || item.first_air_date || '',
  };
}

/**
 * Hook to manage favorites (movies & TV series) stored in Firebase Cloud Firestore.
 * Synchronized with the logged-in Google account under users/{user.uid}/favorites.
 */
export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const pendingOperationsRef = useRef(new Set());

  // Ambil daftar film & serial TV favorit dari Firestore berdasarkan user.uid
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
          const loadedFavorites = querySnapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            const rawType = data.media_type || (data.name ? 'tv' : 'movie');
            const mediaType = rawType === 'tv' ? 'tv' : 'movie';
            const rawId = data.id ?? (Number(docSnap.id.replace(/^(movie|tv)_/, '')) || docSnap.id);

            return {
              ...data,
              id: rawId,
              media_type: mediaType,
              title: data.title || data.name || 'Untitled',
              poster_path: data.poster_path || '',
              vote_average: data.vote_average || 0,
              release_date: data.release_date || data.first_air_date || '',
              docId: docSnap.id,
            };
          });
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

  /**
   * Cek apakah item sudah masuk favorit berdasarkan ID dan opsional tipe media ('movie' | 'tv')
   */
  const isFavorite = useCallback(
    (itemId, mediaType) => {
      if (!itemId) return false;
      const targetIdStr = String(itemId);
      return favorites.some((item) => {
        const matchId = String(item.id) === targetIdStr;
        if (!matchId) return false;
        if (mediaType) {
          const itemType = item.media_type || (item.name ? 'tv' : 'movie');
          return itemType === mediaType;
        }
        return true;
      });
    },
    [favorites]
  );

  /**
   * Tambah atau hapus favorit secara aman dengan ID unik per tipe media
   */
  const toggleFavorite = useCallback(
    async (item, explicitMediaType) => {
      if (!item || !item.id) return;

      const now = Date.now();
      if (now - lastFavoriteActionTime < SPAM_COOLDOWN_MS) {
        return;
      }

      const mediaType = explicitMediaType || item.media_type || (item.name ? 'tv' : 'movie');
      const normalizedData = normalizeFavoriteData(item, mediaType);
      const uniqueDocId = `${normalizedData.media_type}_${normalizedData.id}`;
      const itemIdStr = String(normalizedData.id);

      // Cegah race-condition / spam klik bersamaan
      if (pendingOperationsRef.current.has(uniqueDocId)) {
        return;
      }

      lastFavoriteActionTime = now;

      // Wajib login untuk menyimpan favorit
      if (!user?.uid) {
        toast.dismiss();
        toast.error('Silakan login untuk menyimpan favorit', {
          id: 'cineva-auth-toast',
          position: 'top-center',
          duration: 3000,
        });
        return;
      }

      pendingOperationsRef.current.add(uniqueDocId);
      const displayTitle = normalizedData.title || 'Item';

      // Cek apakah item sudah ada di daftar favorit
      const existingItem = favorites.find(
        (m) =>
          String(m.id) === itemIdStr &&
          (m.media_type || (m.name ? 'tv' : 'movie')) === normalizedData.media_type
      );
      const isAlreadyFav = Boolean(existingItem);

      if (isAlreadyFav) {
        // --- HAPUS DARI FAVORIT ---
        // Optimistic update
        setFavorites((prev) =>
          prev.filter(
            (m) =>
              !(
                String(m.id) === itemIdStr &&
                (m.media_type || (m.name ? 'tv' : 'movie')) === normalizedData.media_type
              )
          )
        );

        showFavoriteModalToast(false);

        try {
          const targetDocId = existingItem?.docId || uniqueDocId;
          const movieDocRef = doc(db, 'users', user.uid, 'favorites', targetDocId);
          await deleteDoc(movieDocRef);

          // Jika ada dokumen legacy tanpa prefix tipe media, bersihkan juga
          if (targetDocId !== itemIdStr) {
            try {
              const legacyDocRef = doc(db, 'users', user.uid, 'favorites', itemIdStr);
              await deleteDoc(legacyDocRef);
            } catch {
              // Abaikan jika tidak ada dokumen legacy
            }
          }
        } catch (error) {
          console.error('Failed to remove favorite from Firestore:', error);
          // Rollback jika gagal
          setFavorites((prev) => [...prev, existingItem || normalizedData]);
          toast.dismiss(FAVORITE_TOAST_ID);
          toast.error(`Gagal menghapus ${displayTitle} dari favorit`, {
            id: 'cineva-error-toast',
            position: 'top-center',
            duration: 3000,
          });
        } finally {
          pendingOperationsRef.current.delete(uniqueDocId);
        }
      } else {
        // --- TAMBAH KE FAVORIT ---
        const itemToSave = {
          ...normalizedData,
          docId: uniqueDocId,
        };

        // Optimistic update
        setFavorites((prev) => [...prev, itemToSave]);

        showFavoriteModalToast(true);

        try {
          const movieDocRef = doc(db, 'users', user.uid, 'favorites', uniqueDocId);
          await setDoc(movieDocRef, normalizedData);
        } catch (error) {
          console.error('Failed to save favorite to Firestore:', error);
          // Rollback jika gagal
          setFavorites((prev) =>
            prev.filter(
              (m) =>
                !(
                  String(m.id) === itemIdStr &&
                  (m.media_type || (m.name ? 'tv' : 'movie')) === normalizedData.media_type
                )
            )
          );
          toast.dismiss(FAVORITE_TOAST_ID);
          toast.error(`Gagal menambahkan ${displayTitle} ke favorit`, {
            id: 'cineva-error-toast',
            position: 'top-center',
            duration: 3000,
          });
        } finally {
          pendingOperationsRef.current.delete(uniqueDocId);
        }
      }
    },
    [user, favorites]
  );

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    addToFavorites: toggleFavorite,
    loading,
  };
}

export default useFavorites;
