import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import TMDBService, { TVShow, Episode } from "./TMDBService";
import WatchlistService from "./WatchlistService";
import { reportError } from "@/app/utils/errorHandling";

const NOTIFICATIONS_ENABLED_KEY = "@EpisodeAlerts:notificationsEnabled";
const NOTIFICATION_SCHEDULE_KEY = "@EpisodeAlerts:notificationSchedule";
const NOTIFIED_RELEASE_EPISODES_KEY = "@EpisodeAlerts:notifiedReleaseEpisodes";
const RELEASE_CHECK_LAST_RUN_KEY = "@EpisodeAlerts:releaseCheckLastRun";
const RELEASE_CHECK_MIN_INTERVAL_MS = 10 * 60 * 1000;
const RELEASE_SYNC_INTERVAL_MS = 15 * 60 * 1000;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
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
  private lastReleaseCheckAt: number = 0;
  private releaseSyncTimer: ReturnType<typeof setInterval> | null = null;
  private isReleaseSyncInProgress: boolean = false;
  private notificationResponseSubscription: Notifications.EventSubscription | null =
    null;
  private isInitialResponseHandled = false;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async initialize(): Promise<boolean> {
    try {
      const notificationsEnabled = await AsyncStorage.getItem(
        NOTIFICATIONS_ENABLED_KEY,
      );
      this.isEnabled = notificationsEnabled === "true";

      if (this.isEnabled) {
        await this.requestPermissions();
      }

      return this.isEnabled;
    } catch (error) {
      reportError("NotificationService.initialize", error, {
        fallbackMessage: "Failed to initialize notifications.",
      });
      return false;
    }
  }

  public async requestPermissions(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        console.log("Notifications are not available in simulator/emulator");
        return false;
      }

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Permission not granted for notifications");
        this.isEnabled = false;
        await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "false");
        return false;
      }

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("episode-alerts", {
          name: "Episode Alerts",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }

      return true;
    } catch (error) {
      reportError("NotificationService.requestPermissions", error, {
        fallbackMessage:
          "Failed to request notification permissions. Please try again.",
      });
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
          this.stopReleaseSync();
          return;
        }

        this.startReleaseSync();
        await this.runReleaseSyncCycle();
      } else {
        this.stopReleaseSync();
        await this.cancelAllNotifications();
      }
    } catch (error) {
      throw reportError("NotificationService.setEnabled", error, {
        fallbackMessage: "Failed to update notification settings.",
      });
    }
  }

  public isNotificationsEnabled(): boolean {
    return this.isEnabled;
  }

  public startReleaseSync(intervalMs: number = RELEASE_SYNC_INTERVAL_MS): void {
    if (!this.isEnabled || this.releaseSyncTimer) {
      return;
    }

    this.releaseSyncTimer = setInterval(() => {
      void this.runReleaseSyncCycle();
    }, intervalMs);

    void this.runReleaseSyncCycle();
  }

  private parseShowIdFromNotificationData(data: unknown): number | null {
    if (!data || typeof data !== "object") {
      return null;
    }

    const showIdValue = (data as Record<string, unknown>).showId;
    if (typeof showIdValue === "number") {
      return showIdValue;
    }

    if (typeof showIdValue === "string") {
      const parsed = Number(showIdValue);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private handleNotificationResponse(
    response: Notifications.NotificationResponse | null,
    onShowPress: (showId: number) => void,
  ): void {
    if (!response) {
      return;
    }

    const showId = this.parseShowIdFromNotificationData(
      response.notification.request.content.data,
    );
    if (showId) {
      onShowPress(showId);
    }
  }

  public registerNotificationTapHandler(
    onShowPress: (showId: number) => void,
  ): () => void {
    this.unregisterNotificationTapHandler();

    this.notificationResponseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        this.handleNotificationResponse(response, onShowPress);
      });

    if (!this.isInitialResponseHandled) {
      this.isInitialResponseHandled = true;
      void Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          this.handleNotificationResponse(response, onShowPress);
        })
        .catch((error) => {
          reportError(
            "NotificationService.registerNotificationTapHandler",
            error,
            {
              fallbackMessage: "Failed to process initial notification tap.",
              trackAnalytics: false,
            },
          );
        });
    }

    return () => {
      this.unregisterNotificationTapHandler();
    };
  }

  public unregisterNotificationTapHandler(): void {
    if (!this.notificationResponseSubscription) {
      return;
    }

    this.notificationResponseSubscription.remove();
    this.notificationResponseSubscription = null;
  }

  public stopReleaseSync(): void {
    if (!this.releaseSyncTimer) {
      return;
    }

    clearInterval(this.releaseSyncTimer);
    this.releaseSyncTimer = null;
  }

  private async runReleaseSyncCycle(): Promise<void> {
    if (this.isReleaseSyncInProgress) {
      return;
    }

    this.isReleaseSyncInProgress = true;
    try {
      await this.syncWatchlistReleaseNotifications();
    } finally {
      this.isReleaseSyncInProgress = false;
    }
  }

  public async scheduleEpisodeNotification(
    show: TVShow,
  ): Promise<string | null> {
    if (
      !this.isEnabled ||
      !show.next_episode_to_air ||
      !show.next_episode_to_air.air_date
    ) {
      return null;
    }

    try {
      const airDate = new Date(show.next_episode_to_air.air_date);
      const now = new Date();

      if (airDate < now) {
        console.log("Episode has already aired, not scheduling notification");
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
        (n) =>
          n.showId === show.id &&
          n.seasonNumber === show.next_episode_to_air!.season_number &&
          n.episodeNumber === show.next_episode_to_air!.episode_number,
      );

      if (existingNotification) {
        console.log("Notification already scheduled for this episode");
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
            episodeId: show.next_episode_to_air.id,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: notificationDate,
        },
        identifier: notificationId,
      });

      console.log(
        `Scheduled notification for ${notificationDate.toISOString()}`,
      );

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
      reportError("NotificationService.scheduleEpisodeNotification", error, {
        fallbackMessage: "Failed to schedule episode notification.",
      });
      return null;
    }
  }

  public async syncWatchlistReleaseNotifications(
    watchlistOverride?: TVShow[],
  ): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    const now = Date.now();
    if (now - this.lastReleaseCheckAt < RELEASE_CHECK_MIN_INTERVAL_MS) {
      return;
    }

    this.lastReleaseCheckAt = now;

    try {
      const watchlist =
        watchlistOverride ?? (await WatchlistService.getWatchlist());
      if (watchlist.length === 0) {
        await AsyncStorage.setItem(RELEASE_CHECK_LAST_RUN_KEY, now.toString());
        return;
      }

      const lastRunRaw = await AsyncStorage.getItem(RELEASE_CHECK_LAST_RUN_KEY);
      const hasLastRun = !!lastRunRaw;
      const lastRun = hasLastRun ? Number(lastRunRaw) : now;
      const notifiedMap = await this.getNotifiedReleaseEpisodesMap();

      for (const watchlistShow of watchlist) {
        const details = await TMDBService.getTVShowDetails(
          watchlistShow.id,
        ).catch(() => null);
        if (!details) {
          continue;
        }

        await this.scheduleEpisodeNotification(details);

        if (!hasLastRun || !details.last_episode_to_air) {
          continue;
        }

        const releasedEpisode = details.last_episode_to_air;
        if (!this.hasEpisodeAired(releasedEpisode)) {
          continue;
        }

        const episodeReleaseTime =
          this.getEpisodeReleaseTimestamp(releasedEpisode);
        if (episodeReleaseTime <= lastRun || episodeReleaseTime > now) {
          continue;
        }

        const notifiedKey = this.getEpisodeNotificationKey(
          details.id,
          releasedEpisode,
        );
        if (notifiedMap[notifiedKey]) {
          continue;
        }

        await this.sendEpisodeLiveNotification(details, releasedEpisode);
        notifiedMap[notifiedKey] = now;
      }

      await this.saveNotifiedReleaseEpisodesMap(notifiedMap);
      await AsyncStorage.setItem(RELEASE_CHECK_LAST_RUN_KEY, now.toString());
    } catch (error) {
      reportError(
        "NotificationService.syncWatchlistReleaseNotifications",
        error,
        {
          fallbackMessage: "Failed to sync watchlist release notifications.",
        },
      );
    }
  }

  public async cancelShowNotifications(showId: number): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const scheduledNotifications = await this.getScheduledNotifications();
      const showNotifications = scheduledNotifications.filter(
        (n) => n.showId === showId,
      );

      for (const notification of showNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.id);
        console.log(`Canceled notification: ${notification.id}`);
      }

      const updatedNotifications = scheduledNotifications.filter(
        (n) => n.showId !== showId,
      );
      await this.saveScheduledNotifications(updatedNotifications);
    } catch (error) {
      throw reportError("NotificationService.cancelShowNotifications", error, {
        fallbackMessage: "Failed to cancel show notifications.",
      });
    }
  }

  public async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await AsyncStorage.removeItem(NOTIFICATION_SCHEDULE_KEY);
      console.log("All notifications canceled");
    } catch (error) {
      throw reportError("NotificationService.cancelAllNotifications", error, {
        fallbackMessage: "Failed to cancel notifications.",
      });
    }
  }

  private getEpisodeNotificationKey(showId: number, episode: Episode): string {
    return `${showId}-S${episode.season_number}-E${episode.episode_number}`;
  }

  private getEpisodeReleaseTimestamp(episode: Episode): number {
    if (!episode.air_date) {
      return Number.MAX_SAFE_INTEGER;
    }

    return new Date(`${episode.air_date}T00:00:00`).getTime();
  }

  private hasEpisodeAired(episode: Episode): boolean {
    const releaseTime = this.getEpisodeReleaseTimestamp(episode);
    return releaseTime <= Date.now();
  }

  private async sendEpisodeLiveNotification(
    show: TVShow,
    episode: Episode,
  ): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${show.name}: New episode is live`,
        body: `${episode.name} (S${episode.season_number}E${episode.episode_number}) is live. Go watch it!`,
        data: {
          showId: show.id,
          episodeId: episode.id,
          seasonNumber: episode.season_number,
          episodeNumber: episode.episode_number,
        },
      },
      trigger: null,
    });
  }

  private async getNotifiedReleaseEpisodesMap(): Promise<
    Record<string, number>
  > {
    try {
      const jsonValue = await AsyncStorage.getItem(
        NOTIFIED_RELEASE_EPISODES_KEY,
      );
      return jsonValue ? JSON.parse(jsonValue) : {};
    } catch (error) {
      reportError("NotificationService.getNotifiedReleaseEpisodesMap", error, {
        fallbackMessage: "Failed to load notification history.",
      });
      return {};
    }
  }

  private async saveNotifiedReleaseEpisodesMap(
    map: Record<string, number>,
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(
        NOTIFIED_RELEASE_EPISODES_KEY,
        JSON.stringify(map),
      );
    } catch (error) {
      reportError("NotificationService.saveNotifiedReleaseEpisodesMap", error, {
        fallbackMessage: "Failed to save notification history.",
      });
    }
  }

  // Get all scheduled notifications
  private async getScheduledNotifications(): Promise<ScheduledNotification[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(NOTIFICATION_SCHEDULE_KEY);
      return jsonValue ? JSON.parse(jsonValue) : [];
    } catch (error) {
      reportError("NotificationService.getScheduledNotifications", error, {
        fallbackMessage: "Failed to load scheduled notifications.",
      });
      return [];
    }
  }

  // Save a scheduled notification
  private async saveScheduledNotification(
    notification: ScheduledNotification,
  ): Promise<void> {
    try {
      const notifications = await this.getScheduledNotifications();
      const updatedNotifications = [
        ...notifications.filter((n) => n.id !== notification.id),
        notification,
      ];
      await this.saveScheduledNotifications(updatedNotifications);
    } catch (error) {
      throw reportError("NotificationService.saveScheduledNotification", error, {
        fallbackMessage: "Failed to save scheduled notification.",
      });
    }
  }

  // Save all scheduled notifications
  private async saveScheduledNotifications(
    notifications: ScheduledNotification[],
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(
        NOTIFICATION_SCHEDULE_KEY,
        JSON.stringify(notifications),
      );
    } catch (error) {
      throw reportError("NotificationService.saveScheduledNotifications", error, {
        fallbackMessage: "Failed to save notification schedule.",
      });
    }
  }
}

export default NotificationService.getInstance();
