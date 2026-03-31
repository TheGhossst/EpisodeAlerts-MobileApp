import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import type { TVShow } from '@/app/services/TMDBService';
import type { Theme } from '@/app/context/ThemeContext';
import HomeShowCard from './HomeShowCard';

interface HomeShowSectionProps {
  title: string;
  shows: TVShow[];
  watchlistIds: number[];
  theme: Theme;
  airingTodayStatusText: string;
}

export default function HomeShowSection({
  title,
  shows,
  watchlistIds,
  theme,
  airingTodayStatusText,
}: HomeShowSectionProps) {
  if (!shows || shows.length === 0) {
    return null;
  }

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
        <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.showsScrollContainer}
      >
        {shows.map((show, index) => (
          <HomeShowCard
            key={`${title}-${show.id}`}
            item={show}
            index={index}
            sectionTitle={title}
            isInWatchlist={watchlistIds.includes(show.id)}
            theme={theme}
            airingTodayStatusText={airingTodayStatusText}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  showsScrollContainer: {
    paddingHorizontal: 16,
  },
});