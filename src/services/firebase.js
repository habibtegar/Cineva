import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCPj5BgRRlYClGXaGKEPTLyiklfflHTQtw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "cineva-48ca6.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "cineva-48ca6",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "cineva-48ca6.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "974596262160",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:974596262160:web:a79b225c6df83b4213fd95",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-XL7MC41EHD"
};

export const isFirebaseConfigured = () => {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.apiKey.startsWith("AIzaSy"));
};

// Initialize Firebase safely (prevents duplicate app initialization during Vite HMR)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
export const db = getFirestore(app);

export default app;