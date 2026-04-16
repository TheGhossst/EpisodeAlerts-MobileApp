import AsyncStorage from '@react-native-async-storage/async-storage';
import UserPreferencesService from './UserPreferencesService';
import { reportError } from '@/app/utils/errorHandling';

const ANALYTICS_STORAGE_KEY = '@EpisodeAlerts:analytics';
const SESSION_START_KEY = '@EpisodeAlerts:sessionStart';

export enum EventType {
  // Screen views
  VIEW_HOME = 'view_home',
  VIEW_SEARCH = 'view_search',
  VIEW_WATCHLIST = 'view_watchlist',
  VIEW_SHOW_DETAILS = 'view_show_details',
  VIEW_SEASON_DETAILS = 'view_season_details',
  VIEW_SETTINGS = 'view_settings',
  
  // User actions
  ADD_TO_WATCHLIST = 'add_to_watchlist',
  REMOVE_FROM_WATCHLIST = 'remove_from_watchlist',
  SEARCH_QUERY = 'search_query',
  SET_NOTIFICATION = 'set_notification',
  CHANGE_THEME = 'change_theme',
  CHANGE_SETTINGS = 'change_settings',
  
  // Sessions
  APP_OPEN = 'app_open',
  APP_CLOSE = 'app_close',
  
  // Errors
  ERROR = 'error',
}

export interface AnalyticsEvent {
  id: string;
  userId: string;
  type: EventType;
  timestamp: string;
  data?: Record<string, any>;
}

interface Session {
  id: string;
  userId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private events: AnalyticsEvent[] = [];
  private currentSession?: Session;
  private initialized = false;
  private analyticsEnabled = true;
  private maxStoredEvents = 100;
  
