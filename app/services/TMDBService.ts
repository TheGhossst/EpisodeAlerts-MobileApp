import { TMDB_CONFIG, API_KEY } from '../../constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

interface CachedResponseEntry {
  data: unknown;
  expiresAt: number;
  updatedAt: number;
}

const API_CACHE_STORAGE_KEY = '@EpisodeAlerts:tmdbApiCache';
const DEFAULT_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;
const PERSIST_DEBOUNCE_MS = 400;

class TMDBService {
  private static instance: TMDBService;
  private baseURL: string;
  private headers: HeadersInit;
  private memoryCache = new Map<string, CachedResponseEntry>();
  private inFlightRequests = new Map<string, Promise<unknown>>();
  private isCacheHydrated = false;
  private hydratePromise: Promise<void> | null = null;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

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

  private normalizeEndpoint(endpoint: string): string {
    const [path, queryString] = endpoint.split('?');
    if (!queryString) {
      return path;
    }

    const params = new URLSearchParams(queryString);
    const sortedEntries = Array.from(params.entries()).sort((a, b) => {
      if (a[0] === b[0]) {
        return a[1].localeCompare(b[1]);
      }
      return a[0].localeCompare(b[0]);
    });

    const normalizedParams = new URLSearchParams();
    sortedEntries.forEach(([key, value]) => {
      normalizedParams.append(key, value);
    });

    return `${path}?${normalizedParams.toString()}`;
  }

  private getCacheTTL(endpoint: string): number {
    const normalized = this.normalizeEndpoint(endpoint);

    if (normalized.startsWith('/search/')) {
      return 5 * 60 * 1000;
    }

    if (normalized.startsWith('/tv/airing_today')) {
      return 10 * 60 * 1000;
    }

    if (normalized.startsWith('/tv/popular') || normalized.startsWith('/tv/top_rated')) {
      return 30 * 60 * 1000;
    }

    if (/^\/tv\/\d+\/season\/\d+/.test(normalized)) {
      return 6 * 60 * 60 * 1000;
    }

    if (/^\/tv\/\d+/.test(normalized)) {
      return 60 * 60 * 1000;
    }

    return DEFAULT_CACHE_TTL_MS;
  }

  private buildCacheKey(endpoint: string): string {
    return this.normalizeEndpoint(endpoint);
  }

  private async ensureCacheHydrated(): Promise<void> {
    if (this.isCacheHydrated) {
      return;
    }

    if (this.hydratePromise) {
      await this.hydratePromise;
      return;
    }

    this.hydratePromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(API_CACHE_STORAGE_KEY);
        if (!raw) {
          this.isCacheHydrated = true;
          return;
        }

        const parsed = JSON.parse(raw) as Record<string, CachedResponseEntry>;
        const now = Date.now();
        Object.entries(parsed).forEach(([key, entry]) => {
          if (entry && typeof entry.expiresAt === 'number' && entry.expiresAt > now) {
            this.memoryCache.set(key, entry);
          }
        });
        this.isCacheHydrated = true;
      } catch (error) {
        console.error('Error hydrating TMDB cache:', error);
        this.isCacheHydrated = true;
      } finally {
        this.hydratePromise = null;
      }
    })();

    await this.hydratePromise;
  }

  private getCachedResponse<T>(cacheKey: string): T | null {
    const entry = this.memoryCache.get(cacheKey);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.memoryCache.delete(cacheKey);
      this.scheduleCachePersist();
      return null;
    }

    return entry.data as T;
  }

  private trimCacheIfNeeded(): void {
    if (this.memoryCache.size <= MAX_CACHE_ENTRIES) {
      return;
    }

    const oldestEntries = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].updatedAt - b[1].updatedAt)
      .slice(0, this.memoryCache.size - MAX_CACHE_ENTRIES);

    oldestEntries.forEach(([key]) => {
      this.memoryCache.delete(key);
    });
  }

  private setCachedResponse(cacheKey: string, data: unknown, ttlMs: number): void {
    const now = Date.now();
    this.memoryCache.set(cacheKey, {
      data,
      expiresAt: now + ttlMs,
      updatedAt: now,
    });

    this.trimCacheIfNeeded();
    this.scheduleCachePersist();
  }

  private scheduleCachePersist(): void {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }

    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.persistCache().catch((error) => {
        console.error('Error persisting TMDB cache:', error);
      });
    }, PERSIST_DEBOUNCE_MS);
  }

  private async persistCache(): Promise<void> {
    const serialized = Object.fromEntries(this.memoryCache.entries());
    await AsyncStorage.setItem(API_CACHE_STORAGE_KEY, JSON.stringify(serialized));
  }

  public async clearCache(): Promise<void> {
    this.memoryCache.clear();
    this.inFlightRequests.clear();
    await AsyncStorage.removeItem(API_CACHE_STORAGE_KEY);
  }

  private async fetchAPI<T>(endpoint: string): Promise<T> {
    await this.ensureCacheHydrated();

    const cacheKey = this.buildCacheKey(endpoint);
    const cachedResponse = this.getCachedResponse<T>(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    const existingRequest = this.inFlightRequests.get(cacheKey);
    if (existingRequest) {
      return existingRequest as Promise<T>;
    }

    const requestPromise = (async () => {
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

        const data = (await response.json()) as T;
        this.setCachedResponse(cacheKey, data, this.getCacheTTL(endpoint));
        return data;
      } catch (error) {
        console.error('API fetch error:', error);
        throw error;
      } finally {
        this.inFlightRequests.delete(cacheKey);
      }
    })();

    this.inFlightRequests.set(cacheKey, requestPromise);

    try {
      return await requestPromise;
    } catch (error) {
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