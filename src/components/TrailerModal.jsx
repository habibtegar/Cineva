import { useEffect } from 'react';
import './TrailerModal.css';

export default function TrailerModal({ trailerKey, title, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    // Prevent background scroll
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="trailer-modal" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Trailer: ${title}`}>
      <div className="trailer-modal__box" onClick={(e) => e.stopPropagation()}>
        <div className="trailer-modal__header">
          <span className="trailer-modal__title">{title}</span>
          <button className="trailer-modal__close" onClick={onClose} aria-label="Close trailer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="trailer-modal__video-wrap">
          <iframe
            src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
