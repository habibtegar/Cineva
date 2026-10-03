import './Skeleton.css';

/** Reusable skeleton loading placeholder */
export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-card__poster skeleton-pulse" />
      <div className="skeleton-card__info">
        <div className="skeleton-card__line skeleton-pulse" style={{ width: '80%' }} />
        <div className="skeleton-card__line skeleton-card__line--short skeleton-pulse" style={{ width: '50%' }} />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 10, title }) {
  return (
    <section className="movie-grid">
      {title && <h2 className="movie-grid__title">{title}</h2>}
      <div className="movie-grid__list">
        {Array.from({ length: count }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </section>
  );
}

export function SkeletonHero() {
  return (
    <div className="skeleton-hero skeleton-pulse" />
  );
}

export function SkeletonDetail() {
  return (
    <div className="skeleton-detail">
      <div className="skeleton-detail__backdrop skeleton-pulse" />
      <div className="skeleton-detail__body">
        <div className="skeleton-detail__poster skeleton-pulse" />
        <div className="skeleton-detail__info">
          <div className="skeleton-card__line skeleton-pulse" style={{ width: '60%', height: 28 }} />
          <div className="skeleton-card__line skeleton-pulse" style={{ width: '40%', height: 16, marginTop: 12 }} />
          <div className="skeleton-card__line skeleton-pulse" style={{ width: '90%', height: 14, marginTop: 20 }} />
          <div className="skeleton-card__line skeleton-pulse" style={{ width: '100%', height: 14, marginTop: 8 }} />
          <div className="skeleton-card__line skeleton-pulse" style={{ width: '75%', height: 14, marginTop: 8 }} />
        </div>
      </div>
    </div>
  );
}
