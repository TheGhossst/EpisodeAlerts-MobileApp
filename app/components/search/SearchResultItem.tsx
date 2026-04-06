import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Link } from 'expo-router';
import { TVShow } from '@/app/services/TMDBService';
import { TMDB_CONFIG } from '@/constants/Config';
import type { Theme } from '@/app/context/ThemeContext';
import CachedImage from '@/components/CachedImage';

interface SearchResultItemProps {
  item: TVShow;
  theme: Theme;
}

const getPosterUrl = (path: string | null) => {
  if (!path) {
    return undefined;
  }

  return `${TMDB_CONFIG.IMAGE_BASE_URL}/${TMDB_CONFIG.POSTER_SIZES.SMALL}${path}`;
};

export default function SearchResultItem({ item, theme }: SearchResultItemProps) {
  return (
    <Link href={{ pathname: '/show-details', params: { id: item.id } }} asChild>
      <TouchableOpacity style={StyleSheet.flatten([styles.resultItem, { backgroundColor: theme.colors.card }])}> 
        {item.poster_path ? (
          <CachedImage
            uri={getPosterUrl(item.poster_path) || ''}
            style={styles.poster}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.noPoster, { backgroundColor: theme.colors.surface }]}> 
            <Text style={[styles.noPosterText, { color: theme.colors.textSecondary }]}>No Image</Text>
          </View>
        )}

        <View style={styles.itemInfo}>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1} ellipsizeMode="tail">
            {item.name}
          </Text>
          <Text style={[styles.year, { color: theme.colors.textSecondary }]}>
            {item.first_air_date ? item.first_air_date.split('-')[0] : 'N/A'}
          </Text>
          <View style={styles.ratingContainer}>
            <Text style={[styles.rating, { color: theme.colors.primary }]}>★ {item.vote_average?.toFixed(1)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Link>
  );
}

const styles = StyleSheet.create({
  resultItem: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  poster: {
    width: 80,
    height: 120,
  },
  noPoster: {
    width: 80,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPosterText: {
    fontSize: 12,
  },
  itemInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  year: {
    fontSize: 14,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});