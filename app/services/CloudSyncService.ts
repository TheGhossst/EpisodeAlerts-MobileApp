import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import {
  doc,
  type FirestoreError,
  getDoc,
  getFirestore,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import { FIREBASE_CONFIG, isFirebaseConfigured } from "@/constants/Config";
import WatchlistService from "./WatchlistService";
import UserPreferencesService from "./UserPreferencesService";
import { reportError } from "@/app/utils/errorHandling";

const LAST_SYNC_TIME_KEY = "@EpisodeAlerts:lastCloudSyncAt";
const AUTO_SYNC_INTERVAL_MS = 3 * 60 * 1000;

interface CloudSyncPreferences {
  theme: "dark" | "light" | "system";
  notificationsEnabled: boolean;
  analyticsEnabled: boolean;
}

interface CloudSyncPayload {
  updatedAt: number;
  watchlist: Awaited<
    ReturnType<typeof WatchlistService.getWatchlistSnapshot>
  >["watchlist"];
  progressMap: Awaited<
    ReturnType<typeof WatchlistService.getWatchlistSnapshot>
  >["progressMap"];
  historyMap: Awaited<
    ReturnType<typeof WatchlistService.getWatchlistSnapshot>
  >["historyMap"];
  preferences: CloudSyncPreferences;
}

class CloudSyncService {
  private static instance: CloudSyncService;
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private firestore: Firestore | null = null;
  private initialized = false;
  private autoSyncTimer: ReturnType<typeof setInterval> | null = null;
  private isSyncInProgress = false;
  private isBootstrapInProgress = false;

  private constructor() {}

  public static getInstance(): CloudSyncService {
    if (!CloudSyncService.instance) {
      CloudSyncService.instance = new CloudSyncService();
    }

    return CloudSyncService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (!isFirebaseConfigured) {
      this.initialized = true;
      return;
    }

    try {
      this.app =
        getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);

      this.auth = getAuth(this.app);

      this.firestore = getFirestore(this.app);
      this.initialized = true;
    } catch (error) {
      throw reportError("CloudSyncService.initialize", error, {
        fallbackMessage: "Failed to initialize cloud sync.",
      });
    }
  }

  public isAvailable(): boolean {
    return isFirebaseConfigured;
  }

  public async getCurrentUser(): Promise<User | null> {
    await this.initialize();
    return this.auth?.currentUser ?? null;
  }

  public async getCurrentUserEmail(): Promise<string | null> {
    const user = await this.getCurrentUser();
    return user?.email ?? null;
  }

  public async isSignedIn(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !!user;
  }

  public async signIn(email: string, password: string): Promise<void> {
    await this.initialize();
    if (!this.auth) {
      throw new Error("Cloud sync is not configured.");
    }

    try {
      await signInWithEmailAndPassword(this.auth, email.trim(), password);
    } catch (error) {
      throw reportError("CloudSyncService.signIn", error, {
        fallbackMessage: "Could not sign in. Please try again.",
      });
    }

    // Run cloud bootstrap in background so auth UI is not blocked by network conditions.
    this.runBootstrapAfterAuth("sign-in");
  }

  public async signUp(email: string, password: string): Promise<void> {
    await this.initialize();
    if (!this.auth) {
      throw new Error("Cloud sync is not configured.");
    }

    try {
      await createUserWithEmailAndPassword(this.auth, email.trim(), password);
    } catch (error) {
      throw reportError("CloudSyncService.signUp", error, {
        fallbackMessage: "Could not create your account. Please try again.",
      });
    }

    // Run cloud bootstrap in background so auth UI is not blocked by network conditions.
    this.runBootstrapAfterAuth("sign-up");
  }

  public async signOut(): Promise<void> {
    await this.initialize();
    if (!this.auth) {
      return;
    }

    await signOut(this.auth);
  }

  public async onAuthStateChange(
    callback: (user: User | null) => void,
  ): Promise<() => void> {
    await this.initialize();

    if (!this.auth) {
      callback(null);
      return () => {};
    }

    return onAuthStateChanged(this.auth, callback);
  }

  private getUserDocPath(uid: string): ReturnType<typeof doc> {
    if (!this.firestore) {
      throw new Error("Cloud sync is not initialized.");
    }

    return doc(this.firestore, "episodeAlertsUsers", uid);
  }

  private isFirestoreError(error: unknown): error is FirestoreError {
    return (
      !!error &&
      typeof error === "object" &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
    );
  }

  private isOfflineFirestoreError(error: unknown): boolean {
    if (!this.isFirestoreError(error)) {
      return false;
    }

    return error.code === "unavailable" || error.code === "failed-precondition";
  }

  private isPermissionFirestoreError(error: unknown): boolean {
    return this.isFirestoreError(error) && error.code === "permission-denied";
  }

  private runBootstrapAfterAuth(source: "sign-in" | "sign-up"): void {
    void this.bootstrapSignedInData()
      .then((result) => {
        if (result === "skipped") {
          console.warn(
            `Cloud bootstrap skipped after ${source}. Sync will retry automatically later.`,
          );
        }
      })
      .catch((error) => {
        reportError(`CloudSyncService.bootstrapAfterAuth.${source}`, error, {
          fallbackMessage: "Cloud bootstrap failed after authentication.",
        });
      })
      .finally(() => {
        this.startAutoSync();
      });
  }

  private async buildPayload(): Promise<CloudSyncPayload> {
    await UserPreferencesService.initialize();

    const snapshot = await WatchlistService.getWatchlistSnapshot();
    const prefs = UserPreferencesService.getPreferences();

    return {
      updatedAt: Date.now(),
      watchlist: snapshot.watchlist,
      progressMap: snapshot.progressMap,
      historyMap: snapshot.historyMap,
      preferences: {
        theme: prefs.theme,
        notificationsEnabled: prefs.notificationsEnabled,
        analyticsEnabled: prefs.analyticsEnabled,
      },
    };
  }

  private async performSyncToCloud(user: User): Promise<void> {
    const payload = await this.buildPayload();
    await setDoc(this.getUserDocPath(user.uid), payload, { merge: true });
    await AsyncStorage.setItem(LAST_SYNC_TIME_KEY, String(payload.updatedAt));
  }

  public async syncToCloud(): Promise<void> {
    await this.initialize();

    const user = await this.getCurrentUser();
    if (!user || !this.firestore) {
      throw new Error("Sign in to sync your data.");
    }

    await this.performSyncToCloud(user);
  }

  public async syncToCloudIfSignedIn(): Promise<boolean> {
    await this.initialize();
    if (
      !this.firestore ||
      this.isSyncInProgress ||
      this.isBootstrapInProgress
    ) {
      return false;
    }

    const user = await this.getCurrentUser();
    if (!user) {
      return false;
    }

    this.isSyncInProgress = true;
    try {
      await this.performSyncToCloud(user);
      return true;
    } catch (error) {
      reportError("CloudSyncService.syncToCloudIfSignedIn", error, {
        fallbackMessage: "Automatic cloud sync failed.",
      });
      return false;
    } finally {
      this.isSyncInProgress = false;
    }
  }

  public async bootstrapSignedInData(): Promise<
    "downloaded" | "uploaded" | "skipped"
  > {
    await this.initialize();

    const user = await this.getCurrentUser();
    if (!user || !this.firestore) {
      return "skipped";
    }

    this.isBootstrapInProgress = true;
    try {
      let restored = false;
      try {
        restored = await this.syncFromCloud();
      } catch (error) {
        if (this.isOfflineFirestoreError(error)) {
          console.warn(
            "Cloud bootstrap download skipped because the device is offline.",
          );
          return "skipped";
        }

        if (this.isPermissionFirestoreError(error)) {
          console.warn(
            "Cloud bootstrap download blocked by Firestore permissions.",
          );
          return "skipped";
        }

        reportError("CloudSyncService.bootstrapSignedInData.download", error, {
          fallbackMessage: "Failed to restore cloud data during bootstrap.",
        });
      }

      if (restored) {
        return "downloaded";
      }

      try {
        await this.performSyncToCloud(user);
        return "uploaded";
      } catch (error) {
        if (this.isOfflineFirestoreError(error)) {
          console.warn(
            "Cloud bootstrap upload skipped because the device is offline.",
          );
          return "skipped";
        }

        if (this.isPermissionFirestoreError(error)) {
          console.warn(
            "Cloud bootstrap upload blocked by Firestore permissions.",
          );
          return "skipped";
        }

        reportError("CloudSyncService.bootstrapSignedInData.upload", error, {
          fallbackMessage: "Failed to upload cloud data during bootstrap.",
        });
        return "skipped";
      }
    } finally {
      this.isBootstrapInProgress = false;
    }
  }

  public startAutoSync(intervalMs: number = AUTO_SYNC_INTERVAL_MS): void {
    if (!isFirebaseConfigured) {
      return;
    }

    if (this.autoSyncTimer) {
      return;
    }

    this.autoSyncTimer = setInterval(() => {
      void this.syncToCloudIfSignedIn();
    }, intervalMs);

    void this.syncToCloudIfSignedIn();
  }

  public stopAutoSync(): void {
    if (!this.autoSyncTimer) {
      return;
    }

    clearInterval(this.autoSyncTimer);
    this.autoSyncTimer = null;
  }

  public async syncFromCloud(): Promise<boolean> {
    await this.initialize();

    const user = await this.getCurrentUser();
    if (!user || !this.firestore) {
      throw new Error("Sign in to sync your data.");
    }

    const snapshot = await getDoc(this.getUserDocPath(user.uid));
    if (!snapshot.exists()) {
      return false;
    }

    const data = snapshot.data() as Partial<CloudSyncPayload>;
    if (
      !data.watchlist ||
      !data.progressMap ||
      !data.historyMap ||
      !data.preferences
    ) {
      return false;
    }

    const restored = await WatchlistService.restoreWatchlistSnapshot(
      {
        watchlist: data.watchlist,
        progressMap: data.progressMap,
        historyMap: data.historyMap,
      },
      { skipCloudSync: true },
    );

    if (!restored) {
      throw new Error("Failed to restore synced watchlist data.");
    }

    await UserPreferencesService.applySyncedPreferences(data.preferences, {
      skipCloudSync: true,
    });

    if (typeof data.updatedAt === "number") {
      await AsyncStorage.setItem(LAST_SYNC_TIME_KEY, String(data.updatedAt));
    }

    return true;
  }

  public async getLastSyncTime(): Promise<number | null> {
    const raw = await AsyncStorage.getItem(LAST_SYNC_TIME_KEY);
    if (!raw) {
      return null;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
}

export default CloudSyncService.getInstance();
