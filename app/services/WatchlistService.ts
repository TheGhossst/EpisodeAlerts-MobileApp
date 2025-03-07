import AsyncStorage from '@react-native-async-storage/async-storage';
import { TVShow } from './TMDBService';

const WATCHLIST_STORAGE_KEY = '@EpisodeAlerts:watchlist';

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
      return true;
    } catch (error) {
      console.error('Error clearing watchlist:', error);
      return false;
    }
  }
}

export default WatchlistService.getInstance(); 