import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MovieGrid from '../components/MovieGrid';
import ErrorState from '../components/ErrorState';
import { getPersonDetail, getPersonMovieCredits, getImageUrl } from '../services/tmdb';
import './PersonDetail.css';

export default function PersonDetail({ toggleFavorite, isFavorite }) {
  const { id } = useParams();
  const [person, setPerson] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bioExpanded, setBioExpanded] = useState(false);

  const fetchPersonData = () => {
    setLoading(true);
    setError(null);

    Promise.all([getPersonDetail(id), getPersonMovieCredits(id)])
      .then(([personData, creditsData]) => {
        setPerson(personData);
        // Sort movies by popularity descending and deduplicate by movie id
        const castMovies = creditsData.cast || [];
        const uniqueMovies = Array.from(
          new Map(castMovies.filter((m) => m.poster_path).map((m) => [m.id, m])).values()
        ).sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

        setMovies(uniqueMovies);
      })
      .catch((err) => {
        console.error('Failed to fetch person data:', err);
        setError('Could not load actor details.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPersonData();
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) {
    return (
      <div className="person-detail__loading page-container">
        <div className="person-detail__loading-spinner" />
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="page-container" style={{ paddingTop: 100 }}>
        <ErrorState message={error || 'Actor not found.'} onRetry={fetchPersonData} />
      </div>
    );
  }

  const photo = getImageUrl(person.profile_path, 'h632');

  // Format birth date & calculate age
  const formatBirth = (dateStr) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      const formatted = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      // Age calculation
      const birthYear = date.getFullYear();
      const currentYear = new Date().getFullYear();
      const age = person.deathday
        ? new Date(person.deathday).getFullYear() - birthYear
        : currentYear - birthYear;
      return `${formatted} (${age} years old)`;
    } catch {
      return dateStr;
    }
  };

  const bio = person.biography || '';
  const isBioLong = bio.length > 450;
  const displayBio = isBioLong && !bioExpanded ? `${bio.slice(0, 450)}...` : bio;

  return (
    <div className="person-detail page-container">
      {/* Back button */}
      <div className="person-detail__back">
        <button onClick={() => window.history.back()} className="person-detail__back-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </button>
      </div>

      <div className="person-detail__top">
        {/* Left Column: Photo & Personal Info Card */}
        <div className="person-detail__sidebar">
          {photo ? (
            <img src={photo} alt={person.name} className="person-detail__photo" />
          ) : (
            <div className="person-detail__no-photo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}

          <div className="person-detail__facts">
            <h3 className="person-detail__facts-title">Personal Info</h3>

            {person.known_for_department && (
              <div className="person-detail__fact">
                <span className="person-detail__fact-label">Known For</span>
                <span className="person-detail__fact-value">{person.known_for_department}</span>
              </div>
            )}

            {person.gender && (
              <div className="person-detail__fact">
                <span className="person-detail__fact-label">Gender</span>
                <span className="person-detail__fact-value">
                  {person.gender === 1 ? 'Female' : person.gender === 2 ? 'Male' : 'Non-binary'}
                </span>
              </div>
            )}

            {person.birthday && (
              <div className="person-detail__fact">
                <span className="person-detail__fact-label">Born</span>
                <span className="person-detail__fact-value">{formatBirth(person.birthday)}</span>
              </div>
            )}

            {person.place_of_birth && (
              <div className="person-detail__fact">
                <span className="person-detail__fact-label">Place of Birth</span>
                <span className="person-detail__fact-value">{person.place_of_birth}</span>
              </div>
            )}

            {person.also_known_as && person.also_known_as.length > 0 && (
              <div className="person-detail__fact">
                <span className="person-detail__fact-label">Also Known As</span>
                <span className="person-detail__fact-value">
                  {person.also_known_as.slice(0, 3).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Bio & Name */}
        <div className="person-detail__main">
          <h1 className="person-detail__name">{person.name}</h1>

          {bio ? (
            <div className="person-detail__bio-box">
              <h2 className="person-detail__section-title">Biography</h2>
              <p className="person-detail__bio">{displayBio}</p>
              {isBioLong && (
                <button
                  className="person-detail__readmore"
                  onClick={() => setBioExpanded(!bioExpanded)}
                >
                  {bioExpanded ? 'Show Less' : 'Read Full Biography'}
                </button>
              )}
            </div>
          ) : (
            <p className="person-detail__no-bio">No biography available for this actor.</p>
          )}

          {/* Filmography Section */}
          <div className="person-detail__credits">
            <MovieGrid
              title={`Known For (${movies.length} Movies)`}
              movies={movies}
              onToggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
