import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
} from 'firebase/auth';
import toast from 'react-hot-toast';
import { auth } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { getAuthErrorMessage } from '../utils/authErrors';

// Daftar domain email sampah (disposable / temporary email)
const DISPOSABLE_DOMAINS = [
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'throwawaymail.com',
  'fake.com',
  'temp-mail.org',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamail.biz',
  'guerrillamailblock.com',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'dispostable.com',
  'sharklasers.com',
  'trashmail.com',
  'trashmail.net',
  'trashmail.me',
  'grr.la',
  'nada.ltd',
  'getnada.com',
  'mohmal.com',
  'fakemailgenerator.com',
  'burnermail.io',
  'maildrop.cc',
  'inboxkitten.com',
  'crazymailing.com',
  'mytemp.email',
  '10mail.org',
  'dropmail.me',
  'getairmail.com',
  'emailondeck.com',
  'tempinbox.com',
  'generator.email',
  'mintemail.com',
  'spam4.me',
  'tempr.email',
  'discard.email',
];

export default function Login() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const { user, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  // Cegah auto-redirect ke dashboard jika belum terverifikasi
  useEffect(() => {
    if (user && user.emailVerified) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const validateInputs = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error('Harap masukkan alamat email.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error('Format email tidak valid.');
      return false;
    }
    const domain = trimmedEmail.toLowerCase().split('@')[1];
    if (
      !isLoginMode &&
      domain &&
      (DISPOSABLE_DOMAINS.includes(domain) ||
        DISPOSABLE_DOMAINS.some((d) => domain.endsWith('.' + d)))
    ) {
      toast.error('Domain email tidak diizinkan. Gunakan email asli!');
      return false;
    }
    if (!password) {
      toast.error('Harap masukkan password.');
      return false;
    }
    if (password.length < 6) {
      toast.error('Password minimal 6 karakter.');
      return false;
    }
    return true;
  };

  // Sign In handler
  const handleSignIn = async (e) => {
    if (e) e.preventDefault();
    if (!validateInputs()) return;

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // Blokir Saat Sign In jika belum diverifikasi
      if (!userCredential.user.emailVerified) {
        if (typeof auth.signOut === 'function') {
          await auth.signOut();
        } else {
          await signOut(auth);
        }
        toast.error('Email belum diverifikasi. Cek inbox kamu!');
        return;
      }

      const name =
        userCredential.user.displayName ||
        userCredential.user.email?.split('@')[0] ||
        'User';
      toast.success(`Selamat datang kembali, ${name}!`);
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Sign In error:', err);
      toast.error(getAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Up handler
  const handleSignUp = async (e) => {
    if (e) e.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    const domain = trimmedEmail.split('@')[1];

    // Cegat di Paling Awal: Sebelum panggil fungsi Firebase apa pun di handler Sign Up
    if (
      domain &&
      (DISPOSABLE_DOMAINS.includes(domain) ||
        DISPOSABLE_DOMAINS.some((d) => domain.endsWith('.' + d)))
    ) {
      toast.error('Domain email tidak diizinkan. Gunakan email asli!');
      return;
    }

    if (!validateInputs()) return;

    // Loading State aktif saat tombol ditekan
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        password
      );

      // Kirim email verifikasi
      await sendEmailVerification(userCredential.user);

      // Langsung paksa keluar agar tidak auto-login
      if (typeof auth.signOut === 'function') {
        await auth.signOut();
      } else {
        await signOut(auth);
      }

      // Tampilkan notifikasi
      toast.success(
        'Pendaftaran berhasil! Cek inbox email kamu untuk verifikasi sebelum login.'
      );

      // Pindahkan tampilan kembali ke form Sign In (bukan langsung masuk ke dashboard)
      setPassword('');
      setIsLoginMode(true);
    } catch (err) {
      console.error('Sign Up error:', err);
      toast.error(getAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password handler
  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error('Masukkan alamat email Anda terlebih dahulu untuk mereset password.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error('Format email tidak valid.');
      return;
    }

    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      toast.success('Link reset password telah dikirim ke email Anda! Periksa kotak masuk/spam.');
    } catch (err) {
      console.error('Password reset error:', err);
      toast.error(getAuthErrorMessage(err));
    } finally {
      setIsSendingReset(false);
    }
  };

  // Google Sign-In handler
  const handleGoogleSignIn = async () => {
    setIsLoadingGoogle(true);
    try {
      await loginWithGoogle();
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Google Sign-In caught in Login page:', err);
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const isAnyLoading = isLoading || isLoadingGoogle || isSendingReset;

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 bg-[#141414] overflow-hidden select-none">
      {/* Cinematic ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[320px] h-[320px] bg-red-950/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative w-full max-w-md bg-zinc-900/80 backdrop-blur-2xl border border-zinc-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 z-10 transition-all">
        {/* Cineva Brand Header */}
        <div className="text-center mb-8">
          <Link
            to="/"
            className="inline-block text-2xl font-bold tracking-tight text-white hover:text-red-500 transition-colors"
          >
            Cineva
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-zinc-100 tracking-tight">
            {isLoginMode ? 'Masuk ke Akun Anda' : 'Daftar Akun Baru'}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {isLoginMode
              ? 'Akses film favorit dan jelajahi ribuan tontonan terbaik'
              : 'Mulai buat akun Cineva Anda hanya dalam hitungan detik'}
          </p>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={isLoginMode ? handleSignIn : handleSignUp} className="space-y-4">
          {/* Email Input */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium uppercase tracking-wider text-zinc-300 mb-1.5"
            >
              Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-500">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206"
                  />
                </svg>
              </span>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                disabled={isAnyLoading}
                className="w-full bg-zinc-950/70 border border-zinc-800 text-zinc-100 text-sm rounded-xl pl-10 pr-4 py-3 placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-medium uppercase tracking-wider text-zinc-300"
              >
                Password
              </label>
              {isLoginMode && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isAnyLoading}
                  className="text-xs text-red-500 hover:text-red-400 font-medium transition cursor-pointer hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSendingReset ? 'Mengirim link...' : 'Lupa Password?'}
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-500">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isLoginMode ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                disabled={isAnyLoading}
                className="w-full bg-zinc-950/70 border border-zinc-800 text-zinc-100 text-sm rounded-xl pl-10 pr-11 py-3 placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-400 hover:text-zinc-200 transition focus:outline-none"
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Tombol Utama Lebar Penuh (w-full) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isAnyLoading}
              className="w-full bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-medium text-sm py-3 px-4 rounded-xl shadow-lg shadow-red-950/50 hover:shadow-red-900/50 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{isLoginMode ? 'Signing In...' : 'Mendaftarkan...'}</span>
                </>
              ) : (
                <span>{isLoginMode ? 'Sign In' : 'Sign Up'}</span>
              )}
            </button>
          </div>
        </form>

        {/* Garis pembatas OR */}
        <div className="relative flex items-center justify-center my-6">
          <div className="w-full border-t border-zinc-800" />
          <span className="absolute px-3 bg-zinc-900 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            OR
          </span>
        </div>

        {/* Tombol Continue with Google */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isAnyLoading}
          className="w-full bg-zinc-950 hover:bg-zinc-800/80 active:scale-[0.98] text-zinc-200 border border-zinc-800 hover:border-zinc-700 text-sm font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoadingGoogle ? (
            <>
              <span className="w-4 h-4 border-2 border-zinc-400/30 border-t-zinc-200 rounded-full animate-spin" />
              <span>Menghubungkan ke Google...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  fill="#EA4335"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Teks Toggle Mode Login / Register */}
        <div className="mt-6 text-center text-sm text-zinc-400">
          {isLoginMode ? (
            <p>
              Belum punya akun?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsLoginMode(false);
                }}
                className="text-red-500 hover:text-red-400 font-medium transition hover:underline cursor-pointer"
              >
                Daftar di sini
              </button>
            </p>
          ) : (
            <p>
              Sudah punya akun?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsLoginMode(true);
                }}
                className="text-red-500 hover:text-red-400 font-medium transition hover:underline cursor-pointer"
              >
                Masuk di sini
              </button>
            </p>
          )}
        </div>

        {/* Footer Link Kembali ke Beranda */}
        <div className="mt-8 pt-4 border-t border-zinc-800/60 text-center">
          <Link
            to="/"
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors inline-flex items-center gap-1.5"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
