import type { ThemeType } from '@/app/services/UserPreferencesService';
import type { SettingSection } from './_types';

interface BuildSettingsSectionsParams {
  themeMode: ThemeType;
  notificationsEnabled: boolean;
  analyticsEnabled: boolean;
  imageCacheEnabled: boolean;
  cacheSizeText: string;
  onThemeChange: (value: ThemeType) => void;
  onNotificationsChange: (value: boolean) => void;
  onImageCacheChange: (value: boolean) => void;
  onAnalyticsChange: (value: boolean) => void;
  onClearImageCache: () => void;
  onResetPreferences: () => void;
}

export const buildSettingsSections = ({
  themeMode,
  notificationsEnabled,
  analyticsEnabled,
  imageCacheEnabled,
  cacheSizeText,
  onThemeChange,
  onNotificationsChange,
  onImageCacheChange,
  onAnalyticsChange,
  onClearImageCache,
  onResetPreferences,
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
          description: 'Help improve the app by sharing anonymous usage data',
          type: 'toggle',
          value: analyticsEnabled,
          onValueChange: (value) => onAnalyticsChange(value as boolean),
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