  private constructor() {}
  
  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }
  
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      await UserPreferencesService.initialize();
      this.analyticsEnabled = UserPreferencesService.isAnalyticsEnabled();
      
      UserPreferencesService.subscribe((prefs) => {
        this.analyticsEnabled = prefs.analyticsEnabled;
      });
      
      // Load cached events
      await this.loadEvents();

      this.initialized = true;
      
      await this.startSession();
    } catch (error) {
      reportError('AnalyticsService.initialize', error, {
        fallbackMessage: 'Failed to initialize analytics service.',
        trackAnalytics: false,
      });
    }
  }
  
  public async trackEvent(type: EventType, data?: Record<string, any>): Promise<void> {
    if (!this.analyticsEnabled || !this.initialized) {
      return;
    }
    
    try {
      const userId = UserPreferencesService.getUserId();
      const sanitizedData = this.sanitizeEventData(data);
      const event: AnalyticsEvent = {
        id: this.generateId(),
        userId,
        type,
        timestamp: new Date().toISOString(),
      };

      if (sanitizedData) {
        event.data = sanitizedData;
      }
      
      this.events.push(event);
      
      // If we have too many events, remove the oldest ones
      if (this.events.length > this.maxStoredEvents) {
        this.events = this.events.slice(-this.maxStoredEvents);
      }
      
      await this.saveEvents();
      
      console.log('Analytics event tracked:', event);
    } catch (error) {
      reportError('AnalyticsService.trackEvent', error, {
        fallbackMessage: 'Failed to track analytics event.',
        trackAnalytics: false,
      });
    }
  }
  
  public async trackScreenView(screenName: string, data?: Record<string, any>): Promise<void> {
    let eventType: EventType;
    
    switch (screenName.toLowerCase()) {
      case 'home':
        eventType = EventType.VIEW_HOME;
        break;
      case 'search':
        eventType = EventType.VIEW_SEARCH;
        break;
      case 'watchlist':
        eventType = EventType.VIEW_WATCHLIST;
        break;
      case 'show-details':
        eventType = EventType.VIEW_SHOW_DETAILS;
        break;
      case 'season-details':
        eventType = EventType.VIEW_SEASON_DETAILS;
        break;
      case 'settings':
        eventType = EventType.VIEW_SETTINGS;
        break;
      default:
        eventType = EventType.VIEW_HOME;
    }
    
    await this.trackEvent(eventType, data);
  }
  
  public async trackError(errorMessage: string, data?: Record<string, any>): Promise<void> {
    const errorData = {
      message: errorMessage,
      ...data,
    };
    
    await this.trackEvent(EventType.ERROR, errorData);
  }
  
  // Start a new session
  public async startSession(): Promise<void> {
    if (!this.analyticsEnabled) {
      return;
    }
    
    try {
      const userId = UserPreferencesService.getUserId();
      const sessionId = this.generateId();
      const startTime = new Date().toISOString();
      
      this.currentSession = {
        id: sessionId,
        userId,
        startTime,
      };
      
      await AsyncStorage.setItem(SESSION_START_KEY, startTime);
      
      // Track app open event
      await this.trackEvent(EventType.APP_OPEN, {
        sessionId,
      });
    } catch (error) {
      reportError('AnalyticsService.startSession', error, {
        fallbackMessage: 'Failed to start analytics session.',
        trackAnalytics: false,
      });
    }
  }
  
  // End current session
  public async endSession(): Promise<void> {
    if (!this.analyticsEnabled || !this.currentSession) {
      return;
    }
    
    try {
      const endTime = new Date().toISOString();
      const startTime = new Date(this.currentSession.startTime);
      const endTimeDate = new Date(endTime);
      
      // Calculate duration in seconds
      const duration = Math.floor((endTimeDate.getTime() - startTime.getTime()) / 1000);
      
      this.currentSession.endTime = endTime;
      this.currentSession.duration = duration;
      
      await this.trackEvent(EventType.APP_CLOSE, {
        sessionId: this.currentSession.id,
        duration,
      });
      
      console.log('Session ended:', this.currentSession);
      
      // Clear session
      await AsyncStorage.removeItem(SESSION_START_KEY);
      this.currentSession = undefined;
    } catch (error) {
      reportError('AnalyticsService.endSession', error, {
        fallbackMessage: 'Failed to end analytics session.',
        trackAnalytics: false,
      });
    }
  }
  
  // Get the events (for debugging)
  public getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }
  
  // Clear all events
  public async clearEvents(): Promise<void> {
    this.events = [];
    await AsyncStorage.removeItem(ANALYTICS_STORAGE_KEY);
  }
  
  // Load events from storage
  private async loadEvents(): Promise<void> {
    try {
      const eventsJson = await AsyncStorage.getItem(ANALYTICS_STORAGE_KEY);
      if (eventsJson) {
        const parsed = JSON.parse(eventsJson) as AnalyticsEvent[];
        this.events = Array.isArray(parsed)
          ? parsed.map((event) => {
              const normalizedEvent: AnalyticsEvent = {
                id: event.id,
                userId: event.userId,
                type: event.type,
                timestamp: event.timestamp,
              };

              const sanitizedData = this.sanitizeEventData(event.data);
              if (sanitizedData) {
                normalizedEvent.data = sanitizedData;
              }

              return normalizedEvent;
            })
          : [];
      }
    } catch (error) {
      reportError('AnalyticsService.loadEvents', error, {
        fallbackMessage: 'Failed to load analytics events.',
        trackAnalytics: false,
      });
    }
  }
  
  // Save events to storage
  private async saveEvents(): Promise<void> {
    try {
      await AsyncStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(this.events));
    } catch (error) {
      reportError('AnalyticsService.saveEvents', error, {
        fallbackMessage: 'Failed to save analytics events.',
        trackAnalytics: false,
      });
    }
  }

  private sanitizeEventData(data: unknown): Record<string, any> | undefined {
    const sanitized = this.sanitizeForFirestore(data);
    if (!sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) {
      return undefined;
    }

    const record = sanitized as Record<string, any>;
    return Object.keys(record).length > 0 ? record : undefined;
  }

  private sanitizeForFirestore(value: unknown): unknown {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    if (Array.isArray(value)) {
      return value
        .map((item) => this.sanitizeForFirestore(item))
        .filter((item) => item !== undefined);
    }

    if (typeof value === 'object') {
      const result: Record<string, unknown> = {};
      Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
        const sanitizedItem = this.sanitizeForFirestore(item);
        if (sanitizedItem !== undefined) {
          result[key] = sanitizedItem;
        }
      });

      return result;
    }

    return value;
  }
  
  // Generate a unique ID
  private generateId(): string {
    return 'event_' + Math.random().toString(36).substring(2, 15);
  }
}

export default AnalyticsService.getInstance(); 