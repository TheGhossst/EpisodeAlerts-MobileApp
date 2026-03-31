import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Link } from 'expo-router';
import { TVShow } from '@/app/services/TMDBService';
import { TMDB_CONFIG } from '@/constants/Config';

interface SearchResultItemProps {
  item: TVShow;
}

const getPosterUrl = (path: string | null) => {
  if (!path) {
    return undefined;
  }

  return `${TMDB_CONFIG.IMAGE_BASE_URL}/${TMDB_CONFIG.POSTER_SIZES.SMALL}${path}`;
};

export default function SearchResultItem({ item }: SearchResultItemProps) {
  return (
    <Link href={{ pathname: '/show-details', params: { id: item.id } }} asChild>
      <TouchableOpacity style={styles.resultItem}>
        {item.poster_path ? (
          <Image
            source={{ uri: getPosterUrl(item.poster_path) }}
            style={styles.poster}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.noPoster}>
            <Text style={styles.noPosterText}>No Image</Text>
          </View>
        )}

        <View style={styles.itemInfo}>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            {item.name}
          </Text>
          <Text style={styles.year}>
            {item.first_air_date ? item.first_air_date.split('-')[0] : 'N/A'}
          </Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.rating}>★ {item.vote_average?.toFixed(1)}</Text>
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
    backgroundColor: '#1a1a1a',
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
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPosterText: {
    color: '#666666',
    fontSize: 12,
  },
  itemInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  year: {
    color: '#999999',
    fontSize: 14,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    color: '#e50914',
    fontSize: 14,
    fontWeight: 'bold',
  },
});