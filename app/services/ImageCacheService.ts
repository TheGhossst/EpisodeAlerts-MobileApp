import { Directory, File, Paths } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const IMAGE_CACHE_ENABLED_KEY = '@EpisodeAlerts:imageCacheEnabled';
const IMAGE_CACHE_DIR = new Directory(Paths.cache, 'images');
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
      if (!IMAGE_CACHE_DIR.exists) {
        IMAGE_CACHE_DIR.create({ intermediates: true, idempotent: true });
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
      const cachedFile = new File(IMAGE_CACHE_DIR, filename);
      
      // Check if the file exists in cache
      if (cachedFile.exists) {
        return cachedFile.uri;
      }
      
      // Download and cache the image
      const downloadResult = await File.downloadFileAsync(url, cachedFile, {
        idempotent: true,
      });

      // Update cache size with file size
      if (downloadResult.exists && downloadResult.size) {
        await this.updateCacheSize(downloadResult.size);
      }

      return downloadResult.uri;
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
      const files = IMAGE_CACHE_DIR.exists
        ? IMAGE_CACHE_DIR.list().filter((entry): entry is File => entry instanceof File)
        : [];
      
      if (files.length === 0) {
        return;
      }
      
      // Get file info with creation time
      const fileInfos: CacheFileInfo[] = [];
      
      for (const file of files) {
        if (!file.exists) {
          continue;
        }

        fileInfos.push({
          uri: file.uri,
          size: file.size || 0,
          modificationTime: file.modificationTime || 0,
        });
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
        
        new File(fileInfo.uri).delete();
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
      if (IMAGE_CACHE_DIR.exists) {
        IMAGE_CACHE_DIR.delete();
        IMAGE_CACHE_DIR.create({ intermediates: true, idempotent: true });
      }
      
      this.cacheSize = 0;
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  public async calculateCacheSize(): Promise<number> {
    try {
      if (IMAGE_CACHE_DIR.exists) {
        this.cacheSize = IMAGE_CACHE_DIR.size || 0;
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