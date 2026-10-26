import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  getDocs,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import './Feedback.css';

// Kategori Masukan & Konfigurasi Badge Warna
const CATEGORIES = [
  {
    id: 'Feature Request',
    label: 'Feature Request',
    colorClass: 'badge-feature',
    activeBtnClass: 'bg-purple-500/20 text-purple-300 border-purple-500/60 shadow-[0_0_12px_rgba(168,85,247,0.25)]',
    inactiveBtnClass: 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:border-purple-500/40 hover:text-purple-300',
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ),
  },
  {
    id: 'Bug Report',
    label: 'Bug Report',
    colorClass: 'badge-bug',
    activeBtnClass: 'bg-red-500/20 text-red-300 border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.25)]',
    inactiveBtnClass: 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:border-red-500/40 hover:text-red-300',
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="8" height="14" x="8" y="6" rx="4" />
        <path d="m19 7-3 2M5 7l3 2M19 19l-3-2M5 19l3-2M20 13h-4M4 13h4M10 4l1 2M14 4l-1 2" />
      </svg>
    ),
  },
  {
    id: 'General Feedback',
    label: 'General Feedback',
    colorClass: 'badge-general',
    activeBtnClass: 'bg-blue-500/20 text-blue-300 border-blue-500/60 shadow-[0_0_12px_rgba(59,130,246,0.25)]',
    inactiveBtnClass: 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:border-blue-500/40 hover:text-blue-300',
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

// Format tanggal ramah pengguna
function formatFeedbackDate(createdAt) {
  if (!createdAt) return 'Just now';
  let date;
  if (createdAt?.toDate) {
    date = createdAt.toDate();
  } else if (createdAt?.seconds) {
    date = new Date(createdAt.seconds * 1000);
  } else if (typeof createdAt === 'string' || typeof createdAt === 'number') {
    date = new Date(createdAt);
  } else {
    return 'Recently';
  }

  if (isNaN(date.getTime())) return 'Recently';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) {
    const mins = Math.floor(diffInSeconds / 60);
    return `${mins}m ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function Feedback() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State Form
  const [category, setCategory] = useState('Feature Request');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Daftar Saran & Filter
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('popular'); // 'popular' | 'newest'
  const [filterCategory, setFilterCategory] = useState('ALL'); // 'ALL' | category id
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamic Document Title
  useEffect(() => {
    document.title = 'Community Feedback & Requests — Cineva';
    window.scrollTo(0, 0);
  }, []);

  // Real-time listener Firestore untuk koleksi feedbacks
  useEffect(() => {
    const feedbacksRef = collection(db, 'feedbacks');

    const unsubscribe = onSnapshot(
      feedbacksRef,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setFeedbacks(items);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to feedbacks in real-time:', error);
        // Fallback coba ambil via getDocs
        getDocs(feedbacksRef)
          .then((snapshot) => {
            const items = snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            }));
            setFeedbacks(items);
          })
          .catch((err) => console.error('Fallback fetch error:', err))
          .finally(() => setLoading(false));
      }
    );

    return () => unsubscribe();
  }, []);

  // Submit Masukan Baru
  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      toast.error('Please enter a brief title for your feedback.');
      return;
    }
    if (!trimmedDescription) {
      toast.error('Please enter a detailed description.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Tentukan identitas pengirim
      const shouldBeAnon = isAnonymous || !user;
      const finalUserId = shouldBeAnon ? 'anonymous' : (user.uid || 'anonymous');
      const finalUserName = shouldBeAnon
        ? 'Anonymous User'
        : (user.displayName || user.email?.split('@')[0] || 'Anonymous User');
      const finalUserPhoto = shouldBeAnon ? '' : (user.photoURL || '');

      const newFeedbackDoc = {
        userId: finalUserId,
        userName: finalUserName,
        userPhoto: finalUserPhoto,
        category,
        title: trimmedTitle,
        description: trimmedDescription,
        upvotes: [],
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'feedbacks'), newFeedbackDoc);

      toast.success('Thank you! Your feedback has been published.');
      setTitle('');
      setDescription('');
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      toast.error('Failed to send feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Upvote (Tambah/Hapus UID pengirim)
  const handleToggleUpvote = async (feedbackItem) => {
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

    // Optimistic UI update agar responsif seketika
    setFeedbacks((prev) =>
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
      console.error('Error toggling upvote:', error);
      toast.error('Unable to register vote. Please check your connection.');
    }
  };

  // Hapus Masukan (hanya pemilik)
  const handleDeleteFeedback = async (feedbackId, feedbackTitle) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${feedbackTitle}"?`);
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'feedbacks', feedbackId));
      toast.success('Feedback deleted.');
    } catch (err) {
      console.error('Error deleting feedback:', err);
      toast.error('Failed to delete feedback.');
    }
  };

  // Filter & Urutkan Masukan
  const filteredAndSortedFeedbacks = useMemo(() => {
    let result = [...feedbacks];

    // Filter Kategori
    if (filterCategory !== 'ALL') {
      result = result.filter((item) => item.category === filterCategory);
    }

    // Filter Kata Kunci Pencarian
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.title?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.userName?.toLowerCase().includes(q)
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'popular') {
        const votesA = a.upvotes?.length || 0;
        const votesB = b.upvotes?.length || 0;
        if (votesB !== votesA) {
          return votesB - votesA;
        }
      }

      // Default atau tiebreaker: paling baru dibuat
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

    return result;
  }, [feedbacks, filterCategory, searchQuery, sortBy]);

  // Statistik Ringkas
  const stats = useMemo(() => {
    const total = feedbacks.length;
    const features = feedbacks.filter((f) => f.category === 'Feature Request').length;
    const bugs = feedbacks.filter((f) => f.category === 'Bug Report').length;
    const totalVotes = feedbacks.reduce((acc, f) => acc + (f.upvotes?.length || 0), 0);
    return { total, features, bugs, totalVotes };
  }, [feedbacks]);

  return (
    <div className="feedback-page max-w-5xl mx-auto px-4 sm:px-6">
      {/* Background Cinematic Ambient Glows */}
      <div className="feedback-page__glow-1" aria-hidden="true" />
      <div className="feedback-page__glow-2" aria-hidden="true" />

      {/* =============================================
          1. HEADER HALAMAN
          ============================================= */}
      <header className="feedback-header">
        <div className="feedback-header__badge">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>Cineva Community Hub</span>
        </div>
        <h1 className="feedback-header__title">
          <span className="feedback-header__title-gradient">Community Feedback & Requests</span>
        </h1>
        <p className="feedback-header__subtitle">
          Share your thoughts, report bugs, or vote on ideas to make Cineva better.
        </p>
      </header>

      {/* Ringkasan Statistik Interaktif */}
      <section className="feedback-stats" aria-label="Community statistics">
        <div className="feedback-stat-card">
          <div className="feedback-stat-card__val text-white">{stats.total}</div>
          <div className="feedback-stat-card__lbl">Total Posts</div>
        </div>
        <div className="feedback-stat-card">
          <div className="feedback-stat-card__val text-purple-400">{stats.features}</div>
          <div className="feedback-stat-card__lbl">Features</div>
        </div>
        <div className="feedback-stat-card">
          <div className="feedback-stat-card__val text-red-400">{stats.bugs}</div>
          <div className="feedback-stat-card__lbl">Bug Reports</div>
        </div>
        <div className="feedback-stat-card">
          <div className="feedback-stat-card__val text-emerald-400">{stats.totalVotes}</div>
          <div className="feedback-stat-card__lbl">Total Upvotes</div>
        </div>
      </section>

      {/* =============================================
          2. FORM KIRIM MASUKAN (BAGIAN ATAS)
          ============================================= */}
      <section
        className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 mb-8 backdrop-blur-md shadow-2xl relative"
        aria-labelledby="feedback-form-title"
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-500">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <div>
              <h2 id="feedback-form-title" className="text-base font-semibold text-white">
                Submit an Idea or Report
              </h2>
              <p className="text-xs text-zinc-400">
                Help us prioritize what features to build next.
              </p>
            </div>
          </div>

          {/* Indikator Akun Pengirim */}
          <div className="text-right hidden sm:block">
            {user ? (
              <span className="text-xs text-zinc-400">
                Posting as <strong className="text-zinc-200">{user.displayName || 'You'}</strong>
              </span>
            ) : (
              <span className="text-xs text-zinc-500">
                Posting as <span className="text-zinc-400">Anonymous</span>
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pilihan Kategori */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Select Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    id={`feedback-category-${cat.id.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                      isSelected ? cat.activeBtnClass : cat.inactiveBtnClass
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-current ml-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Judul Saran (Title) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="feedback-title" className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Title / Summary <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-zinc-500">
                {title.length}/100
              </span>
            </div>
            <input
              id="feedback-title"
              type="text"
              maxLength={100}
              placeholder="e.g., Add dark/light mode toggle or recommendation filters..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-950/80 border border-zinc-700/80 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
              required
            />
          </div>

          {/* Pesan Detail (Description) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="feedback-description" className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Description & Context <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-zinc-500">
                Markdown supported
              </span>
            </div>
            <textarea
              id="feedback-description"
              rows={4}
              placeholder="Provide more details, expected behavior, or why this would improve Cineva..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-950/80 border border-zinc-700/80 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all resize-y min-h-[90px]"
              required
            />
          </div>

          {/* Opsi Anonymous & Tombol Submit */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            {user ? (
              <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="feedback-anonymous-checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-950 text-red-600 focus:ring-red-500 cursor-pointer"
                />
                <span>Submit anonymously (hide my profile)</span>
              </label>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <svg className="w-3.5 h-3.5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>Submitting as guest. <Link to="/login" className="text-red-400 hover:underline">Log in</Link> to connect your account.</span>
              </div>
            )}

            <button
              id="submit-feedback-btn"
              type="submit"
              disabled={isSubmitting || !title.trim() || !description.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-sm font-semibold shadow-lg shadow-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  <span>Submit Feedback</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* =============================================
          3. DAFTAR SARAN PUBLIK (BAGIAN BAWAH)
          ============================================= */}
      <section aria-labelledby="public-feedbacks-title">
        {/* Filter Bar & Kontrol Pengurutan */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          {/* Header & Tabs Kategori */}
          <div>
            <h2 id="public-feedbacks-title" className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Public Feedbacks</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-medium">
                {filteredAndSortedFeedbacks.length}
              </span>
            </h2>

            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <button
                type="button"
                id="filter-all-btn"
                onClick={() => setFilterCategory('ALL')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  filterCategory === 'ALL'
                    ? 'bg-zinc-100 text-zinc-950 font-semibold'
                    : 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700/80'
                }`}
              >
                All
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  id={`filter-${cat.id.toLowerCase().replace(/\s+/g, '-')}-btn`}
                  onClick={() => setFilterCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                    filterCategory === cat.id
                      ? 'bg-zinc-100 text-zinc-950 font-semibold'
                      : 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700/80'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar & Pengurutan (Popular / Newest) */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                id="search-feedbacks-input"
                placeholder="Search ideas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-900/80 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
                  aria-label="Clear search"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Sort Toggle */}
            <div className="inline-flex rounded-lg bg-zinc-900 border border-zinc-800 p-0.5">
              <button
                type="button"
                id="sort-popular-btn"
                onClick={() => setSortBy('popular')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                  sortBy === 'popular'
                    ? 'bg-zinc-800 text-white font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span>Most Upvoted</span>
              </button>
              <button
                type="button"
                id="sort-newest-btn"
                onClick={() => setSortBy('newest')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                  sortBy === 'newest'
                    ? 'bg-zinc-800 text-white font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Newest</span>
              </button>
            </div>
          </div>
        </div>

        {/* Status Memuat Data (Loading Skeleton) */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 animate-pulse flex flex-col sm:flex-row gap-4"
              >
                <div className="flex-1 space-y-3">
                  <div className="w-24 h-5 bg-zinc-800 rounded-full" />
                  <div className="w-3/4 h-6 bg-zinc-800 rounded" />
                  <div className="w-full h-12 bg-zinc-800/60 rounded" />
                  <div className="w-40 h-4 bg-zinc-800/40 rounded" />
                </div>
                <div className="w-16 h-16 bg-zinc-800 rounded-xl self-end sm:self-center" />
              </div>
            ))}
          </div>
        ) : filteredAndSortedFeedbacks.length === 0 ? (
          /* Empty State */
          <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-10 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-400">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-white mb-1">
              No Feedback Found
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
              {searchQuery || filterCategory !== 'ALL'
                ? 'No requests match your current filters. Try resetting search or select another category.'
                : 'Be the first to share an idea, request a feature, or report an issue!'}
            </p>
            {(searchQuery || filterCategory !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilterCategory('ALL');
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          /* Daftar Kartu Saran Publik */
          <div className="space-y-4">
            {filteredAndSortedFeedbacks.map((item) => {
              const currentUpvotes = Array.isArray(item.upvotes) ? item.upvotes : [];
              const hasVoted = Boolean(user?.uid && currentUpvotes.includes(user.uid));
              const isAuthor = Boolean(user?.uid && item.userId === user.uid && item.userId !== 'anonymous');

              // Badge category styling
              const catConfig = CATEGORIES.find((c) => c.id === item.category) || CATEGORIES[0];

              return (
                <article
                  key={item.id}
                  className="feedback-card bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700/80 rounded-xl p-5 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative group"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    {/* Badge Kategori di Pojok Kiri Atas */}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${catConfig.colorClass}`}
                      >
                        {catConfig.icon}
                        <span>{item.category}</span>
                      </span>

                      {/* Tombol Hapus jika pemilik saran */}
                      {isAuthor && (
                        <button
                          type="button"
                          onClick={() => handleDeleteFeedback(item.id, item.title)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-red-400 text-xs flex items-center gap-1 ml-auto sm:ml-0"
                          title="Delete my feedback"
                          aria-label={`Delete feedback ${item.title}`}
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      )}
                    </div>

                    {/* Judul Saran (Tebal Putih) */}
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug break-words">
                      {item.title}
                    </h3>

                    {/* Deskripsi Saran (Abu-abu Bersih) */}
                    <p className="text-zinc-300 text-sm leading-relaxed mt-1.5 whitespace-pre-wrap break-words">
                      {item.description}
                    </p>

                    {/* Info Pengirim & Tanggal di Bawah */}
                    <div className="flex items-center gap-2 mt-4 text-xs text-zinc-400">
                      {/* Avatar kecil */}
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

                      {/* Nama pengguna */}
                      {item.userId && item.userId !== 'anonymous' ? (
                        <Link
                          to={`/user/${item.userId}`}
                          className="font-medium text-zinc-300 hover:text-white hover:underline transition-colors truncate max-w-[150px]"
                        >
                          {item.userName || 'Cineva Member'}
                        </Link>
                      ) : (
                        <span className="font-medium text-zinc-400">
                          {item.userName || 'Anonymous User'}
                        </span>
                      )}

                      <span className="text-zinc-600">•</span>

                      {/* Tanggal Rilis / Dibuat */}
                      <span className="text-zinc-500">
                        {formatFeedbackDate(item.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Tombol Upvote (Ikon Jempol / Panah Atas) */}
                  <div className="self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      id={`upvote-btn-${item.id}`}
                      onClick={() => handleToggleUpvote(item)}
                      className={`feedback-upvote-btn cursor-pointer ${
                        hasVoted
                          ? 'feedback-upvote-btn--active'
                          : 'feedback-upvote-btn--inactive'
                      }`}
                      aria-label={`Upvote idea ${item.title}. Current votes: ${currentUpvotes.length}`}
                      title={hasVoted ? 'Remove upvote' : 'Upvote this feedback'}
                    >
                      <svg
                        className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 ${
                          hasVoted ? 'scale-110' : 'group-hover/btn:-translate-y-0.5'
                        }`}
                        viewBox="0 0 24 24"
                        fill={hasVoted ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                      <span className="text-xs sm:text-sm font-bold tracking-tight mt-0.5">
                        {currentUpvotes.length}
                      </span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
