import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, onSnapshot, query, where, limit, getDocs } from 'firebase/firestore';
import MovieCard from '../components/MovieCard';
import { SkeletonCard } from '../components/Skeleton';
import EditProfileModal from '../components/EditProfileModal';
import { useAuth } from '../hooks/useAuth';
import { db, auth } from '../services/firebase';
import '../components/MovieGrid.css';
import './Profile.css';

export default function PublicProfile({ toggleFavorite, isFavorite }) {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [brokenAvatarUrl, setBrokenAvatarUrl] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('recently_added');

  const isOwner = Boolean(
    (user && user.uid === userId) ||
    (auth.currentUser && auth.currentUser.uid === userId)
  );

  // Ambil data profil pengguna dari Firestore
  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    setLoadingProfile(true);

    async function fetchUserProfile() {
      try {
        // 1. Coba ambil dokumen dari koleksi users
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          if (isMounted) {
            const data = userDocSnap.data();
            setProfileData({
              displayName: data.displayName || 'Cineva Member',
              photoURL: data.photoURL || '',
              email: data.email || '',
              emailVerified: Boolean(data.emailVerified),
              createdAt: data.createdAt || null,
            });
            setLoadingProfile(false);
          }
          return;
        }

        // 2. Jika pemilik akun sedang membuka profilnya sendiri
        if (isOwner && user) {
          if (isMounted) {
            setProfileData({
              displayName: user.displayName || 'Pengguna Cineva',
              photoURL: user.photoURL || '',
              email: user.email || '',
              emailVerified: Boolean(user.emailVerified),
              createdAt: user.metadata?.creationTime || null,
            });
            setLoadingProfile(false);
          }
          return;
        }

        // 3. Fallback: Cari nama & avatar pengguna dari riwayat movie_reviews miliknya
        const reviewsQ = query(
          collection(db, 'movie_reviews'),
          where('userId', '==', userId),
          limit(1)
        );
        const reviewsSnap = await getDocs(reviewsQ);

        if (!reviewsSnap.empty) {
          const revData = reviewsSnap.docs[0].data();
          if (isMounted) {
            setProfileData({
              displayName: revData.userName || 'Cineva Member',
              photoURL: revData.userPhoto || '',
              email: '',
              emailVerified: false,
              createdAt: revData.createdAt || null,
            });
            setLoadingProfile(false);
          }
          return;
        }

        // 4. Default fallback jika pengguna belum terdaftar
        if (isMounted) {
          setProfileData({
            displayName: 'Cineva Member',
            photoURL: '',
            email: '',
            emailVerified: false,
            createdAt: null,
          });
          setLoadingProfile(false);
        }
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
        if (isMounted) {
          setProfileData({
            displayName: 'Cineva Member',
            photoURL: '',
            email: '',
            emailVerified: false,
            createdAt: null,
          });
          setLoadingProfile(false);
        }
      }
    }

    fetchUserProfile();

    return () => {
      isMounted = false;
    };
  }, [userId, isOwner, user]);

  // Real-time listener untuk koleksi film favorit publik milik userId
  useEffect(() => {
    if (!userId) return;

    setLoadingFavorites(true);
    const favsRef = collection(db, 'users', userId, 'favorites');

    const unsubscribe = onSnapshot(
      favsRef,
      (snapshot) => {
        const loadedFavs = snapshot.docs.map((docSnap) => ({
          id: docSnap.data().id ?? (Number(docSnap.id) || docSnap.id),
          ...docSnap.data(),
        }));
        setFavorites(loadedFavs);
        setLoadingFavorites(false);
      },
      (err) => {
        console.error('Failed to fetch user public favorites:', err);
        setLoadingFavorites(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // Dynamic Document Title
  useEffect(() => {
    const name = profileData?.displayName || 'User';
    document.title = `${name}'s Profile - Cineva`;
  }, [profileData?.displayName]);

  // Tanggal bergabung
  const memberSince = useMemo(() => {
    const rawTime = profileData?.createdAt;
    if (!rawTime) return null;
    try {
      let date;
      if (rawTime.toDate && typeof rawTime.toDate === 'function') {
        date = rawTime.toDate();
      } else if (rawTime.seconds) {
        date = new Date(rawTime.seconds * 1000);
      } else {
        date = new Date(rawTime);
      }
      if (isNaN(date.getTime())) return null;
      const month = date.toLocaleString('en-US', { month: 'long' });
      const year = date.getFullYear();
      return `Member since ${month} ${year}`;
    } catch {
      return null;
    }
  }, [profileData?.createdAt]);

  // Penyortiran kartu film favorit
  const sortedFavorites = useMemo(() => {
    if (!favorites || favorites.length === 0) return [];
    const list = [...favorites];
    switch (sortBy) {
      case 'highest_rating':
        return list.sort((a, b) => {
          const ratingA = Number(a.vote_average) || 0;
          const ratingB = Number(b.vote_average) || 0;
          return ratingB - ratingA;
        });
      case 'release_date':
        return list.sort((a, b) => {
          const dateA = a.release_date ? new Date(a.release_date).getTime() : 0;
          const dateB = b.release_date ? new Date(b.release_date).getTime() : 0;
          return dateB - dateA;
        });
      case 'title_asc':
        return list.sort((a, b) => {
          const titleA = (a.title || a.name || '').toLowerCase();
          const titleB = (b.title || b.name || '').toLowerCase();
          return titleA.localeCompare(titleB);
        });
      case 'recently_added':
      default:
        return list;
    }
  }, [favorites, sortBy]);

  const avatarError = Boolean(
    brokenAvatarUrl && brokenAvatarUrl === profileData?.photoURL
  );
  const displayName = profileData?.displayName || 'Cineva Member';
  const userInitial = displayName.charAt(0).toUpperCase() || 'U';
  const favoritesCount = favorites.length;

  return (
    <div className="profile-page page-container">
      {/* Back button */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 2) {
              navigate(-1);
            } else {
              navigate('/');
            }
          }}
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
      </div>

      {/* Header Profil */}
      <header className="profile-header">
        <div className="profile-header__avatar">
          {profileData?.photoURL && !avatarError ? (
            <img
              src={profileData.photoURL}
              alt={displayName}
              className="profile-header__avatar-img"
              referrerPolicy="no-referrer"
              onError={() => setBrokenAvatarUrl(profileData.photoURL)}
            />
          ) : (
            <span className="profile-header__avatar-initial">
              {userInitial}
            </span>
          )}
        </div>

        <div className="profile-header__body">
          <div className="profile-header__info">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="profile-header__name">{displayName}</h1>
              {isOwner && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-950/60 text-red-400 border border-red-500/40">
                  You
                </span>
              )}
            </div>

            {/* Status Badge & Member Since */}
            <div className="profile-header__email-row items-center gap-2.5 mt-2">
              {profileData?.emailVerified ? (
                <span
                  className="profile-header__badge profile-header__badge--verified"
                  title="Verified Account"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Verified</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800/90 text-zinc-400 border border-zinc-700/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                  <span>Member</span>
                </span>
              )}

              {memberSince && (
                <span className="profile-header__member-since text-zinc-400 text-xs flex items-center gap-1.5">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>{memberSince}</span>
                </span>
              )}
            </div>

            {/* Statistik Jumlah Favorit */}
            <div className="profile-header__stat mt-3">
              <span className="profile-header__stat-count">{favoritesCount}</span>
              <span className="profile-header__stat-label">
                {favoritesCount === 1 ? 'Favorite Movie' : 'Favorite Movies'}
              </span>
            </div>
          </div>

          {/* Logika Tombol: Tampilkan 'Edit Profile' hanya jika pengunjung adalah pemilik akun */}
          {isOwner && (
            <div className="profile-header__actions flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="profile-header__edit-btn"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Edit Profile</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Bagian Daftar Film Favorit */}
      <section className="profile-favorites">
        <div className="profile-favorites__header flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2.5">
            <h2 className="profile-favorites__title text-xl font-bold text-white m-0">
              {isOwner ? 'My Favorite Movies' : `${displayName}'s Favorite Movies`}
            </h2>
            {favoritesCount > 0 && (
              <span className="text-xs font-semibold text-zinc-400 bg-zinc-800/80 px-2.5 py-0.5 rounded-full border border-zinc-700/60">
                {favoritesCount}
              </span>
            )}
          </div>

          {/* Opsi Urutan jika ada film favorit */}
          {favoritesCount > 0 && (
            <div className="profile-sort">
              <label htmlFor="public-profile-sort" className="profile-sort__label">
                Sort by:
              </label>
              <div className="profile-sort__select-wrap">
                <select
                  id="public-profile-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="profile-sort__select"
                >
                  <option value="recently_added">Recently Added</option>
                  <option value="highest_rating">Highest Rating</option>
                  <option value="release_date">Release Date</option>
                  <option value="title_asc">Title (A-Z)</option>
                </select>
                <svg
                  className="profile-sort__chevron"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Grid Film Favorit */}
        {loadingFavorites ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {Array.from({ length: 5 }).map((_, idx) => (
              <SkeletonCard key={idx} />
            ))}
          </div>
        ) : sortedFavorites.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {sortedFavorites.map((movie) => (
              <MovieCard
                key={`${movie.media_type || 'movie'}-${movie.id}`}
                movie={movie}
                onToggleFavorite={toggleFavorite}
                isFavorite={isFavorite ? isFavorite(movie.id, movie.media_type || (movie.name ? 'tv' : 'movie')) : false}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl py-14 px-6 flex flex-col items-center justify-center text-center my-6">
            <div className="w-16 h-16 rounded-full bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center text-zinc-500 mb-4 shadow-inner">
              <svg
                className="w-8 h-8 text-zinc-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-zinc-200 mb-1">
              No favorites yet
            </p>
            <p className="text-sm text-zinc-400 max-w-sm">
              This user has not added any favorites yet
            </p>
            {isOwner && (
              <Link
                to="/"
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition shadow-lg shadow-red-600/20"
              >
                Explore Movies
              </Link>
            )}
          </div>
        )}
      </section>

      {/* Modal Edit Profile (hanya untuk pemilik akun) */}
      {isOwner && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            // Refresh data profil jika diupdate
            if (user) {
              setProfileData((prev) => ({
                ...prev,
                displayName: user.displayName || prev?.displayName,
                photoURL: user.photoURL || prev?.photoURL,
              }));
            }
          }}
        />
      )}
    </div>
  );
}
