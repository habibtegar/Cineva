import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../services/firebase';
import { AuthContext } from './AuthContext';
import { getAuthErrorMessage } from '../utils/authErrors';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Listen for auth state changes (persists user session on reload)
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
          email: currentUser.email || '',
          photoURL: currentUser.photoURL || '',
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
      const result = await signInWithEmailAndPassword(auth, email, password);
      const loggedUser = result.user;
      const userData = {
        uid: loggedUser.uid,
        displayName: loggedUser.displayName || loggedUser.email?.split('@')[0] || 'User',
        email: loggedUser.email || '',
        photoURL: loggedUser.photoURL || '',
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

  const registerWithEmail = async (email, password) => {
    setError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = result.user;
      const userData = {
        uid: newUser.uid,
        displayName: newUser.displayName || newUser.email?.split('@')[0] || 'User',
        email: newUser.email || '',
        photoURL: newUser.photoURL || '',
      };
      setUser(userData);
      toast.success('Pendaftaran berhasil! Akun Anda telah dibuat.');
      return userData;
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
      photoURL: photoURL?.trim() || null,
    });
    setUser((prev) => ({
      ...prev,
      displayName: displayName?.trim() || prev?.displayName || 'User',
      photoURL: photoURL?.trim() || '',
    }));
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

