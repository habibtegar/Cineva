import { useState, useEffect } from 'react';
import { updateProfile } from 'firebase/auth';
import toast from 'react-hot-toast';
import { auth } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';

/**
 * Mengompresi file gambar menggunakan FileReader, Image, dan HTML5 Canvas di memori.
 * Menghasilkan string Base64 (Data URI) JPEG dengan kualitas 70% dan dimensi maksimal 250x250 piksel.
 * Dilengkapi optimasi adaptif agar panjang string tidak melebihi batas 2048 karakter Firebase Auth photoURL.
 */
function compressImageToBase64(file, maxWidth = 250, maxHeight = 250, quality = 0.7) {
  return new Promise((resolve, reject) => {
    // 1. Baca File menggunakan FileReader
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Gagal membaca file gambar melalui FileReader.'));
    };

    reader.onload = (readerEvent) => {
      // 2. Buat elemen Image di memori JavaScript
      const img = new Image();

      img.onerror = () => {
        reject(new Error('Gagal memproses file ke elemen Image.'));
      };

      img.onload = () => {
        try {
          // Hitung rasio dimensi maksimal (maksimal 250x250 piksel)
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          // Buat elemen <canvas> secara programatik di memori
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas 2D context tidak tersedia di browser.'));
            return;
          }

          // Latar belakang putih agar transparansi PNG/WEBP tidak menghitam
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);

          // Gambar ulang ke canvas dengan ukuran yang telah di-resize
          ctx.drawImage(img, 0, 0, width, height);

          // 3. Ubah ke Base64 (Data URI) dengan format JPEG kualitas 70%
          let currentQuality = quality;
          let base64String = canvas.toDataURL('image/jpeg', currentQuality);

          // Firebase Auth memiliki batas 2048 karakter pada field photoURL
          // Jika melebihi 2048 karakter, sesuaikan dimensi/kualitas secara adaptif
          const FIREBASE_PHOTO_LIMIT = 2048;
          if (base64String.length > FIREBASE_PHOTO_LIMIT) {
            console.log(
              `[Canvas Base64] Ukuran awal (${base64String.length} karakter) melebihi batas 2048 karakter Firebase Auth. Menyesuaikan ukuran secara adaptif...`
            );

            let curW = Math.min(width, 100);
            let curH = Math.min(height, 100);

            while (
              base64String.length > FIREBASE_PHOTO_LIMIT &&
              (curW > 24 || currentQuality > 0.3)
            ) {
              if (currentQuality > 0.45) {
                currentQuality -= 0.1;
              } else {
                curW = Math.round(curW * 0.8);
                curH = Math.round(curH * 0.8);
              }

              canvas.width = curW;
              canvas.height = curH;
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, curW, curH);
              ctx.drawImage(img, 0, 0, curW, curH);
              base64String = canvas.toDataURL('image/jpeg', currentQuality);
            }

            console.log(
              `[Canvas Base64] Ukuran akhir yang aman: ${base64String.length} karakter (${canvas.width}x${canvas.height} px, kualitas: ${currentQuality.toFixed(1)}).`
            );
          }

          resolve(base64String);
        } catch (err) {
          reject(err);
        }
      };

      img.src = readerEvent.target.result;
    };

    reader.readAsDataURL(file);
  });
}

