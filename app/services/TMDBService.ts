import { TMDB_CONFIG, API_KEY } from '../../constants/Config';

export interface TVShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  first_air_date: string;
  next_episode_to_air?: Episode;
  last_episode_to_air?: Episode;
  number_of_seasons: number;
  status: string;
  genres: Genre[];
  networks: Network[];
  created_by: Creator[];
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  still_path: string;
  air_date: string;
  episode_number: number;
  season_number: number;
  vote_average: number;
  runtime?: number;
}

export interface Season {
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  air_date: string;
  season_number: number;
  episode_count: number;
  episodes?: Episode[];
}

export interface Genre {
  id: number;
  name: string;
}

export interface Network {
  id: number;
  name: string;
  logo_path: string;
}

export interface Creator {
  id: number;
  name: string;
  profile_path: string;
}

interface APIResponse<T> {
  page?: number;
  results: T[];
  total_pages?: number;
  total_results?: number;
}

class TMDBService {
  private static instance: TMDBService;
  private baseURL: string;
  private headers: HeadersInit;

  private constructor() {
    this.baseURL = TMDB_CONFIG.BASE_URL;
    this.headers = {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  public static getInstance(): TMDBService {
    if (!TMDBService.instance) {
      TMDBService.instance = new TMDBService();
    }
    return TMDBService.instance;
  }

  private async fetchAPI<T>(endpoint: string): Promise<T> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData?.status_message || 'Unknown error'}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API fetch error:', error);
      throw error;
    }
  }

  public async getPopularTVShows(page = 1): Promise<APIResponse<TVShow>> {
    return this.fetchAPI<APIResponse<TVShow>>(`/tv/popular?page=${page}`);
  }

  public async getTVShowDetails(id: number): Promise<TVShow> {
    return this.fetchAPI<TVShow>(`/tv/${id}`);
  }

  public async searchTVShows(query: string, page = 1): Promise<APIResponse<TVShow>> {
    return this.fetchAPI<APIResponse<TVShow>>(`/search/tv?query=${encodeURIComponent(query)}&page=${page}`);
  }

  public async getTopRatedTVShows(page = 1): Promise<APIResponse<TVShow>> {
    return this.fetchAPI<APIResponse<TVShow>>(`/tv/top_rated?page=${page}`);
  }

  public async getTVShowsAiringToday(page = 1): Promise<APIResponse<TVShow>> {
    return this.fetchAPI<APIResponse<TVShow>>(`/tv/airing_today?page=${page}`);
  }

  public async getSeasonDetails(tvId: number, seasonNumber: number): Promise<Season> {
    return this.fetchAPI<Season>(`/tv/${tvId}/season/${seasonNumber}`);
  }

  public getImageUrl(path: string, size: string): string {
    return `${TMDB_CONFIG.IMAGE_BASE_URL}/${size}${path}`;
  }
}

export default TMDBService.getInstance(); 