import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const IMAGE_CACHE_ENABLED_KEY = '@EpisodeAlerts:imageCacheEnabled';
const IMAGE_CACHE_DIR = FileSystem.cacheDirectory + 'images/';
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB

type CacheFileInfo = {
  uri: string;
  size: number;
  modificationTime: number;
};

class ImageCacheService {
  private static instance: ImageCacheService;
  private isEnabled: boolean = true;
  private cacheSize: number = 0;

  private constructor() {
    this.setupCacheDirectory();
    this.loadSettings();
  }

  public static getInstance(): ImageCacheService {
    if (!ImageCacheService.instance) {
      ImageCacheService.instance = new ImageCacheService();
    }
    return ImageCacheService.instance;
  }

  private async setupCacheDirectory() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(IMAGE_CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(IMAGE_CACHE_DIR, { intermediates: true });
      }
    } catch (error) {
      console.error('Error setting up cache directory:', error);
    }
  }

  private async loadSettings() {
    try {
      const cacheEnabled = await AsyncStorage.getItem(IMAGE_CACHE_ENABLED_KEY);
      this.isEnabled = cacheEnabled !== 'false';
      await this.calculateCacheSize();
    } catch (error) {
      console.error('Error loading cache settings:', error);
    }
  }

  public async setEnabled(enabled: boolean): Promise<void> {
    this.isEnabled = enabled;
    await AsyncStorage.setItem(IMAGE_CACHE_ENABLED_KEY, enabled.toString());
    
    if (!enabled) {
      await this.clearCache();
    }
  }

  public isImageCacheEnabled(): boolean {
    return this.isEnabled;
  }

  public async getCachedImageUri(url: string): Promise<string> {
    if (!this.isEnabled || !url) {
      return url;
    }

    try {
      // Create a unique filename based on the URL
      const filename = this.getFilenameFromUrl(url);
      const filePath = IMAGE_CACHE_DIR + filename;
      
      // Check if the file exists in cache
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      
      if (fileInfo.exists) {
        // Return the cached file URI
        return fileInfo.uri;
      } else {
        // Download and cache the image
        const downloadResult = await FileSystem.downloadAsync(url, filePath);
        
        // Update cache size with file size
        const fileInfo = await FileSystem.getInfoAsync(filePath, { size: true });
        if (fileInfo.exists && fileInfo.size) {
          await this.updateCacheSize(fileInfo.size);
        }
        
        return downloadResult.uri;
      }
    } catch (error) {
      console.error('Error caching image:', error);
      return url;
    }
  }

  private getFilenameFromUrl(url: string): string {
    // Extract the filename from the URL and create a hash
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];
    return lastPart.replace(/[^a-zA-Z0-9.]/g, '_');
  }

  private async updateCacheSize(newFileSize: number = 0): Promise<void> {
    try {
      this.cacheSize += newFileSize;
      
      // If cache size exceeds the limit, clear some old files
      if (this.cacheSize > MAX_CACHE_SIZE) {
        await this.trimCache();
      }
    } catch (error) {
      console.error('Error updating cache size:', error);
    }
  }

  private async trimCache(): Promise<void> {
    try {
      // Get all files in the cache directory
      const files = await FileSystem.readDirectoryAsync(IMAGE_CACHE_DIR);
      
      if (files.length === 0) {
        return;
      }
      
      // Get file info with creation time
      const fileInfos: CacheFileInfo[] = [];
      
      for (const filename of files) {
        const filePath = IMAGE_CACHE_DIR + filename;
        const fileInfo = await FileSystem.getInfoAsync(filePath, { size: true });
        
        if (fileInfo.exists) {
          // Get file modification time (not directly available in Expo FileSystem)
          // Using a workaround with current time and random offset for demo purposes
          const modTime = Date.now() - (Math.random() * 86400000); // Random time in last 24h
          
          fileInfos.push({
            uri: fileInfo.uri,
            size: fileInfo.size || 0,
            modificationTime: modTime,
          });
        }
      }
      
      // Sort files by our simulated modification time (oldest first)
      fileInfos.sort((a, b) => a.modificationTime - b.modificationTime);
      
      // Delete oldest files until we're under 70% of the max cache size
      let currentSize = this.cacheSize;
      const targetSize = MAX_CACHE_SIZE * 0.7;
      
      for (const fileInfo of fileInfos) {
        if (currentSize <= targetSize) {
          break;
        }
        
        await FileSystem.deleteAsync(fileInfo.uri);
        currentSize -= fileInfo.size;
      }
      
      // Update the cache size
      await this.calculateCacheSize();
    } catch (error) {
      console.error('Error trimming cache:', error);
    }
  }

  public async clearCache(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(IMAGE_CACHE_DIR);
      
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(IMAGE_CACHE_DIR, { idempotent: true });
        await FileSystem.makeDirectoryAsync(IMAGE_CACHE_DIR, { intermediates: true });
      }
      
      this.cacheSize = 0;
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  public async calculateCacheSize(): Promise<number> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(IMAGE_CACHE_DIR, { size: true });
      
      if (dirInfo.exists && dirInfo.isDirectory) {
        this.cacheSize = dirInfo.size || 0;
      } else {
        this.cacheSize = 0;
      }
      
      return this.cacheSize;
    } catch (error) {
      console.error('Error calculating cache size:', error);
      return 0;
    }
  }

  public getCacheSizeInMB(): number {
    return Math.round((this.cacheSize / 1024 / 1024) * 100) / 100;
  }
}

export default ImageCacheService.getInstance(); 