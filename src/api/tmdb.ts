const TMDB_API_KEY = "581a8fbd7a7cfeb48d4454fb9c6c697a";
const BASE_URL = "https://api.themoviedb.org/3";

export interface TMDBItem {
  id: number;
  title?: string;
  name?: string; // TV shows use name instead of title
  overview: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
}

const fetchFromTMDB = async (endpoint: string, params: Record<string, string> = {}) => {
  const urlParams = new URLSearchParams({
    api_key: TMDB_API_KEY,
    language: "zh-TW",
    ...params,
  });
  const res = await fetch(`${BASE_URL}${endpoint}?${urlParams.toString()}`);
  if (!res.ok) throw new Error("TMDB fetch failed");
  const data = await res.json();
  return data.results;
};

export const getTrending = () => fetchFromTMDB("/trending/all/day");
export const getTopRatedMovies = () => fetchFromTMDB("/movie/top_rated");
export const getPopularMovies = () => fetchFromTMDB("/movie/popular");
export const getTopRatedShows = () => fetchFromTMDB("/tv/top_rated");
export const getPopularShows = () => fetchFromTMDB("/tv/popular");
export const searchMulti = (query: string) => fetchFromTMDB("/search/multi", { query });

export const getImageUrl = (path: string | null, size: string = "original") => {
  if (!path) return "";
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

export const getDetails = async (id: number, type: "movie" | "tv"): Promise<TMDBItem> => {
  const urlParams = new URLSearchParams({
    api_key: TMDB_API_KEY,
    language: "zh-TW",
  });
  const res = await fetch(`${BASE_URL}/${type}/${id}?${urlParams.toString()}`);
  if (!res.ok) throw new Error("TMDB details fetch failed");
  return await res.json();
};

