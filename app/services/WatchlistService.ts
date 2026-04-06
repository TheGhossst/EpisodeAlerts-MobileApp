import AsyncStorage from '@react-native-async-storage/async-storage';
import { TVShow, Episode } from './TMDBService';

const WATCHLIST_STORAGE_KEY = '@EpisodeAlerts:watchlist';
const WATCH_PROGRESS_STORAGE_KEY = '@EpisodeAlerts:watchProgress';
const WATCH_HISTORY_STORAGE_KEY = '@EpisodeAlerts:watchHistory';

export interface LastWatchedEpisode {
  showId: number;
  showName: string;
  seasonNumber: number;
  episodeNumber: number;
  episodeName: string;
  watchedAt: number;
}

export interface WatchHistoryEntry extends LastWatchedEpisode {
  id: string;
}

export interface WatchlistEntry {
  show: TVShow;
  addedAt: number;
}

export interface WatchlistSnapshot {
  watchlist: WatchlistEntry[];
  progressMap: Record<string, LastWatchedEpisode>;
  historyMap: Record<string, WatchHistoryEntry[]>;
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

  private triggerCloudSync(): void {
    void import('./CloudSyncService')
      .then((module) => module.default.syncToCloudIfSignedIn())
      .catch((error) => {
        console.error('Error triggering cloud sync:', error);
      });
  }

  private normalizeWatchlist(rawWatchlist: unknown): WatchlistEntry[] {
    if (!Array.isArray(rawWatchlist)) {
      return [];
    }

    const now = Date.now();
    const normalized: WatchlistEntry[] = [];

    rawWatchlist.forEach((item, index) => {
      if (item && typeof item === 'object' && 'show' in item) {
        const entry = item as { show?: TVShow; addedAt?: number };
        if (!entry.show || typeof entry.show.id !== 'number') {
          return;
        }

        normalized.push({
          show: {
            ...entry.show,
            addedAt: entry.addedAt,
          },
          addedAt: typeof entry.addedAt === 'number' ? entry.addedAt : now,
        });

        return;
      }

      const show = item as TVShow;
      if (!show || typeof show.id !== 'number') {
        return;
      }

      const addedAt = show.addedAt ?? now - (rawWatchlist.length - index);
      normalized.push({
        show: {
          ...show,
          // Preserve original order for legacy arrays by creating stable timestamps.
          addedAt,
        },
        addedAt,
      });
    });

    return normalized;
  }

  private async getWatchlistEntries(): Promise<WatchlistEntry[]> {
    try {
      const watchlistJson = await AsyncStorage.getItem(WATCHLIST_STORAGE_KEY);
      const normalized = this.normalizeWatchlist(watchlistJson ? JSON.parse(watchlistJson) : []);
      await this.saveWatchlistEntries(normalized);
      return normalized;
    } catch (error) {
      console.error('Error getting watchlist entries:', error);
      return [];
    }
  }

