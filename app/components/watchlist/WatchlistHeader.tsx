import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Theme } from '@/app/context/ThemeContext';

interface WatchlistHeaderProps {
  showCount: number;
  theme: Theme;
  onAddShowsPress: () => void;
}

export default function WatchlistHeader({ showCount, theme, onAddShowsPress }: WatchlistHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>My Watchlist</Text>
        <Text style={[styles.showCount, { color: theme.colors.textSecondary }]}>
          {showCount} {showCount === 1 ? 'show' : 'shows'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: theme.colors.card }]}
        onPress={onAddShowsPress}
      >
        <Ionicons name="add" size={20} color={theme.colors.text} />
        <Text style={[styles.addButtonText, { color: theme.colors.text }]}>Add Shows</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  showCount: {
    fontSize: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
});