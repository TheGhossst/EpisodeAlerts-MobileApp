import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TVShow } from '@/app/services/TMDBService';
import type { Theme } from '@/app/context/ThemeContext';
import CachedImage from '@/components/CachedImage';
import { formatEpisodeText } from './_utils';

interface UpcomingEpisodeItemProps {
  item: TVShow;
  index: number;
  theme: Theme;
}

export default function UpcomingEpisodeItem({ item, index, theme }: UpcomingEpisodeItemProps) {
  if (!item.next_episode_to_air) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).duration(400)}
      style={[styles.upcomingItem, { backgroundColor: theme.colors.card }]}
    >
      <View style={styles.upcomingItemContent}>
        <CachedImage
          uri={`https://image.tmdb.org/t/p/w185${item.poster_path}`}
          style={styles.upcomingImage}
          resizeMode="cover"
        />

        <View style={styles.upcomingInfo}>
          <Text style={[styles.upcomingShowTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.upcomingEpisodeInfo, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {formatEpisodeText(item.next_episode_to_air)} - {item.next_episode_to_air.name}
          </Text>
        </View>
      </View>

      <Text style={[styles.upcomingDate, { color: theme.colors.primary }]}>
        {item.next_episode_to_air.air_date}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  upcomingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  upcomingItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  upcomingImage: {
    width: 40,
    height: 60,
    borderRadius: 6,
  },
  upcomingInfo: {
    marginLeft: 12,
    flex: 1,
  },
  upcomingShowTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  upcomingEpisodeInfo: {
    fontSize: 14,
  },
  upcomingDate: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});