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
import Toast from 'react-native-toast-message';
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
import {
  getFirebaseErrorCode as extractFirebaseErrorCode,
  reportError,
  showErrorAlert,
} from '@/app/utils/errorHandling';

type AuthMode = 'signIn' | 'signUp';

type AuthFeedback = {
  title: string;
  message: string;
  code: string | null;
};

function getAuthFeedback(error: unknown, mode: AuthMode): AuthFeedback {
  const code = extractFirebaseErrorCode(error);
  const notConfiguredMessage = 'Cloud sync is not available in this build.';

  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.toLowerCase().includes('not configured')) {
      return {
        title: 'Cloud sync unavailable',
        message: notConfiguredMessage,
        code,
      };
    }
  }

  switch (code) {
    case 'auth/email-already-in-use':
      return {
        title: 'Email already in use',
        message: 'That address already has an account. Try signing in instead.',
        code,
      };
    case 'auth/invalid-email':
      return {
        title: 'Invalid email',
        message: 'Enter a valid email address and try again.',
        code,
      };
    case 'auth/weak-password':
      return {
        title: 'Weak password',
        message: 'Use a stronger password with at least 6 characters.',
        code,
      };
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return {
        title: 'Sign in failed',
        message: 'Check your email and password, then try again.',
        code,
      };
    case 'auth/user-disabled':
      return {
        title: 'Account disabled',
        message: 'This account has been disabled. Contact support if needed.',
        code,
      };
    case 'auth/too-many-requests':
      return {
        title: 'Too many attempts',
        message: 'Please wait a moment before trying again.',
        code,
      };
    case 'auth/network-request-failed':
      return {
        title: 'Connection issue',
        message: 'Check your internet connection and try again.',
        code,
      };
    case 'auth/operation-not-allowed':
      return {
        title: 'Sign in unavailable',
        message: 'Email and password sign-in is not enabled for this project.',
        code,
      };
    default:
      return {
        title: mode === 'signUp' ? 'Could not create account' : 'Could not sign in',
        message: 'Please try again.',
        code,
      };
  }
}

