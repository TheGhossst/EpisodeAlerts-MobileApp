import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Alert,
  ActivityIndicator,
  SectionList,
} from 'react-native';
import { Stack } from 'expo-router';
import UserPreferencesService, { ThemeType } from '@/app/services/UserPreferencesService';
import AnalyticsService, { EventType } from '@/app/services/AnalyticsService';
import ImageCacheService from '@/app/services/ImageCacheService';
import { useTheme } from '@/app/context/ThemeContext';
import type { SettingOption, SettingSection } from '@/app/components/settings/_types';
import SettingsOptionItem from '@/app/components/settings/SettingsOptionItem';
import SettingsSectionHeader from '@/app/components/settings/SettingsSectionHeader';
import { buildSettingsSections } from '@/app/components/settings/_buildSettingsSections';

export default function SettingsScreen() {
  const { theme, setTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [imageCacheEnabled, setImageCacheEnabled] = useState(true);
  const [cacheSizeText, setCacheSizeText] = useState('Calculating...');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);

      await UserPreferencesService.initialize();
      await AnalyticsService.initialize();

      const userPrefs = UserPreferencesService.getPreferences();
      setNotificationsEnabled(userPrefs.notificationsEnabled);
      setAnalyticsEnabled(userPrefs.analyticsEnabled);

      setImageCacheEnabled(ImageCacheService.isImageCacheEnabled());
      await calculateCacheSize();

      await AnalyticsService.trackScreenView('settings');
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSettings();
    setRefreshing(false);
  };

  const handleNotificationToggle = async (value: boolean) => {
    try {
      await UserPreferencesService.setNotificationsEnabled(value);
      setNotificationsEnabled(value);

      await AnalyticsService.trackEvent(EventType.CHANGE_SETTINGS, {
        setting: 'notifications',
        value,
      });

      if (value) {
        Alert.alert(
          'Notifications Enabled',
          'You will now receive notifications about upcoming episodes for shows in your watchlist.'
        );
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      Alert.alert('Error', 'Failed to update notification settings');
      setNotificationsEnabled(UserPreferencesService.isNotificationsEnabled());
    }
  };

  const handleAnalyticsToggle = async (value: boolean) => {
    try {
      await UserPreferencesService.setAnalyticsEnabled(value);
      setAnalyticsEnabled(value);

      if (!value) {
        await AnalyticsService.trackEvent(EventType.CHANGE_SETTINGS, {
          setting: 'analytics',
          value,
        });
      }
    } catch (error) {
      console.error('Error toggling analytics:', error);
      Alert.alert('Error', 'Failed to update analytics settings');
      setAnalyticsEnabled(UserPreferencesService.isAnalyticsEnabled());
    }
  };

  const handleImageCacheToggle = async (value: boolean) => {
    try {
      await ImageCacheService.setEnabled(value);
      setImageCacheEnabled(value);

      await AnalyticsService.trackEvent(EventType.CHANGE_SETTINGS, {
        setting: 'imageCache',
        value,
      });

      if (!value) {
        await clearImageCache();
      }
    } catch (error) {
      console.error('Error toggling image cache:', error);
      Alert.alert('Error', 'Failed to update image cache settings');
    }
  };

  const handleThemeChange = async (themeMode: ThemeType) => {
    try {
      await setTheme(themeMode);

      await AnalyticsService.trackEvent(EventType.CHANGE_THEME, { theme: themeMode });
    } catch (error) {
      console.error('Error changing theme:', error);
      Alert.alert('Error', 'Failed to update theme settings');
    }
  };

  const calculateCacheSize = async () => {
    try {
      await ImageCacheService.calculateCacheSize();
      const sizeMB = ImageCacheService.getCacheSizeInMB();
      setCacheSizeText(`${sizeMB} MB`);
    } catch (error) {
      console.error('Error calculating cache size:', error);
      setCacheSizeText('Unknown');
    }
  };

  const clearImageCache = async () => {
    try {
      setIsLoading(true);
      await ImageCacheService.clearCache();
      setCacheSizeText('0 MB');

      await AnalyticsService.trackEvent(EventType.CHANGE_SETTINGS, { action: 'clearCache' });

      Alert.alert('Success', 'Image cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
      Alert.alert('Error', 'Failed to clear image cache');
    } finally {
      setIsLoading(false);
    }
  };

  const resetPreferences = async () => {
    Alert.alert(
      'Reset Preferences',
      'Are you sure you want to reset all preferences to default?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);

              await AnalyticsService.trackEvent(EventType.CHANGE_SETTINGS, {
                action: 'resetPreferences',
              });

              await UserPreferencesService.resetPreferences();
              await loadSettings();

              Alert.alert('Success', 'Preferences reset to defaults');
            } catch (error) {
              console.error('Error resetting preferences:', error);
              Alert.alert('Error', 'Failed to reset preferences');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const settingsSections: SettingSection[] = buildSettingsSections({
    themeMode: theme.mode,
    notificationsEnabled,
    analyticsEnabled,
    imageCacheEnabled,
    cacheSizeText,
    onThemeChange: handleThemeChange,
    onNotificationsChange: handleNotificationToggle,
    onImageCacheChange: handleImageCacheToggle,
    onAnalyticsChange: handleAnalyticsToggle,
    onClearImageCache: clearImageCache,
    onResetPreferences: resetPreferences,
  });

  const renderItem = ({ item }: { item: SettingOption }) => {
    return <SettingsOptionItem item={item} theme={theme} imageCacheEnabled={imageCacheEnabled} />;
  };

  const renderSectionHeader = ({ section }: { section: SettingSection }) => {
    return <SettingsSectionHeader title={section.title} theme={theme} />;
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}> 
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerStyle: {
            backgroundColor: theme.colors.card,
          },
          headerTintColor: theme.colors.text,
        }}
      />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
        <SectionList
          sections={settingsSections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});