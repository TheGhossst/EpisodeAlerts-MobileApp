import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/app/context/ThemeContext';
import { useNetworkStatus } from '@/app/context/NetworkStatusContext';

const ONLINE_BANNER_DURATION_MS = 3500;

export default function ConnectivityBanner() {
  const { theme } = useTheme();
  const { isOffline, isInitialized } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const [showBackOnline, setShowBackOnline] = useState(false);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    if (isOffline) {
      wasOfflineRef.current = true;
      setShowBackOnline(false);
      return;
    }

    if (wasOfflineRef.current) {
      setShowBackOnline(true);
      const timer = setTimeout(() => {
        setShowBackOnline(false);
        wasOfflineRef.current = false;
      }, ONLINE_BANNER_DURATION_MS);

      return () => clearTimeout(timer);
    }
  }, [isOffline, isInitialized]);

  if (!isInitialized || (!isOffline && !showBackOnline)) {
    return null;
  }

  const backgroundColor = isOffline
    ? theme.dark
      ? '#5A2A00'
      : '#FFE2C2'
    : theme.dark
      ? '#1E4D2B'
      : '#D9F6E3';

  const textColor = isOffline
    ? theme.dark
      ? '#FFD8B0'
      : '#7A3E00'
    : theme.dark
      ? '#B8F0C7'
      : '#14532D';

  const message = isOffline
    ? 'Offline mode: showing cached data where available.'
    : 'Back online. Live data syncing resumed.';

  return (
    <View
      style={StyleSheet.flatten([
        styles.container,
        {
          paddingTop: insets.top + 6,
          backgroundColor,
          borderBottomColor: theme.colors.border,
        },
      ])}
      pointerEvents="none"
    >
      <Ionicons
        name={isOffline ? 'cloud-offline-outline' : 'cloud-done-outline'}
        size={16}
        color={textColor}
      />
      <Text style={[styles.message, { color: textColor }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
  },
});
