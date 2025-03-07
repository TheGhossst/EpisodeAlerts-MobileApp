import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  ActivityIndicator,
  SectionList,
} from 'react-native';
import { Stack } from 'expo-router';
import UserPreferencesService, { ThemeType } from '@/app/services/UserPreferencesService';
import AnalyticsService, { EventType } from '@/app/services/AnalyticsService';
import ImageCacheService from '@/app/services/ImageCacheService';
import NotificationService from '@/app/services/NotificationService';
import { useTheme } from '@/app/context/ThemeContext';

interface SettingOption {
  id: string;
  title: string;
  description: string;
  type: 'toggle' | 'select' | 'button';
  value?: boolean | string;
  options?: { label: string; value: string }[];
  onPress?: () => void;
  onValueChange?: (value: boolean | string) => void;
}

interface SettingSection {
  title: string;
  data: SettingOption[];
}

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
      
      // Load image cache settings
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
      
      await AnalyticsService.trackEvent(
        EventType.CHANGE_SETTINGS, 
        { setting: 'notifications', value }
      );
      
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
        await AnalyticsService.trackEvent(
          EventType.CHANGE_SETTINGS, 
          { setting: 'analytics', value }
        );
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
      
      await AnalyticsService.trackEvent(
        EventType.CHANGE_SETTINGS, 
        { setting: 'imageCache', value }
      );
      
      if (!value) {
        // Clear image cache if disabled
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
      
      await AnalyticsService.trackEvent(
        EventType.CHANGE_THEME, 
        { theme: themeMode }
      );
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
      
      // Track event
      await AnalyticsService.trackEvent(
        EventType.CHANGE_SETTINGS, 
        { action: 'clearCache' }
      );
      
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
              
              // Track event before reset
              await AnalyticsService.trackEvent(
                EventType.CHANGE_SETTINGS, 
                { action: 'resetPreferences' }
              );
              
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

  const settingsSections: SettingSection[] = [
    {
      title: 'Appearance',
      data: [
        {
          id: 'theme',
          title: 'Theme',
          description: 'Choose between light, dark, or system theme',
          type: 'select',
          value: UserPreferencesService.getTheme(),
          options: [
            { label: 'Dark', value: 'dark' },
            { label: 'Light', value: 'light' },
            { label: 'System', value: 'system' },
          ],
          onValueChange: (value) => handleThemeChange(value as ThemeType),
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
          onValueChange: (value) => handleNotificationToggle(value as boolean),
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
          onValueChange: (value) => handleImageCacheToggle(value as boolean),
        },
        {
          id: 'cacheSize',
          title: 'Cache Size',
          description: cacheSizeText,
          type: 'button',
          onPress: clearImageCache,
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
          onValueChange: (value) => handleAnalyticsToggle(value as boolean),
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
          onPress: resetPreferences,
        },
      ],
    },
  ];

  const renderItem = ({ item }: { item: SettingOption }) => {
    return (
      <View style={[styles.settingContainer, { backgroundColor: theme.colors.card }]}>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, { color: theme.colors.text }]}>{item.title}</Text>
          <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
            {item.description}
          </Text>
        </View>
        
        {item.type === 'toggle' && (
          <Switch
            value={item.value as boolean}
            onValueChange={(value) => item.onValueChange?.(value)}
            trackColor={{ false: '#767577', true: theme.colors.primary }}
            thumbColor="#f4f3f4"
          />
        )}
        
        {item.type === 'button' && item.onPress && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.secondary }]}
            onPress={item.onPress}
            disabled={item.id === 'cacheSize' && !imageCacheEnabled}
          >
            <Text style={[
              styles.buttonText, 
              { color: theme.colors.text },
              item.id === 'cacheSize' && !imageCacheEnabled && styles.buttonTextDisabled
            ]}>
              {item.id === 'cacheSize' ? 'Clear' : 'Select'}
            </Text>
          </TouchableOpacity>
        )}
        
        {item.type === 'select' && (
          <View style={styles.selectContainer}>
            {item.options?.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.selectOption,
                  { 
                    backgroundColor: 
                      item.value === option.value 
                        ? theme.colors.primary 
                        : theme.colors.secondary
                  }
                ]}
                onPress={() => item.onValueChange?.(option.value)}
              >
                <Text style={[
                  styles.selectOptionText,
                  { color: item.value === option.value ? '#ffffff' : theme.colors.text }
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderSectionHeader = ({ section }: { section: SettingSection }) => (
    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
      {section.title}
    </Text>
  );

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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  settingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonTextDisabled: {
    opacity: 0.5,
  },
  selectContainer: {
    flexDirection: 'column',
  },
  selectOption: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginBottom: 6,
    alignItems: 'center',
  },
  selectOptionText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 