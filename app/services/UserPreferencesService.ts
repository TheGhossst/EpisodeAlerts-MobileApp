import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from './NotificationService';

const THEME_KEY = '@EpisodeAlerts:theme';
const ANALYTICS_ENABLED_KEY = '@EpisodeAlerts:analyticsEnabled';
const NOTIFICATIONS_ENABLED_KEY = '@EpisodeAlerts:notificationsEnabled';
const USER_ID_KEY = '@EpisodeAlerts:userId';
const FIRST_LAUNCH_KEY = '@EpisodeAlerts:firstLaunch';
const LAST_OPEN_DATE_KEY = '@EpisodeAlerts:lastOpenDate';

export type ThemeType = 'dark' | 'light' | 'system';

export interface UserPreferences {
  theme: ThemeType;
  notificationsEnabled: boolean;
  analyticsEnabled: boolean;
  userId: string;
  isFirstLaunch: boolean;
  lastOpenDate: string;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark',
  notificationsEnabled: false,
  analyticsEnabled: true,
  userId: '',
  isFirstLaunch: true,
  lastOpenDate: new Date().toISOString(),
};

// Generate a random user ID for analytics
const generateUserId = (): string => {
  return 'user_' + Math.random().toString(36).substring(2, 15);
};

class UserPreferencesService {
  private static instance: UserPreferencesService;
  private preferences: UserPreferences = { ...DEFAULT_PREFERENCES };
  private initialized: boolean = false;
  private callbacks: Array<(preferences: UserPreferences) => void> = [];

  private constructor() {}

  public static getInstance(): UserPreferencesService {
    if (!UserPreferencesService.instance) {
      UserPreferencesService.instance = new UserPreferencesService();
    }
    return UserPreferencesService.instance;
  }

  public async initialize(): Promise<UserPreferences> {
    if (this.initialized) {
      return this.preferences;
    }
    
    try {
      const theme = await AsyncStorage.getItem(THEME_KEY);
      if (theme) {
        this.preferences.theme = theme as ThemeType;
      }

      const notificationsEnabled = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
      this.preferences.notificationsEnabled = notificationsEnabled === 'true';
      
      const notifStatus = await NotificationService.initialize();
      if (notifStatus !== this.preferences.notificationsEnabled) {
        this.preferences.notificationsEnabled = notifStatus;
      }

      const analyticsEnabled = await AsyncStorage.getItem(ANALYTICS_ENABLED_KEY);
      if (analyticsEnabled !== null) {
        this.preferences.analyticsEnabled = analyticsEnabled === 'true';
      }

      // Load or generate user ID
      const userId = await AsyncStorage.getItem(USER_ID_KEY);
      if (userId) {
        this.preferences.userId = userId;
      } else {
        this.preferences.userId = generateUserId();
        await AsyncStorage.setItem(USER_ID_KEY, this.preferences.userId);
      }

      const firstLaunch = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
      this.preferences.isFirstLaunch = firstLaunch !== 'false';
      if (this.preferences.isFirstLaunch) {
        await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'false');
      }

      this.preferences.lastOpenDate = new Date().toISOString();
      await AsyncStorage.setItem(LAST_OPEN_DATE_KEY, this.preferences.lastOpenDate);

      this.initialized = true;
      return this.preferences;
    } catch (error) {
      console.error('Error initializing user preferences:', error);
      return this.preferences;
    }
  }

  public subscribe(callback: (preferences: UserPreferences) => void): () => void {
    this.callbacks.push(callback);
    
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  public getPreferences(): UserPreferences {
    return { ...this.preferences };
  }

  public async setTheme(theme: ThemeType): Promise<void> {
    try {
      this.preferences.theme = theme;
      await AsyncStorage.setItem(THEME_KEY, theme);
      this.notifyListeners();
    } catch (error) {
      console.error('Error setting theme:', error);
      throw error;
    }
  }

  public async setNotificationsEnabled(enabled: boolean): Promise<void> {
    try {
      await NotificationService.setEnabled(enabled);
      
      this.preferences.notificationsEnabled = enabled;
      await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled.toString());
      this.notifyListeners();
    } catch (error) {
      console.error('Error setting notifications:', error);
      throw error;
    }
  }

  public async setAnalyticsEnabled(enabled: boolean): Promise<void> {
    try {
      this.preferences.analyticsEnabled = enabled;
      await AsyncStorage.setItem(ANALYTICS_ENABLED_KEY, enabled.toString());
      this.notifyListeners();
    } catch (error) {
      console.error('Error setting analytics:', error);
      throw error;
    }
  }

  public getTheme(): ThemeType {
    return this.preferences.theme;
  }

  public isNotificationsEnabled(): boolean {
    return this.preferences.notificationsEnabled;
  }

  // Check if analytics are enabled
  public isAnalyticsEnabled(): boolean {
    return this.preferences.analyticsEnabled;
  }

  // Get user ID for analytics
  public getUserId(): string {
    return this.preferences.userId;
  }

  // Reset preferences to defaults
  public async resetPreferences(): Promise<void> {
    try {
      const userId = this.preferences.userId; // Keep the user ID
      this.preferences = { ...DEFAULT_PREFERENCES, userId };
      
      await AsyncStorage.setItem(THEME_KEY, this.preferences.theme);
      await AsyncStorage.setItem(ANALYTICS_ENABLED_KEY, this.preferences.analyticsEnabled.toString());
      await NotificationService.setEnabled(this.preferences.notificationsEnabled);
      await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, this.preferences.notificationsEnabled.toString());
      
      this.notifyListeners();
    } catch (error) {
      console.error('Error resetting preferences:', error);
      throw error;
    }
  }

  private notifyListeners(): void {
    for (const callback of this.callbacks) {
      callback(this.getPreferences());
    }
  }
}

export default UserPreferencesService.getInstance(); 