export default function EditProfileModal({ isOpen, onClose }) {
  const { user, updateUserProfile } = useAuth();

  const [displayName, setDisplayName] = useState(() => user?.displayName || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(() => user?.photoURL || '');
  const [previewError, setPreviewError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Bersihkan object URL saat modal unmount atau file berganti
  useEffect(() => {
    return () => {
      if (previewImage && previewImage.startsWith('blob:')) {
        URL.revokeObjectURL(previewImage);
      }
    };
  }, [previewImage]);

  // Handle ESC key untuk menutup modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isUploading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isUploading]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi tipe file gambar
    if (!file.type.startsWith('image/')) {
      toast.error('Harap pilih file gambar (JPG, PNG, WEBP, dll).');
      return;
    }

    // Bersihkan preview blob lama
    if (previewImage && previewImage.startsWith('blob:')) {
      URL.revokeObjectURL(previewImage);
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewImage(objectUrl);
    setPreviewError(false);
  };

  const handleRemoveFile = () => {
    if (previewImage && previewImage.startsWith('blob:')) {
      URL.revokeObjectURL(previewImage);
    }
    setSelectedFile(null);
    setPreviewImage(user?.photoURL || '');
    setPreviewError(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      toast.error('Nama tampilan tidak boleh kosong.');
      return;
    }

    setIsUploading(true);

    try {
      console.log('=== [MULAI PROSES SIMPAN PROFIL (BASE64 CANVAS)] ===');

      let finalPhotoURL = user?.photoURL || null;

      // Jika pengguna memilih file baru, compress dengan Canvas menjadi Base64
      if (selectedFile) {
        console.log('1. Mengompresi file gambar ke Base64 via Canvas (max 250x250, 70% quality)...');
        const base64String = await compressImageToBase64(selectedFile, 250, 250, 0.7);
        console.log('2. Berhasil membuat string Base64. Panjang string:', base64String.length);
        finalPhotoURL = base64String;
      } else {
        console.log('Tidak ada file baru dipilih, mempertahankan foto profil saat ini.');
      }

      // Pastikan ada sesi pengguna Firebase
      if (!auth.currentUser) {
        throw new Error('Sesi pengguna tidak valid atau tidak terautentikasi.');
      }

      // Update Firebase Auth profile langsung dengan Base64
      console.log('3. Menyimpan data profil ke Firebase Auth (updateProfile)...');
      await updateProfile(auth.currentUser, {
        displayName: trimmedName,
        photoURL: finalPhotoURL,
      });

      // Reload sesi currentUser agar data tersimpan di local cache
      try {
        await auth.currentUser.reload();
        console.log('4. auth.currentUser.reload() berhasil.');
      } catch (reloadErr) {
        console.warn('Peringatan reload currentUser:', reloadErr);
      }

      // Perbarui Auth Context React
      if (updateUserProfile) {
        await updateUserProfile({
          displayName: trimmedName,
          photoURL: finalPhotoURL || '',
        });
        console.log('5. State Auth Context diperbarui.');
      }

      toast.success('Profil berhasil diperbarui!');
      console.log('=== [SIMPAN PROFIL BERHASIL] ===');

      // Cukup tutup modal Edit Profil tanpa hard reload (mencegah splash screen muncul kembali)
      onClose();
    } catch (error) {
      console.error('Detail Error Simpan Profil:', error);
      toast.error(error.message || 'Gagal menyimpan profil.');
    } finally {
      setIsUploading(false);
    }
  };

  const userInitial = (displayName || user?.displayName || 'U').charAt(0).toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none transition-all"
      onClick={() => {
        if (!isUploading) onClose();
      }}
      aria-modal="true"
      role="dialog"
    >
      {/* Modal Card */}
      <div
        className="relative w-full max-w-md bg-zinc-900/95 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/90 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient glow accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-5 mb-5 border-b border-zinc-800/80">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Edit Profil
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Perbarui nama dan simpan foto profil baru Anda
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Tutup modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Avatar Live Preview */}
        <div className="flex items-center gap-4 p-3.5 mb-6 rounded-xl bg-zinc-950/60 border border-zinc-800/70">
          <div className="relative w-14 h-14 rounded-full overflow-hidden shrink-0 bg-zinc-800 border-2 border-zinc-700/80 flex items-center justify-center">
            {previewImage && !previewError ? (
              <img
                src={previewImage}
                alt="Preview Avatar"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setPreviewError(true)}
              />
            ) : (
              <span className="text-xl font-bold text-white">
                {userInitial}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold text-zinc-300 block">
              Pratinjau Avatar
            </span>
            <p className="text-xs text-zinc-400 truncate mt-0.5">
              {selectedFile ? (
                <span className="text-emerald-400 font-medium">
                  File dipilih: {selectedFile.name}
                </span>
              ) : previewImage ? (
                'Menggunakan foto profil saat ini'
              ) : (
                'Menampilkan inisial huruf'
              )}
            </p>
            {selectedFile && (
              <button
                type="button"
                onClick={handleRemoveFile}
                disabled={isUploading}
                className="text-[11px] text-red-400 hover:text-red-300 transition mt-1 underline cursor-pointer"
              >
                Batalkan pilihan file
              </button>
            )}
          </div>
        </div>

        {/* Edit Profile Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Name Input */}
          <div>
            <label
              htmlFor="edit-display-name"
              className="block text-xs font-medium uppercase tracking-wider text-zinc-300 mb-1.5"
            >
              Display Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
              <input
                id="edit-display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nama tampilan Anda"
                disabled={isUploading}
                className="w-full bg-zinc-950/70 border border-zinc-800 text-zinc-100 text-sm rounded-xl pl-10 pr-4 py-3 placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
                required
              />
            </div>
          </div>

          {/* Photo File Input */}
          <div>
            <label
              htmlFor="edit-photo-file"
              className="block text-xs font-medium uppercase tracking-wider text-zinc-300 mb-1.5"
            >
              Foto Profil
            </label>
            <div className="relative">
              <input
                id="edit-photo-file"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isUploading}
                className="block w-full text-xs text-zinc-400 file:mr-3 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-zinc-800 file:text-zinc-100 hover:file:bg-zinc-700 file:cursor-pointer cursor-pointer border border-zinc-800 rounded-xl bg-zinc-950/70 py-2 px-3 focus:outline-none focus:border-red-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-500">
              Pilih gambar dari perangkat (otomatis di-resize maksimal 250x250 px ke Base64 tanpa pihak ketiga).
            </p>
          </div>

          {/* Email Input (Read-only / Disabled) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="edit-email"
                className="block text-xs font-medium uppercase tracking-wider text-zinc-400"
              >
                Email
              </label>
              <span className="text-[10px] uppercase font-semibold text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded">
                Read-only
              </span>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                id="edit-email"
                type="email"
                value={user?.email || ''}
                disabled
                readOnly
                className="w-full bg-zinc-950/40 border border-zinc-800/70 text-zinc-500 text-sm rounded-xl pl-10 pr-4 py-3 cursor-not-allowed select-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              Email terkait dengan akun autentikasi dan tidak dapat diubah di sini.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-zinc-300 font-medium text-sm py-2.5 px-4 rounded-xl border border-zinc-700/80 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-medium text-sm py-2.5 px-5 rounded-xl shadow-lg shadow-red-950/50 hover:shadow-red-900/50 transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Perubahan</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