function showAuthToast(title: string, message: string, variant: 'success' | 'error') {
  Toast.show({
    type: variant,
    text1: title,
    text2: message,
    position: 'bottom',
    visibilityTime: 3500,
    autoHide: true,
  });
}

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
  const [authMode, setAuthMode] = useState<AuthMode>('signIn');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<AuthFeedback | null>(null);

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
    try {
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
    } catch (error) {
      const appError = reportError('SettingsScreen.refreshCloudSyncStatus', error, {
        fallbackMessage: 'Could not refresh cloud sync status.',
      });
      setCloudSyncStatusText(appError.message);
    }
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
      reportError('SettingsScreen.loadSettings', error, {
        fallbackMessage: 'Failed to load settings.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openAuthModal = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthEmail('');
    setAuthPassword('');
    setAuthFeedback(null);
    setAuthModalVisible(true);
  };

  const closeAuthModal = () => {
    if (isAuthSubmitting) {
      return;
    }

    setAuthFeedback(null);
    setAuthModalVisible(false);
  };

  const handleAuthSubmit = async () => {
    const email = authEmail.trim();
    const password = authPassword;

    setAuthFeedback(null);

    if (!email || !password) {
      setAuthFeedback({
        title: 'Missing details',
        message: 'Enter both email and password to continue.',
        code: null,
      });
      return;
    }

    setIsAuthSubmitting(true);
    try {
      if (authMode === 'signIn') {
        await CloudSyncService.signIn(email, password);
      } else {
        await CloudSyncService.signUp(email, password);
      }

      setAuthModalVisible(false);
      setAuthEmail('');
      setAuthPassword('');
      setAuthFeedback(null);
      await refreshCloudSyncStatus();

      showAuthToast(
        authMode === 'signIn' ? 'Signed in' : 'Account created',
        authMode === 'signIn'
          ? 'Cloud sync is now enabled on this device.'
          : 'Your account is ready and cloud sync is active.',
        'success',
      );
    } catch (error) {
      const feedback = getAuthFeedback(error, authMode);
      reportError('SettingsScreen.handleAuthSubmit', error, {
        fallbackMessage: feedback.message,
        metadata: {
          authMode,
          firebaseCode: feedback.code || 'unknown',
        },
      });
      setAuthFeedback(feedback);
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
      showErrorAlert('SettingsScreen.handleSyncUpload', error, {
        title: 'Upload Failed',
        fallbackMessage: 'Please sign in and try again.',
      });
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
      showErrorAlert('SettingsScreen.handleSyncDownload', error, {
        title: 'Download Failed',
        fallbackMessage: 'Please sign in and try again.',
      });
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
      showErrorAlert('SettingsScreen.handleSignOut', error, {
        title: 'Sign Out Failed',
        fallbackMessage: 'Please try again.',
      });
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
      showErrorAlert('SettingsScreen.handleNotificationToggle', error, {
        title: 'Update Failed',
        fallbackMessage: 'Failed to update notification settings.',
      });
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
      showErrorAlert('SettingsScreen.handleAnalyticsToggle', error, {
        title: 'Update Failed',
        fallbackMessage: 'Failed to update analytics settings.',
      });
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
      showErrorAlert('SettingsScreen.handleImageCacheToggle', error, {
        title: 'Update Failed',
        fallbackMessage: 'Failed to update image cache settings.',
      });
    }
  };

  const handleThemeChange = async (themeMode: ThemeType) => {
    try {
      await setTheme(themeMode);

      await AnalyticsService.trackEvent(EventType.CHANGE_THEME, { theme: themeMode });
    } catch (error) {
      showErrorAlert('SettingsScreen.handleThemeChange', error, {
        title: 'Update Failed',
        fallbackMessage: 'Failed to update theme settings.',
      });
    }
  };

  const calculateCacheSize = async () => {
    try {
      await ImageCacheService.calculateCacheSize();
      const sizeMB = ImageCacheService.getCacheSizeInMB();
      setCacheSizeText(`${sizeMB} MB`);
    } catch (error) {
      reportError('SettingsScreen.calculateCacheSize', error, {
        fallbackMessage: 'Failed to calculate cache size.',
      });
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
      showErrorAlert('SettingsScreen.clearImageCache', error, {
        title: 'Clear Failed',
        fallbackMessage: 'Failed to clear image cache.',
      });
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
              showErrorAlert('SettingsScreen.resetPreferences', error, {
                title: 'Reset Failed',
                fallbackMessage: 'Failed to reset preferences.',
              });
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

            {authFeedback ? (
              <View
                style={[
                  styles.authFeedbackCard,
                  {
                    backgroundColor: theme.dark ? 'rgba(244, 67, 54, 0.12)' : '#FDEDED',
                    borderColor: theme.colors.error,
                  },
                ]}
              >
                <View style={styles.authFeedbackTextWrap}>
                  <Text style={[styles.authFeedbackTitle, { color: theme.colors.error }]}>
                    {authFeedback.title}
                  </Text>
                  <Text style={[styles.authFeedbackMessage, { color: theme.colors.textSecondary }]}>
                    {authFeedback.message}
                  </Text>
                </View>

                {authFeedback.code === 'auth/email-already-in-use' && authMode === 'signUp' ? (
                  <TouchableOpacity
                    style={[styles.authFeedbackAction, { backgroundColor: theme.colors.primary }]}
                    onPress={() => {
                      setAuthMode('signIn');
                      setAuthFeedback(null);
                    }}
                  >
                    <Text style={styles.authFeedbackActionText}>Use Sign In</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.authFeedbackAction, { backgroundColor: theme.colors.secondary }]}
                    onPress={() => setAuthFeedback(null)}
                  >
                    <Text style={[styles.authFeedbackActionText, { color: theme.colors.text }]}>Dismiss</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}

            <TextInput
              value={authEmail}
              onChangeText={(value) => {
                setAuthEmail(value);
                if (authFeedback) {
                  setAuthFeedback(null);
                }
              }}
              placeholder="Email"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!isAuthSubmitting}
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
              onChangeText={(value) => {
                setAuthPassword(value);
                if (authFeedback) {
                  setAuthFeedback(null);
                }
              }}
              placeholder="Password"
              placeholderTextColor={theme.colors.textSecondary}
              secureTextEntry
              editable={!isAuthSubmitting}
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
                style={[
                  styles.authActionButton,
                  styles.authPrimaryButton,
                  {
                    backgroundColor: theme.colors.primary,
                    shadowColor: theme.colors.primary,
                  },
                  isAuthSubmitting ? styles.authPrimaryButtonBusy : null,
                ]}
                onPress={handleAuthSubmit}
                disabled={isAuthSubmitting}
              >
                {isAuthSubmitting ? (
                  <View style={styles.authActionLoadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <View style={styles.authActionLoadingCopy}>
                      <Text style={[styles.authActionTitle, { color: '#FFFFFF' }]}>
                        {authMode === 'signIn' ? 'Signing you in' : 'Creating your account'}
                      </Text>
                      <Text style={styles.authActionSubtitle}>Please wait a moment.</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={[styles.authActionText, { color: '#FFFFFF' }]}>
                    {authMode === 'signIn' ? 'Sign In' : 'Create Account'}
                  </Text>
                )}
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
  authFeedbackCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  authFeedbackTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  authFeedbackTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  authFeedbackMessage: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 17,
  },
  authFeedbackAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  authFeedbackActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
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
    paddingVertical: 12,
    borderRadius: 14,
    marginHorizontal: 4,
    minHeight: 54,
  },
  authPrimaryButton: {
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 4,
  },
  authPrimaryButtonBusy: {
    opacity: 0.95,
  },
  authActionLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authActionLoadingCopy: {
    marginLeft: 10,
    alignItems: 'flex-start',
  },
  authActionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  authActionSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  authActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
});