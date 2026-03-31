import AsyncStorage from '@react-native-async-storage/async-storage';
import { TVShow, Episode } from './TMDBService';

const WATCHLIST_STORAGE_KEY = '@EpisodeAlerts:watchlist';
const WATCH_PROGRESS_STORAGE_KEY = '@EpisodeAlerts:watchProgress';

export interface LastWatchedEpisode {
  showId: number;
  showName: string;
  seasonNumber: number;
  episodeNumber: number;
  episodeName: string;
  watchedAt: number;
}

class WatchlistService {
  private static instance: WatchlistService;
  
  private constructor() {}
  
  public static getInstance(): WatchlistService {
    if (!WatchlistService.instance) {
      WatchlistService.instance = new WatchlistService();
    }
    return WatchlistService.instance;
  }
  
  async getWatchlist(): Promise<TVShow[]> {
    try {
      const watchlistJson = await AsyncStorage.getItem(WATCHLIST_STORAGE_KEY);
      return watchlistJson ? JSON.parse(watchlistJson) : [];
    } catch (error) {
      console.error('Error getting watchlist:', error);
      return [];
    }
  }
  
  async addToWatchlist(show: TVShow): Promise<boolean> {
    try {
      const currentWatchlist = await this.getWatchlist();
      
      if (currentWatchlist.some(item => item.id === show.id)) {
        return false;
      }
      
      const updatedWatchlist = [...currentWatchlist, show];
      await AsyncStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updatedWatchlist));
      return true;
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      return false;
    }
  }
  
  async removeFromWatchlist(showId: number): Promise<boolean> {
    try {
      const currentWatchlist = await this.getWatchlist();
      const updatedWatchlist = currentWatchlist.filter(show => show.id !== showId);
      
      await AsyncStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updatedWatchlist));
      await this.clearLastWatchedEpisode(showId);
      return true;
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      return false;
    }
  }
  
  async isInWatchlist(showId: number): Promise<boolean> {
    try {
      const watchlist = await this.getWatchlist();
      return watchlist.some(show => show.id === showId);
    } catch (error) {
      console.error('Error checking watchlist:', error);
      return false;
    }
  }
  
  async clearWatchlist(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(WATCHLIST_STORAGE_KEY);
      await AsyncStorage.removeItem(WATCH_PROGRESS_STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing watchlist:', error);
      return false;
    }
  }

  private async getProgressMap(): Promise<Record<string, LastWatchedEpisode>> {
    try {
      const progressJson = await AsyncStorage.getItem(WATCH_PROGRESS_STORAGE_KEY);
      return progressJson ? JSON.parse(progressJson) : {};
    } catch (error) {
      console.error('Error loading watch progress:', error);
      return {};
    }
  }

  async getLastWatchedEpisodes(): Promise<Record<string, LastWatchedEpisode>> {
    return this.getProgressMap();
  }

  async getLastWatchedEpisode(showId: number): Promise<LastWatchedEpisode | null> {
    const progressMap = await this.getProgressMap();
    return progressMap[String(showId)] || null;
  }

  async setLastWatchedEpisode(showId: number, showName: string, episode: Episode): Promise<boolean> {
    try {
      const progressMap = await this.getProgressMap();
      progressMap[String(showId)] = {
        showId,
        showName,
        seasonNumber: episode.season_number,
        episodeNumber: episode.episode_number,
        episodeName: episode.name,
        watchedAt: Date.now(),
      };

      await AsyncStorage.setItem(WATCH_PROGRESS_STORAGE_KEY, JSON.stringify(progressMap));
      return true;
    } catch (error) {
      console.error('Error setting last watched episode:', error);
      return false;
    }
  }

  async clearLastWatchedEpisode(showId: number): Promise<boolean> {
    try {
      const progressMap = await this.getProgressMap();
      delete progressMap[String(showId)];
      await AsyncStorage.setItem(WATCH_PROGRESS_STORAGE_KEY, JSON.stringify(progressMap));
      return true;
    } catch (error) {
      console.error('Error clearing last watched episode:', error);
      return false;
    }
  }
}

export default WatchlistService.getInstance(); 