  private async saveWatchlistEntries(entries: WatchlistEntry[]): Promise<void> {
    await AsyncStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(entries));
  }
  
  async getWatchlist(): Promise<TVShow[]> {
    try {
      const entries = await this.getWatchlistEntries();
      return entries.map((entry) => ({
        ...entry.show,
        addedAt: entry.addedAt,
      }));
    } catch (error) {
      console.error('Error getting watchlist:', error);
      return [];
    }
  }

  async getWatchlistSnapshot(): Promise<WatchlistSnapshot> {
    const [watchlist, progressMap, historyMap] = await Promise.all([
      this.getWatchlistEntries(),
      this.getProgressMap(),
      this.getHistoryMap(),
    ]);

    return {
      watchlist,
      progressMap,
      historyMap,
    };
  }

  async restoreWatchlistSnapshot(
    snapshot: WatchlistSnapshot,
    options?: { skipCloudSync?: boolean },
  ): Promise<boolean> {
    try {
      await this.saveWatchlistEntries(snapshot.watchlist);
      await AsyncStorage.setItem(WATCH_PROGRESS_STORAGE_KEY, JSON.stringify(snapshot.progressMap));
      await AsyncStorage.setItem(WATCH_HISTORY_STORAGE_KEY, JSON.stringify(snapshot.historyMap));

      if (!options?.skipCloudSync) {
        this.triggerCloudSync();
      }

      return true;
    } catch (error) {
      console.error('Error restoring watchlist snapshot:', error);
      return false;
    }
  }
  
  async addToWatchlist(show: TVShow): Promise<boolean> {
    try {
      const currentEntries = await this.getWatchlistEntries();
      
      if (currentEntries.some((item) => item.show.id === show.id)) {
        return false;
      }

      const addedAt = Date.now();
      const entry: WatchlistEntry = {
        show: {
          ...show,
          addedAt,
        },
        addedAt,
      };
      
      const updatedWatchlist = [...currentEntries, entry];
      await this.saveWatchlistEntries(updatedWatchlist);
      this.triggerCloudSync();
      return true;
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      return false;
    }
  }
  
  async removeFromWatchlist(showId: number): Promise<boolean> {
    try {
      const currentWatchlist = await this.getWatchlistEntries();
      const updatedWatchlist = currentWatchlist.filter((show) => show.show.id !== showId);
      
      await this.saveWatchlistEntries(updatedWatchlist);
      await this.clearLastWatchedEpisode(showId, { skipCloudSync: true });
      await this.clearWatchHistory(showId, { skipCloudSync: true });
      this.triggerCloudSync();
      return true;
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      return false;
    }
  }
  
  async isInWatchlist(showId: number): Promise<boolean> {
    try {
      const watchlist = await this.getWatchlistEntries();
      return watchlist.some((show) => show.show.id === showId);
    } catch (error) {
      console.error('Error checking watchlist:', error);
      return false;
    }
  }
  
  async clearWatchlist(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(WATCHLIST_STORAGE_KEY);
      await AsyncStorage.removeItem(WATCH_PROGRESS_STORAGE_KEY);
      await AsyncStorage.removeItem(WATCH_HISTORY_STORAGE_KEY);
      this.triggerCloudSync();
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

  private async getHistoryMap(): Promise<Record<string, WatchHistoryEntry[]>> {
    try {
      const historyJson = await AsyncStorage.getItem(WATCH_HISTORY_STORAGE_KEY);
      return historyJson ? JSON.parse(historyJson) : {};
    } catch (error) {
      console.error('Error loading watch history:', error);
      return {};
    }
  }

  async getWatchHistory(showId: number): Promise<WatchHistoryEntry[]> {
    const historyMap = await this.getHistoryMap();
    return (historyMap[String(showId)] || []).sort((a, b) => b.watchedAt - a.watchedAt);
  }

  private async appendWatchHistory(showId: number, showName: string, episode: Episode): Promise<void> {
    const historyMap = await this.getHistoryMap();
    const showKey = String(showId);
    const existing = historyMap[showKey] || [];
    const nextEntry: WatchHistoryEntry = {
      id: `${showId}-${episode.season_number}-${episode.episode_number}-${Date.now()}`,
      showId,
      showName,
      seasonNumber: episode.season_number,
      episodeNumber: episode.episode_number,
      episodeName: episode.name,
      watchedAt: Date.now(),
    };

    const deduped = existing.filter(
      (entry) =>
        !(
          entry.seasonNumber === episode.season_number &&
          entry.episodeNumber === episode.episode_number &&
          Math.abs(entry.watchedAt - nextEntry.watchedAt) < 60_000
        ),
    );

    historyMap[showKey] = [nextEntry, ...deduped].slice(0, 50);
    await AsyncStorage.setItem(WATCH_HISTORY_STORAGE_KEY, JSON.stringify(historyMap));
  }

  async getLastWatchedEpisode(showId: number): Promise<LastWatchedEpisode | null> {
    const progressMap = await this.getProgressMap();
    return progressMap[String(showId)] || null;
  }

  async setLastWatchedEpisode(showId: number, showName: string, episode: Episode): Promise<boolean> {
    try {
      const progressMap = await this.getProgressMap();
      const watchedAt = Date.now();
      progressMap[String(showId)] = {
        showId,
        showName,
        seasonNumber: episode.season_number,
        episodeNumber: episode.episode_number,
        episodeName: episode.name,
        watchedAt,
      };

      await AsyncStorage.setItem(WATCH_PROGRESS_STORAGE_KEY, JSON.stringify(progressMap));
      await this.appendWatchHistory(showId, showName, episode);
      this.triggerCloudSync();
      return true;
    } catch (error) {
      console.error('Error setting last watched episode:', error);
      return false;
    }
  }

  async clearLastWatchedEpisode(showId: number, options?: { skipCloudSync?: boolean }): Promise<boolean> {
    try {
      const progressMap = await this.getProgressMap();
      delete progressMap[String(showId)];
      await AsyncStorage.setItem(WATCH_PROGRESS_STORAGE_KEY, JSON.stringify(progressMap));

      if (!options?.skipCloudSync) {
        this.triggerCloudSync();
      }

      return true;
    } catch (error) {
      console.error('Error clearing last watched episode:', error);
      return false;
    }
  }

  async clearWatchHistory(showId: number, options?: { skipCloudSync?: boolean }): Promise<boolean> {
    try {
      const historyMap = await this.getHistoryMap();
      delete historyMap[String(showId)];
      await AsyncStorage.setItem(WATCH_HISTORY_STORAGE_KEY, JSON.stringify(historyMap));

      if (!options?.skipCloudSync) {
        this.triggerCloudSync();
      }

      return true;
    } catch (error) {
      console.error('Error clearing watch history:', error);
      return false;
    }
  }
}

export default WatchlistService.getInstance(); 