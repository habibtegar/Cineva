import { useState, useEffect, useRef } from 'react';
import { updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import toast from 'react-hot-toast';
import { auth } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { getAuthErrorMessage } from '../utils/authErrors';

/**
 * Compresses an image file using FileReader, Image, and HTML5 Canvas in memory.
 * Outputs a Base64 JPEG data URL with 70% quality and max 250x250 dimensions.
 * Includes adaptive size optimization to remain well within the 2048-char Firebase Auth limit.
 */
function compressImageToBase64(file, maxWidth = 250, maxHeight = 250, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Failed to read image file.'));
    };

    reader.onload = (readerEvent) => {
      const img = new Image();

      img.onerror = () => {
        reject(new Error('Failed to process image file.'));
      };

      img.onload = () => {
        try {
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

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas 2D context is not supported in this browser.'));
            return;
          }

          // Solid background to keep transparency clean
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          let currentQuality = quality;
          let base64String = canvas.toDataURL('image/jpeg', currentQuality);

          // Firebase Auth has a 2048-character limit for photoURL
          const FIREBASE_PHOTO_LIMIT = 2048;
          if (base64String.length > FIREBASE_PHOTO_LIMIT) {
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
  const [isPhotoRemoved, setIsPhotoRemoved] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const fileInputRef = useRef(null);



  // Clean up object URLs when modal unmounts or preview changes
  useEffect(() => {
    return () => {
      if (previewImage && previewImage.startsWith('blob:')) {
        URL.revokeObjectURL(previewImage);
      }
    };
  }, [previewImage]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isUploading && !isSendingReset) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isUploading, isSendingReset]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPG, PNG, WEBP, etc.).');
      return;
    }

    if (previewImage && previewImage.startsWith('blob:')) {
      URL.revokeObjectURL(previewImage);
    }

    setSelectedFile(file);
    setIsPhotoRemoved(false);
    const objectUrl = URL.createObjectURL(file);
    setPreviewImage(objectUrl);
    setPreviewError(false);
  };

  // Reset or remove photo
  const handleRemovePhoto = () => {
    if (previewImage && previewImage.startsWith('blob:')) {
      URL.revokeObjectURL(previewImage);
    }
    setSelectedFile(null);
    setPreviewImage('');
    setIsPhotoRemoved(true);
    setPreviewError(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Cancel selecting a new file and revert to existing user photo if available
  const handleCancelFileSelection = () => {
    if (previewImage && previewImage.startsWith('blob:')) {
      URL.revokeObjectURL(previewImage);
    }
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setPreviewImage(user?.photoURL || '');
    setIsPhotoRemoved(false);
    setPreviewError(false);
  };

  // Send password reset email
  const handleSendPasswordReset = async () => {
    if (!user?.email) {
      toast.error('No email address associated with this account.');
      return;
    }
    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast.success('Password reset email sent! Check your inbox or spam folder.');
    } catch (err) {
      console.error('Password reset failed:', err);
      toast.error(getAuthErrorMessage(err) || 'Failed to send password reset email.');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      toast.error('Display name cannot be empty.');
      return;
    }

    setIsUploading(true);

    try {
      let finalPhotoURL = user?.photoURL || null;

      if (selectedFile) {
        finalPhotoURL = await compressImageToBase64(selectedFile, 250, 250, 0.7);
      } else if (isPhotoRemoved) {
        finalPhotoURL = null;
      }

      if (!auth.currentUser) {
        throw new Error('User session not found or not authenticated.');
      }

      await updateProfile(auth.currentUser, {
        displayName: trimmedName,
        photoURL: finalPhotoURL,
      });

      try {
        await auth.currentUser.reload();
      } catch (reloadErr) {
        console.warn('Warning reloading currentUser:', reloadErr);
      }

      if (updateUserProfile) {
        await updateUserProfile({
          displayName: trimmedName,
          photoURL: finalPhotoURL || '',
        });
      }

      toast.success('Profile updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(error.message || 'Failed to save profile changes.');
    } finally {
      setIsUploading(false);
    }
  };

  const userInitial = (displayName || user?.displayName || 'U').charAt(0).toUpperCase();
  const hasActivePhoto = Boolean(previewImage && !isPhotoRemoved);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none transition-all"
      onClick={() => {
        if (!isUploading && !isSendingReset) onClose();
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
              Edit Profile
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Update your display name and profile picture
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading || isSendingReset}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Avatar Live Preview */}
        <div className="flex items-center gap-4 p-3.5 mb-6 rounded-xl bg-zinc-950/60 border border-zinc-800/70">
          <div className="relative w-14 h-14 rounded-full overflow-hidden shrink-0 bg-zinc-800 border-2 border-zinc-700/80 flex items-center justify-center">
            {hasActivePhoto && !previewError ? (
              <img
                src={previewImage}
                alt="Avatar Preview"
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
              Avatar Preview
            </span>
            <p className="text-xs text-zinc-400 truncate mt-0.5">
              {selectedFile ? (
                <span className="text-emerald-400 font-medium">
                  File chosen: {selectedFile.name}
                </span>
              ) : hasActivePhoto ? (
                'Current profile picture'
              ) : (
                'Showing initial letter'
              )}
            </p>
            {selectedFile && (
              <button
                type="button"
                onClick={handleCancelFileSelection}
                disabled={isUploading}
                className="text-[11px] text-zinc-400 hover:text-red-300 transition mt-1 underline cursor-pointer"
              >
                Cancel file selection
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
              DISPLAY NAME
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
                placeholder="Enter your display name"
                disabled={isUploading}
                className="w-full bg-zinc-950/70 border border-zinc-800 text-zinc-100 text-sm rounded-xl pl-10 pr-4 py-3 placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
                required
              />
            </div>
          </div>

          {/* Photo File Input (Custom Upload Button + Remove Photo) */}
          <div>
            <label
              htmlFor="edit-photo-file"
              className="block text-xs font-medium uppercase tracking-wider text-zinc-300 mb-1.5"
            >
              PROFILE PICTURE
            </label>

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              id="edit-photo-file"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
              className="hidden"
            />

            {/* Custom dark upload button & Remove photo button */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] border border-zinc-700 rounded-lg px-4 py-2 text-sm text-zinc-200 transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <svg className="w-4 h-4 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>Upload Image</span>
              </button>

              {hasActivePhoto && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={isUploading}
                  className="bg-zinc-800/80 hover:bg-red-950/60 border border-zinc-700 hover:border-red-800/70 rounded-lg px-3.5 py-2 text-xs font-medium text-zinc-300 hover:text-red-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-3.5 h-3.5 text-zinc-400 group-hover:text-red-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <span>Remove Photo</span>
                </button>
              )}
            </div>

            <p className="mt-2 text-[11px] text-zinc-500 leading-relaxed">
              Choose an image from your device (automatically resized up to 250×250 px in Base64).
            </p>
          </div>

          {/* Email Input (Read-only / Disabled) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="edit-email"
                className="block text-xs font-medium uppercase tracking-wider text-zinc-400"
              >
                EMAIL (READ-ONLY)
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
              Email is linked to your authentication provider and cannot be changed here.
            </p>

            {/* Interactive Password Reset Link */}
            <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSendPasswordReset}
                disabled={isSendingReset || isUploading}
                className="text-xs text-red-400 hover:text-red-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group font-medium"
              >
                <svg className="w-3.5 h-3.5 text-red-400 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>{isSendingReset ? 'Sending reset email...' : 'Send password reset email'}</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading || isSendingReset}
              className="bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-zinc-300 font-medium text-sm py-2.5 px-4 rounded-xl border border-zinc-700/80 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || isSendingReset}
              className="bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-medium text-sm py-2.5 px-5 rounded-xl shadow-lg shadow-red-950/50 hover:shadow-red-900/50 transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
