import axios from 'axios';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

/** Image URL helpers */
export const getImageUrl = (path, size = 'w500') => {
  if (!path) return null;
  return `${IMG_BASE}/${size}${path}`;
};

export const getBackdropUrl = (path, size = 'w1280') => {
  if (!path) return null;
  return `${IMG_BASE}/${size}${path}`;
};

/** Generic fetch helper */
const fetchFromTMDB = async (endpoint, params = {}) => {
  const response = await axios.get(`${BASE_URL}${endpoint}`, {
    params: { api_key: API_KEY, ...params },
  });
  return response.data;
};

/** Movie lists */
export const getTrending = (timeWindowOrPage = 'week', page = 1) => {
  const timeWindow = typeof timeWindowOrPage === 'string' ? timeWindowOrPage : 'week';
  const targetPage = typeof timeWindowOrPage === 'number' ? timeWindowOrPage : page;
  return fetchFromTMDB(`/trending/movie/${timeWindow}`, { page: targetPage });
};

export const getPopular = (page = 1) =>
  fetchFromTMDB('/movie/popular', { page });

export const getTopRated = (page = 1) =>
  fetchFromTMDB('/movie/top_rated', { page });

export const getUpcoming = (page = 1) =>
  fetchFromTMDB('/movie/upcoming', { page });

export const getNowPlaying = (page = 1) =>
  fetchFromTMDB('/movie/now_playing', { page });

/** Movie detail */
export const getMovieDetail = (id) =>
  fetchFromTMDB(`/movie/${id}`, { append_to_response: 'credits,videos,similar' });

/** Movie reviews */
export const getMovieReviews = (id, page = 1) =>
  fetchFromTMDB(`/movie/${id}/reviews`, { page });

/** Movie videos */
export const getMovieVideos = (id) =>
  fetchFromTMDB(`/movie/${id}/videos`);

/**
 * Filter trailer video with cascading priority:
 * 1. Official YouTube video with type 'Trailer'
 * 2. Fallback to YouTube video with type 'Teaser'
 * 3. Final fallback to any YouTube video available
 */
export const getTrailerVideo = (videoResults = []) => {
  if (!Array.isArray(videoResults) || videoResults.length === 0) return null;

  // 1. Cari video dengan tipe 'Trailer' di YouTube
  const officialTrailer = videoResults.find(
    (vid) => vid.site === 'YouTube' && vid.type === 'Trailer'
  );

  // 2. Fallback (Cadangan): Jika tidak ada tipe 'Trailer', cari tipe 'Teaser'
  const fallbackVideo = videoResults.find(
    (vid) => vid.site === 'YouTube' && vid.type === 'Teaser'
  );

  // 3. Fallback Terakhir: Video YouTube apa saja yang tersedia di index pertama
  const anyYouTubeVideo = videoResults.find(
    (vid) => vid.site === 'YouTube'
  );

  return officialTrailer || fallbackVideo || anyYouTubeVideo || null;
};

/** Search */
export const searchMovies = (query, page = 1, extraParams = {}) =>
  fetchFromTMDB('/search/movie', { query, page, ...extraParams });

/** Discover movies with filters */
export const discoverMovies = (params = {}) =>
  fetchFromTMDB('/discover/movie', {
    sort_by: 'popularity.desc',
    ...params,
  });

/** Genres */
export const getGenres = () =>
  fetchFromTMDB('/genre/movie/list');

/** Movies by genre */
export const getMoviesByGenre = (genreId, page = 1) =>
  fetchFromTMDB('/discover/movie', {
    with_genres: genreId,
    sort_by: 'popularity.desc',
    page,
  });

/** Person details & credits */
export const getPopularActors = (page = 1) =>
  fetchFromTMDB('/person/popular', { page });

export const getPopularPersons = getPopularActors;

export const getPersonDetail = (id) =>
  fetchFromTMDB(`/person/${id}`);

export const getPersonMovieCredits = (id) =>
  fetchFromTMDB(`/person/${id}/movie_credits`);


