import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { router, Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';
import { ThemeProvider as AppThemeProvider, useTheme } from '@/app/context/ThemeContext';
import { NetworkStatusProvider } from '@/app/context/NetworkStatusContext';
import ConnectivityBanner from '@/app/components/ConnectivityBanner';
import AppToast from '@/app/components/AppToast';
import AnalyticsService from '@/app/services/AnalyticsService';
import CloudSyncService from '@/app/services/CloudSyncService';
import NotificationService from '@/app/services/NotificationService';
import { normalizeAppError, reportError } from '@/app/utils/errorHandling';

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const appError = normalizeAppError(error, {
    source: 'RootLayout.ErrorBoundary',
    fallbackMessage: 'An unexpected app error occurred. Please try again.',
  });

  useEffect(() => {
    reportError('RootLayout.ErrorBoundary', error, {
      fallbackMessage: 'An unexpected app error occurred. Please try again.',
    });
  }, [error]);

  return (
    <View style={errorStyles.container}>
      <Text style={errorStyles.title}>Something went wrong</Text>
      <Text style={errorStyles.message}>{appError.message}</Text>
      <View style={errorStyles.actionsRow}>
        <Pressable style={errorStyles.retryButton} onPress={retry}>
          <Text style={errorStyles.retryButtonText}>Try Again</Text>
        </Pressable>
        <Pressable
          style={errorStyles.secondaryButton}
          onPress={() => {
            router.replace('/(tabs)');
          }}
        >
          <Text style={errorStyles.secondaryButtonText}>Go Home</Text>
        </Pressable>
      </View>
    </View>
  );
}

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded && runtimeReady) {
      void SplashScreen.hideAsync();
    }
  }, [loaded, runtimeReady]);

  useEffect(() => {
    const initializeRuntimeServices = async () => {
      try {
        await Promise.all([
          AnalyticsService.initialize(),
          CloudSyncService.initialize(),
          NotificationService.initialize(),
        ]);
        NotificationService.startReleaseSync();
        CloudSyncService.startAutoSync();
        await Promise.all([
          NotificationService.syncWatchlistReleaseNotifications(),
          CloudSyncService.syncToCloudIfSignedIn(),
        ]);
      } catch (error) {
        reportError('RootLayout.initializeRuntimeServices', error, {
          fallbackMessage: 'Failed to initialize runtime services.',
        });
      } finally {
        setRuntimeReady(true);
      }
    };

    void initializeRuntimeServices();
    const unregisterTapHandler = NotificationService.registerNotificationTapHandler((showId) => {
      router.push({
        pathname: '/show-details',
        params: {
          id: showId.toString(),
        },
      });
    });

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        CloudSyncService.startAutoSync();
        void NotificationService.syncWatchlistReleaseNotifications();
        void CloudSyncService.syncToCloudIfSignedIn();
        return;
      }

      if (nextState === 'background' || nextState === 'inactive') {
        CloudSyncService.stopAutoSync();
        void CloudSyncService.syncToCloudIfSignedIn();
      }
    });

    return () => {
      appStateSubscription.remove();
      unregisterTapHandler();
      NotificationService.stopReleaseSync();
      CloudSyncService.stopAutoSync();
      void CloudSyncService.syncToCloudIfSignedIn();
      void AnalyticsService.endSession();
    };
  }, []);

  if (!loaded || !runtimeReady) {
    return null;
  }

  return (
    <AppThemeProvider>
      <NetworkStatusProvider>
        <RootLayoutNav />
      </NetworkStatusProvider>
    </AppThemeProvider>
  );
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    color: '#F9FAFB',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    marginTop: 14,
    color: '#D1D5DB',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  actionsRow: {
    marginTop: 22,
    flexDirection: 'row',
    gap: 10,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: '#1F2937',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#374151',
  },
  secondaryButtonText: {
    color: '#F9FAFB',
    fontWeight: '700',
    fontSize: 14,
  },
});

function RootLayoutNav() {
  const { theme } = useTheme();

  const navigationTheme = theme.dark
    ? {
        ...NavigationDarkTheme,
        colors: {
          ...NavigationDarkTheme.colors,
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.card,
          text: theme.colors.text,
          border: theme.colors.border,
          notification: theme.colors.accent,
        },
      }
    : {
        ...NavigationDefaultTheme,
        colors: {
          ...NavigationDefaultTheme.colors,
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.card,
          text: theme.colors.text,
          border: theme.colors.border,
          notification: theme.colors.accent,
        },
      };

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <ConnectivityBanner />
      <AppToast />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </NavigationThemeProvider>
  );
}
