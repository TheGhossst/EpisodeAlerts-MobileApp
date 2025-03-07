import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { TVShow } from './TMDBService';

const NOTIFICATIONS_ENABLED_KEY = '@EpisodeAlerts:notificationsEnabled';
const NOTIFICATION_SCHEDULE_KEY = '@EpisodeAlerts:notificationSchedule';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface ScheduledNotification {
  id: string;
  showId: number;
  showName: string;
  episodeName: string;
  seasonNumber: number;
  episodeNumber: number;
  scheduledTime: number;
}

class NotificationService {
  private static instance: NotificationService;
  private isEnabled: boolean = false;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async initialize(): Promise<boolean> {
    try {
      const notificationsEnabled = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
      this.isEnabled = notificationsEnabled === 'true';

      if (this.isEnabled) {
        await this.requestPermissions();
      }

      return this.isEnabled;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  public async requestPermissions(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        console.log('Notifications are not available in simulator/emulator');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Permission not granted for notifications');
        this.isEnabled = false;
        await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'false');
        return false;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('episode-alerts', {
          name: 'Episode Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  public async setEnabled(enabled: boolean): Promise<void> {
    try {
      this.isEnabled = enabled;
      await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled.toString());

      if (enabled) {
        const granted = await this.requestPermissions();
        if (!granted) {
          this.isEnabled = false;
        }
      } else {
        await this.cancelAllNotifications();
      }
    } catch (error) {
      console.error('Error setting notification enabled state:', error);
      throw error;
    }
  }

  public isNotificationsEnabled(): boolean {
    return this.isEnabled;
  }

  public async scheduleEpisodeNotification(show: TVShow): Promise<string | null> {
    if (!this.isEnabled || !show.next_episode_to_air || !show.next_episode_to_air.air_date) {
      return null;
    }

    try {
      const airDate = new Date(show.next_episode_to_air.air_date);
      const now = new Date();

      if (airDate < now) {
        console.log('Episode has already aired, not scheduling notification');
        return null;
      }

      // Schedule notification 1 day before air date
      const notificationDate = new Date(airDate);
      notificationDate.setDate(notificationDate.getDate() - 1);
      notificationDate.setHours(18, 0, 0, 0); // 6:00 PM
      
      // If the notification date has already passed, use the air date itself
      if (notificationDate < now) {
        notificationDate.setTime(airDate.getTime());
        notificationDate.setHours(9, 0, 0, 0); // 9:00 AM on air date
      }

      const scheduledNotifications = await this.getScheduledNotifications();
      const existingNotification = scheduledNotifications.find(
        n => n.showId === show.id && 
             n.seasonNumber === show.next_episode_to_air!.season_number &&
             n.episodeNumber === show.next_episode_to_air!.episode_number
      );

      if (existingNotification) {
        console.log('Notification already scheduled for this episode');
        return existingNotification.id;
      }

      // Create a unique ID for this notification
      const notificationId = `${show.id}-S${show.next_episode_to_air.season_number}-E${show.next_episode_to_air.episode_number}`;
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `New Episode Alert: ${show.name}`,
          body: `${show.next_episode_to_air.name} (S${show.next_episode_to_air.season_number}E${show.next_episode_to_air.episode_number}) airs soon!`,
          data: {
            showId: show.id,
            episodeId: show.next_episode_to_air.id
          },
        },
        trigger: null,
        identifier: notificationId,
      });

      console.log(`Scheduled immediate notification for testing purposes`);

      const newNotification: ScheduledNotification = {
        id: notificationId,
        showId: show.id,
        showName: show.name,
        episodeName: show.next_episode_to_air.name,
        seasonNumber: show.next_episode_to_air.season_number,
        episodeNumber: show.next_episode_to_air.episode_number,
        scheduledTime: notificationDate.getTime(),
      };

      await this.saveScheduledNotification(newNotification);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling episode notification:', error);
      return null;
    }
  }

  public async cancelShowNotifications(showId: number): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const scheduledNotifications = await this.getScheduledNotifications();
      const showNotifications = scheduledNotifications.filter(n => n.showId === showId);
      
      for (const notification of showNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.id);
        console.log(`Canceled notification: ${notification.id}`);
      }

      const updatedNotifications = scheduledNotifications.filter(n => n.showId !== showId);
      await this.saveScheduledNotifications(updatedNotifications);
    } catch (error) {
      console.error('Error canceling show notifications:', error);
      throw error;
    }
  }

  public async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await AsyncStorage.removeItem(NOTIFICATION_SCHEDULE_KEY);
      console.log('All notifications canceled');
    } catch (error) {
      console.error('Error canceling all notifications:', error);
      throw error;
    }
  }

  // Get all scheduled notifications
  private async getScheduledNotifications(): Promise<ScheduledNotification[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(NOTIFICATION_SCHEDULE_KEY);
      return jsonValue ? JSON.parse(jsonValue) : [];
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  // Save a scheduled notification
  private async saveScheduledNotification(notification: ScheduledNotification): Promise<void> {
    try {
      const notifications = await this.getScheduledNotifications();
      const updatedNotifications = [...notifications.filter(n => n.id !== notification.id), notification];
      await this.saveScheduledNotifications(updatedNotifications);
    } catch (error) {
      console.error('Error saving scheduled notification:', error);
      throw error;
    }
  }

  // Save all scheduled notifications
  private async saveScheduledNotifications(notifications: ScheduledNotification[]): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTIFICATION_SCHEDULE_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving scheduled notifications:', error);
      throw error;
    }
  }
}

export default NotificationService.getInstance();