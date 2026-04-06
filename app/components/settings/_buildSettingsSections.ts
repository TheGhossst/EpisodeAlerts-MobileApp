import type { ThemeType } from '@/app/services/UserPreferencesService';
import type { SettingSection } from './_types';

interface BuildSettingsSectionsParams {
  themeMode: ThemeType;
  notificationsEnabled: boolean;
  analyticsEnabled: boolean;
  imageCacheEnabled: boolean;
  cacheSizeText: string;
  cloudSyncAvailable: boolean;
  cloudSyncSignedIn: boolean;
  cloudSyncUserEmail: string | null;
  cloudSyncStatusText: string;
  isCloudSyncBusy: boolean;
  onThemeChange: (value: ThemeType) => void;
  onNotificationsChange: (value: boolean) => void;
  onImageCacheChange: (value: boolean) => void;
  onAnalyticsChange: (value: boolean) => void;
  onClearImageCache: () => void;
  onResetPreferences: () => void;
  onViewAnalyticsPress: () => void;
  onSignInPress: () => void;
  onSignUpPress: () => void;
  onSignOutPress: () => void;
  onSyncUploadPress: () => void;
  onSyncDownloadPress: () => void;
}

export const buildSettingsSections = ({
  themeMode,
  notificationsEnabled,
  analyticsEnabled,
  imageCacheEnabled,
  cacheSizeText,
  cloudSyncAvailable,
  cloudSyncSignedIn,
  cloudSyncUserEmail,
  cloudSyncStatusText,
  isCloudSyncBusy,
  onThemeChange,
  onNotificationsChange,
  onImageCacheChange,
  onAnalyticsChange,
  onClearImageCache,
  onResetPreferences,
  onViewAnalyticsPress,
  onSignInPress,
  onSignUpPress,
  onSignOutPress,
  onSyncUploadPress,
  onSyncDownloadPress,
}: BuildSettingsSectionsParams): SettingSection[] => {
  return [
    {
      title: 'Appearance',
      data: [
        {
          id: 'theme',
          title: 'Theme',
          description: 'Choose between light, dark, or system theme',
          type: 'select',
          value: themeMode,
          options: [
            { label: 'Dark', value: 'dark' },
            { label: 'Light', value: 'light' },
            { label: 'System', value: 'system' },
          ],
          onValueChange: (value) => onThemeChange(value as ThemeType),
        },
      ],
    },
    {
      title: 'Notifications',
      data: [
        {
          id: 'notifications',
          title: 'Push Notifications',
          description: 'Receive notifications for upcoming episodes',
          type: 'toggle',
          value: notificationsEnabled,
          onValueChange: (value) => onNotificationsChange(value as boolean),
        },
      ],
    },
    {
      title: 'Storage',
      data: [
        {
          id: 'imageCache',
          title: 'Image Caching',
          description: 'Cache images for faster loading and offline viewing',
          type: 'toggle',
          value: imageCacheEnabled,
          onValueChange: (value) => onImageCacheChange(value as boolean),
        },
        {
          id: 'cacheSize',
          title: 'Cache Size',
          description: cacheSizeText,
          type: 'button',
          onPress: onClearImageCache,
        },
      ],
    },
    {
      title: 'Privacy',
      data: [
        {
          id: 'analytics',
          title: 'Usage Analytics',
          description: 'Store app usage data locally on this device only',
          type: 'toggle',
          value: analyticsEnabled,
          onValueChange: (value) => onAnalyticsChange(value as boolean),
        },
        {
          id: 'analyticsInsights',
          title: 'Analytics Insights',
          description: 'View your local activity graph',
          type: 'button',
          buttonLabel: 'View',
          onPress: onViewAnalyticsPress,
        },
      ],
    },
    {
      title: 'Cloud Sync',
      data: cloudSyncAvailable
        ? [
            {
              id: 'syncAccount',
              title: 'Account',
              description: cloudSyncSignedIn
                ? `Signed in as ${cloudSyncUserEmail || 'user'}`
                : 'Sign in to sync watchlist and progress across devices',
              type: 'button',
              buttonLabel: cloudSyncSignedIn ? 'Signed In' : 'Sign In',
              onPress: cloudSyncSignedIn ? undefined : onSignInPress,
              disabled: cloudSyncSignedIn,
            },
            {
              id: 'syncCreateAccount',
              title: 'Create Account',
              description: 'Create a cloud account for multi-device sync',
              type: 'button',
              buttonLabel: 'Sign Up',
              onPress: onSignUpPress,
              disabled: cloudSyncSignedIn,
            },
            {
              id: 'syncStatus',
              title: 'Last Sync',
              description: cloudSyncStatusText,
              type: 'button',
              buttonLabel: 'Upload',
              onPress: onSyncUploadPress,
              buttonIntent: 'primary',
              disabled: !cloudSyncSignedIn || isCloudSyncBusy,
            },
            {
              id: 'syncDownload',
              title: 'Restore From Cloud',
              description: 'Download your watchlist, progress, and preferences',
              type: 'button',
              buttonLabel: 'Download',
              onPress: onSyncDownloadPress,
              disabled: !cloudSyncSignedIn || isCloudSyncBusy,
            },
            {
              id: 'syncSignOut',
              title: 'Sign Out',
              description: 'Stop syncing on this device',
              type: 'button',
              buttonLabel: 'Sign Out',
              onPress: onSignOutPress,
              buttonIntent: 'danger',
              disabled: !cloudSyncSignedIn || isCloudSyncBusy,
            },
          ]
        : [
            {
              id: 'syncUnavailable',
              title: 'Cloud Sync Unavailable',
              description: 'Configure Firebase environment variables to enable sign-in and sync.',
              type: 'button',
              buttonLabel: 'Unavailable',
              disabled: true,
            },
          ],
    },
    {
      title: 'About',
      data: [
        {
          id: 'version',
          title: 'Version',
          description: '1.0.0',
          type: 'button',
        },
        {
          id: 'reset',
          title: 'Reset Preferences',
          description: 'Reset all preferences to default values',
          type: 'button',
          onPress: onResetPreferences,
        },
      ],
    },
  ];
};

// Expo Router scans files under app/ as routes; this keeps helper files warning-free.
export default function SettingsBuildSectionsRouteShim(): null {
  return null;
}