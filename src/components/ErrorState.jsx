import './ErrorState.css';

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state">
      <svg className="error-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p className="error-state__message">{message || 'Something went wrong.'}</p>
      {onRetry && (
        <button className="error-state__btn" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}
