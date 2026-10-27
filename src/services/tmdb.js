import axios from 'axios';

// Format pengambilan variabel environment Vite
const RAW_API_KEY =
  import.meta.env.VITE_TMDB_API_KEY ||
  import.meta.env.VITE_TMDB_ACCESS_TOKEN ||
  import.meta.env.VITE_TMDB_READ_ACCESS_TOKEN ||
  '';

const API_KEY = typeof RAW_API_KEY === 'string' ? RAW_API_KEY.trim().replace(/^["']|["']$/g, '') : '';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

// Pengecekan defensif jika API key belum dikonfigurasi
if (!API_KEY) {
  console.warn(
    'TMDB API key is missing. Please set VITE_TMDB_API_KEY in Vercel Environment Variables.'
  );
  console.error(
    'TMDB API key is missing. Please set VITE_TMDB_API_KEY in Vercel Environment Variables.'
  );
}

// Cek tipe kredensial TMDB: v4 Bearer Read Access Token (JWT) vs v3 API Key (32 hex characters)
const isBearerToken = Boolean(
  API_KEY && (API_KEY.startsWith('ey') || API_KEY.startsWith('Bearer ') || API_KEY.length > 50)
);

const cleanBearerToken = API_KEY.startsWith('Bearer ')
  ? API_KEY.slice(7).trim()
  : API_KEY;

/** Axios instance dengan interceptor autentikasi terpusat */
export const tmdbClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json;charset=utf-8',
  },
});

// Interceptor untuk menyematkan autentikasi yang tepat secara otomatis
tmdbClient.interceptors.request.use((config) => {
  if (!API_KEY) {
    console.warn(
      'TMDB API key is missing. Please set VITE_TMDB_API_KEY in Vercel Environment Variables.'
    );
    console.error(
      'TMDB API key is missing. Please set VITE_TMDB_API_KEY in Vercel Environment Variables.'
    );
    return Promise.reject(
      new Error('TMDB API key is missing. Please set VITE_TMDB_API_KEY in Vercel Environment Variables.')
    );
  }

  // Gunakan Bearer Token jika JWT (v4) atau Query Parameter ?api_key= jika v3 API Key
  if (isBearerToken) {
    config.headers.Authorization = `Bearer ${cleanBearerToken}`;
  } else {
    config.params = {
      api_key: API_KEY,
      ...config.params,
    };
  }

  return config;
});

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
  const response = await tmdbClient.get(endpoint, { params });
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

export const searchMulti = (query, page = 1, extraParams = {}) =>
  fetchFromTMDB('/search/multi', { query, page, ...extraParams });

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

/** Fetch custom TMDB endpoint or relative URL for MovieRow */
export const fetchCustomUrl = async (endpoint, params = {}) => {
  const response = await tmdbClient.get(endpoint, { params });
  return response.data;
};

/** TV Shows API Endpoints */
export const getTVPopular = (page = 1) =>
  fetchFromTMDB('/tv/popular', { page });

export const getTVTopRated = (page = 1) =>
  fetchFromTMDB('/tv/top_rated', { page });

export const getTVAiringToday = (page = 1) =>
  fetchFromTMDB('/tv/airing_today', { page });

export const getTVGenres = () =>
  fetchFromTMDB('/genre/tv/list');

export const getTVDetail = (id) =>
  fetchFromTMDB(`/tv/${id}`, { append_to_response: 'credits,videos,recommendations,similar' });

export const getTVVideos = (id) =>
  fetchFromTMDB(`/tv/${id}/videos`);

export const getTVRecommendations = (id, page = 1) =>
  fetchFromTMDB(`/tv/${id}/recommendations`, { page });

export const discoverTV = (params = {}) =>
  fetchFromTMDB('/discover/tv', {
    sort_by: 'popularity.desc',
    ...params,
  });

export default tmdbClient;



