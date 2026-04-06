import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Alert,
  ActivityIndicator,
  SectionList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, Stack } from 'expo-router';
import UserPreferencesService, { ThemeType } from '@/app/services/UserPreferencesService';
import AnalyticsService, { EventType } from '@/app/services/AnalyticsService';
import ImageCacheService from '@/app/services/ImageCacheService';
import CloudSyncService from '@/app/services/CloudSyncService';
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
  const [cloudSyncAvailable, setCloudSyncAvailable] = useState(false);
  const [cloudSyncSignedIn, setCloudSyncSignedIn] = useState(false);
  const [cloudSyncUserEmail, setCloudSyncUserEmail] = useState<string | null>(null);
  const [cloudSyncStatusText, setCloudSyncStatusText] = useState('Never synced');
  const [isCloudSyncBusy, setIsCloudSyncBusy] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

  useEffect(() => {
    let unsubscribeAuth = () => {};

    const initialize = async () => {
      await loadSettings();
      unsubscribeAuth = await CloudSyncService.onAuthStateChange((user) => {
        setCloudSyncSignedIn(!!user);
        setCloudSyncUserEmail(user?.email || null);
        void refreshCloudSyncStatus();
      });
    };

    void initialize();

    return () => {
      unsubscribeAuth();
    };
  }, []);

  const refreshCloudSyncStatus = async () => {
    await CloudSyncService.initialize();

    const available = CloudSyncService.isAvailable();
    setCloudSyncAvailable(available);

    if (!available) {
      setCloudSyncSignedIn(false);
      setCloudSyncUserEmail(null);
      setCloudSyncStatusText('Cloud sync is disabled in this build');
      return;
    }

    const [signedIn, email, lastSyncAt] = await Promise.all([
      CloudSyncService.isSignedIn(),
      CloudSyncService.getCurrentUserEmail(),
      CloudSyncService.getLastSyncTime(),
    ]);

    setCloudSyncSignedIn(signedIn);
    setCloudSyncUserEmail(email);
    setCloudSyncStatusText(
      lastSyncAt ? `Last synced ${new Date(lastSyncAt).toLocaleString()}` : 'Not synced yet',
    );
  };

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
      await refreshCloudSyncStatus();

      await AnalyticsService.trackScreenView('settings');
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openAuthModal = (mode: 'signIn' | 'signUp') => {
    setAuthMode(mode);
    setAuthEmail('');
    setAuthPassword('');
    setAuthModalVisible(true);
  };

  const closeAuthModal = () => {
    if (isAuthSubmitting) {
      return;
    }

    setAuthModalVisible(false);
  };

  const handleAuthSubmit = async () => {
    const email = authEmail.trim();
    const password = authPassword;

    if (!email || !password) {
      Alert.alert('Missing details', 'Enter both email and password.');
      return;
    }

    setIsAuthSubmitting(true);
    try {
      if (authMode === 'signIn') {
        await CloudSyncService.signIn(email, password);
      } else {
        await CloudSyncService.signUp(email, password);
      }

      await refreshCloudSyncStatus();
      setAuthModalVisible(false);

      Alert.alert('Success', authMode === 'signIn' ? 'Signed in successfully.' : 'Account created successfully.');
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert('Authentication Failed', 'Check your credentials and try again.');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleSyncUpload = async () => {
    setIsCloudSyncBusy(true);
    try {
      await CloudSyncService.syncToCloud();
      await refreshCloudSyncStatus();
      Alert.alert('Synced', 'Local data uploaded to cloud successfully.');
    } catch (error) {
      console.error('Cloud upload error:', error);
      Alert.alert('Upload Failed', 'Please sign in and try again.');
    } finally {
      setIsCloudSyncBusy(false);
    }
  };

  const handleSyncDownload = async () => {
    setIsCloudSyncBusy(true);
    try {
      const restored = await CloudSyncService.syncFromCloud();
      await refreshCloudSyncStatus();
      await loadSettings();

      Alert.alert(
        restored ? 'Restored' : 'No Cloud Data',
        restored
          ? 'Cloud data downloaded and applied to this device.'
          : 'No synced data was found for this account.',
      );
    } catch (error) {
      console.error('Cloud download error:', error);
      Alert.alert('Download Failed', 'Please sign in and try again.');
    } finally {
      setIsCloudSyncBusy(false);
    }
  };

  const handleSignOut = async () => {
    setIsCloudSyncBusy(true);
    try {
      await CloudSyncService.signOut();
      await refreshCloudSyncStatus();
      Alert.alert('Signed Out', 'Cloud sync has been disabled for this device.');
    } catch (error) {
      console.error('Cloud sign-out error:', error);
      Alert.alert('Sign Out Failed', 'Please try again.');
    } finally {
      setIsCloudSyncBusy(false);
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

  const handleViewAnalyticsPress = () => {
    router.push('/analytics-insights');
  };

  const settingsSections: SettingSection[] = buildSettingsSections({
    themeMode: theme.mode,
    notificationsEnabled,
    analyticsEnabled,
    imageCacheEnabled,
    cacheSizeText,
    cloudSyncAvailable,
    cloudSyncSignedIn,
    cloudSyncUserEmail,
    cloudSyncStatusText,
    isCloudSyncBusy,
    onThemeChange: handleThemeChange,
    onNotificationsChange: handleNotificationToggle,
    onImageCacheChange: handleImageCacheToggle,
    onAnalyticsChange: handleAnalyticsToggle,
    onClearImageCache: clearImageCache,
    onResetPreferences: resetPreferences,
    onViewAnalyticsPress: handleViewAnalyticsPress,
    onSignInPress: () => openAuthModal('signIn'),
    onSignUpPress: () => openAuthModal('signUp'),
    onSignOutPress: handleSignOut,
    onSyncUploadPress: handleSyncUpload,
    onSyncDownloadPress: handleSyncDownload,
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

      <Modal
        animationType="slide"
        visible={authModalVisible}
        transparent
        onRequestClose={closeAuthModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.authModalOverlay}
        >
          <View style={[styles.authModalCard, { backgroundColor: theme.colors.card }]}> 
            <Text style={[styles.authTitle, { color: theme.colors.text }]}>
              {authMode === 'signIn' ? 'Sign In' : 'Create Account'}
            </Text>
            <Text style={[styles.authSubtitle, { color: theme.colors.textSecondary }]}>
              {authMode === 'signIn'
                ? 'Use your cloud account to sync across devices.'
                : 'Create a cloud account for watchlist sync.'}
            </Text>

            <TextInput
              value={authEmail}
              onChangeText={setAuthEmail}
              placeholder="Email"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[
                styles.authInput,
                {
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.background,
                },
              ]}
            />
            <TextInput
              value={authPassword}
              onChangeText={setAuthPassword}
              placeholder="Password"
              placeholderTextColor={theme.colors.textSecondary}
              secureTextEntry
              style={[
                styles.authInput,
                {
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.background,
                },
              ]}
            />

            <View style={styles.authActionsRow}>
              <TouchableOpacity
                style={[styles.authActionButton, { backgroundColor: theme.colors.secondary }]}
                onPress={closeAuthModal}
                disabled={isAuthSubmitting}
              >
                <Text style={[styles.authActionText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.authActionButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleAuthSubmit}
                disabled={isAuthSubmitting}
              >
                <Text style={[styles.authActionText, { color: '#FFFFFF' }]}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  authModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 18,
  },
  authModalCard: {
    borderRadius: 12,
    padding: 16,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  authSubtitle: {
    fontSize: 14,
    marginTop: 6,
    marginBottom: 12,
  },
  authInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  authActionsRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  authActionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  authActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
});