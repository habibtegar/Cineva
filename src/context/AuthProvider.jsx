import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../services/firebase';
import { AuthContext } from './AuthContext';
import { getAuthErrorMessage } from '../utils/authErrors';
import { isDisposableEmail } from '../utils/disposableEmail';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Listen for auth state changes (persists user session on reload)
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const isGoogle = currentUser.providerData?.some(
          (p) => p.providerId === 'google.com'
        );
        // User yang mendaftar via email/password harus sudah verifikasi email
        if (!isGoogle && !currentUser.emailVerified) {
          setUser(null);
          setLoading(false);
          return;
        }

        setUser({
          uid: currentUser.uid,
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
          email: currentUser.email || '',
          photoURL: currentUser.photoURL || '',
          emailVerified: currentUser.emailVerified,
          metadata: {
            creationTime: currentUser.metadata?.creationTime,
            lastSignInTime: currentUser.metadata?.lastSignInTime,
          },
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email, password) => {
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      const loggedUser = result.user;

      if (!loggedUser.emailVerified) {
        if (typeof auth.signOut === 'function') {
          await auth.signOut();
        } else {
          await signOut(auth);
        }
        setUser(null);
        const errMsg = 'Email belum diverifikasi. Cek inbox atau folder Spam Gmail kamu!';
        setError(errMsg);
        toast.error(errMsg);
        return null;
      }

      const userData = {
        uid: loggedUser.uid,
        displayName: loggedUser.displayName || loggedUser.email?.split('@')[0] || 'User',
        email: loggedUser.email || '',
        photoURL: loggedUser.photoURL || '',
        emailVerified: loggedUser.emailVerified,
        metadata: {
          creationTime: loggedUser.metadata?.creationTime,
          lastSignInTime: loggedUser.metadata?.lastSignInTime,
        },
      };
      setUser(userData);
      toast.success(`Selamat datang, ${userData.displayName}!`);
      return userData;
    } catch (err) {
      console.error('Email sign-in failed:', err);
      const friendlyMessage = getAuthErrorMessage(err);
      setError(friendlyMessage);
      toast.error(friendlyMessage);
      throw err;
    }
  };

  const registerWithEmail = async (email, password, displayName) => {
    setError(null);
    const trimmedEmail = email?.trim() || '';
    if (isDisposableEmail(trimmedEmail)) {
      const errMsg = 'Domain email tidak diizinkan. Gunakan email asli!';
      setError(errMsg);
      toast.error(errMsg);
      return null;
    }
    try {
      const result = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      const newUser = result.user;
      if (auth.currentUser && displayName?.trim()) {
        await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      }
      await sendEmailVerification(newUser);
      toast.success('Pendaftaran berhasil! Cek folder Inbox atau Spam di Gmail kamu untuk verifikasi sebelum login.', {
        duration: 5000,
      });
      if (typeof auth.signOut === 'function') {
        await auth.signOut();
      } else {
        await signOut(auth);
      }
      setUser(null);
      return null;
    } catch (err) {
      console.error('Email registration failed:', err);
      const friendlyMessage = getAuthErrorMessage(err);
      setError(friendlyMessage);
      toast.error(friendlyMessage);
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    try {
      if (!isFirebaseConfigured()) {
        const proceed = window.confirm(
          'Firebase API Key belum dikonfigurasi di file .env.\n\nApakah Anda ingin mencoba login dengan Firebase (membutuhkan kredensial Firebase aktif), atau apakah Anda ingin melihat petunjuk konfigurasi?'
        );
        if (!proceed) return;
      }

      const result = await signInWithPopup(auth, googleProvider);
      const loggedUser = result.user;
      const userData = {
        uid: loggedUser.uid,
        displayName: loggedUser.displayName || loggedUser.email?.split('@')[0] || 'User',
        email: loggedUser.email || '',
        photoURL: loggedUser.photoURL || '',
        emailVerified: loggedUser.emailVerified,
        metadata: {
          creationTime: loggedUser.metadata?.creationTime,
          lastSignInTime: loggedUser.metadata?.lastSignInTime,
        },
      };
      setUser(userData);
      toast.success(`Selamat datang, ${userData.displayName}!`);
      return userData;
    } catch (err) {
      console.error('Google Sign-In failed:', err);
      // Don't treat user closing the popup as a severe error
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Login dibatalkan oleh pengguna.');
      } else {
        const friendlyMessage = getAuthErrorMessage(err);
        setError(friendlyMessage);
        toast.error(friendlyMessage);
      }
      throw err;
    }
  };

  const updateUserProfile = async ({ displayName, photoURL }) => {
    if (!auth.currentUser) {
      throw new Error('Pengguna tidak terautentikasi.');
    }
    await updateProfile(auth.currentUser, {
      displayName: displayName?.trim() || null,
      photoURL: photoURL ? photoURL.trim() : null,
    });
    try {
      await auth.currentUser.reload();
    } catch (reloadErr) {
      console.warn('Peringatan reload currentUser:', reloadErr);
    }
    const current = auth.currentUser;
    setUser({
      uid: current.uid,
      displayName: displayName?.trim() || current.displayName || 'User',
      email: current.email || '',
      photoURL: current.photoURL || '',
      emailVerified: current.emailVerified,
      metadata: {
        creationTime: current.metadata?.creationTime,
        lastSignInTime: current.metadata?.lastSignInTime,
      },
    });
  };

  const logout = async () => {
    setError(null);
    try {
      await signOut(auth);
      setUser(null);
      toast.success('Berhasil logout');
    } catch (err) {
      console.error('Sign-out failed:', err);
      setError(err.message || 'Gagal logout.');
      toast.error('Gagal logout');
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        updateUserProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

