import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import type { Theme } from '@/app/context/ThemeContext';

interface WatchlistEmptyStateProps {
  theme: Theme;
}

export default function WatchlistEmptyState({ theme }: WatchlistEmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="tv-outline" size={64} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>Your watchlist is empty</Text>
      <Text style={[styles.emptyStateSubtext, { color: theme.colors.textSecondary }]}>
        Add shows to keep track of your favorites
      </Text>
      <Link href="/search" asChild>
        <TouchableOpacity
          style={StyleSheet.flatten([
            styles.emptyStateButton,
            { backgroundColor: theme.colors.primary },
          ])}
        >
          <Text style={styles.emptyStateButtonText}>Discover Shows</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});