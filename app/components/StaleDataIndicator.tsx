import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/app/context/ThemeContext';

interface StaleDataIndicatorProps {
  message?: string;
  lastUpdatedAt?: number | null;
}

export default function StaleDataIndicator({
  message = 'Showing cached data. Some information may be outdated.',
  lastUpdatedAt,
}: StaleDataIndicatorProps) {
  const { theme } = useTheme();

  const timestampText = lastUpdatedAt
    ? `Last updated ${new Date(lastUpdatedAt).toLocaleString()}`
    : null;

  return (
    <View
      style={StyleSheet.flatten([
        styles.container,
        {
          backgroundColor: theme.dark ? 'rgba(255,193,7,0.12)' : '#FFF4D8',
          borderColor: theme.dark ? 'rgba(255,193,7,0.4)' : '#E6C160',
        },
      ])}
    >
      <Ionicons name="time-outline" size={16} color={theme.colors.text} />
      <View style={styles.textContainer}>
        <Text style={[styles.message, { color: theme.colors.text }]}>{message}</Text>
        {timestampText ? (
          <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>{timestampText}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 8,
  },
  message: {
    fontSize: 13,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 2,
  },
});
