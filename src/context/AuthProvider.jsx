import { useState, useEffect } from 'react';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../services/firebase';
import { AuthContext } from './AuthContext';

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
          displayName: currentUser.displayName || 'User',
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
        displayName: loggedUser.displayName || 'User',
        email: loggedUser.email || '',
        photoURL: loggedUser.photoURL || '',
      };
      setUser(userData);
      return userData;
    } catch (err) {
      console.error('Google Sign-In failed:', err);
      // Don't treat user closing the popup as a severe error
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Login dibatalkan oleh pengguna.');
      } else {
        setError(err.message || 'Gagal login dengan Google.');
        alert(`Login gagal: ${err.message || 'Periksa konfigurasi Firebase Anda.'}`);
      }
      throw err;
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error('Sign-out failed:', err);
      setError(err.message || 'Gagal logout.');
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
