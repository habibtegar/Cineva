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
export const getTrending = (timeWindow = 'week', page = 1) =>
  fetchFromTMDB(`/trending/movie/${timeWindow}`, { page });

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

/** Search */
export const searchMovies = (query, page = 1) =>
  fetchFromTMDB('/search/movie', { query, page });

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
