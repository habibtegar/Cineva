/**
 * Maps Firebase Auth error codes to user-friendly messages in Indonesian.
 * @param {object} err - Error object thrown by Firebase Auth
 * @returns {string} User-friendly error message
 */
export const getAuthErrorMessage = (err) => {
  if (!err) return 'Terjadi kesalahan. Silakan coba lagi.';
  const code = err.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Format email tidak valid.';
    case 'auth/user-disabled':
      return 'Akun pengguna ini telah dinonaktifkan.';
    case 'auth/user-not-found':
      return 'Akun dengan email tersebut tidak ditemukan.';
    case 'auth/wrong-password':
      return 'Password yang Anda masukkan salah.';
    case 'auth/invalid-credential':
      return 'Email atau password salah. Silakan periksa kembali.';
    case 'auth/email-already-in-use':
      return 'Email sudah terdaftar. Silakan login menggunakan Sign In.';
    case 'auth/weak-password':
      return 'Password terlalu lemah (minimal 6 karakter).';
    case 'auth/missing-password':
      return 'Password tidak boleh kosong.';
    case 'auth/missing-email':
      return 'Email tidak boleh kosong.';
    case 'auth/popup-closed-by-user':
      return 'Login dengan Google dibatalkan.';
    case 'auth/operation-not-allowed':
      return 'Metode autentikasi Email/Password belum diaktifkan di Firebase Console.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan gagal. Silakan coba lagi beberapa saat.';
    case 'auth/network-request-failed':
      return 'Koneksi jaringan terputus. Periksa sambungan internet Anda.';
    default:
      return err.message || 'Terjadi kesalahan autentikasi.';
  }
};
