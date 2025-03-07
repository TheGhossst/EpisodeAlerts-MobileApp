import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { TMDB_CONFIG } from '../../constants/Config';

type Props = NativeStackScreenProps<RootStackParamList, 'ShowDetails'>;

const ShowDetailsScreen = ({ route, navigation }: Props) => {
  const { show } = route.params;

  const getPosterUrl = (path: string) => {
    return `${TMDB_CONFIG.IMAGE_BASE_URL}/${TMDB_CONFIG.POSTER_SIZES.LARGE}${path}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.posterContainer}>
          {show.poster_path && (
            <Image
              source={{ uri: getPosterUrl(show.poster_path) }}
              style={styles.posterImage}
              resizeMode="cover"
            />
          )}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.title}>{show.name}</Text>
          <Text style={styles.year}>
            {show.first_air_date?.split('-')[0] || 'N/A'}
          </Text>

          <View style={styles.ratingContainer}>
            <Text style={styles.rating}>
              ★ {show.vote_average?.toFixed(1) || 'N/A'}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <Text style={styles.overview}>{show.overview}</Text>
          </View>

          {show.next_episode_to_air && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Next Episode</Text>
              <Text style={styles.episodeInfo}>
                Episode {show.next_episode_to_air.episode_number} - Season{' '}
                {show.next_episode_to_air.season_number}
              </Text>
              <Text style={styles.episodeDate}>
                Airs on {show.next_episode_to_air.air_date}
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.watchlistButton}>
            <Text style={styles.watchlistButtonText}>Add to Watchlist</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  posterContainer: {
    height: 450,
    backgroundColor: '#1a1a1a',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  year: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
  },
  ratingContainer: {
    marginBottom: 16,
  },
  rating: {
    fontSize: 16,
    color: '#e50914',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  overview: {
    fontSize: 16,
    color: '#cccccc',
    lineHeight: 24,
  },
  episodeInfo: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 4,
  },
  episodeDate: {
    fontSize: 14,
    color: '#666666',
  },
  watchlistButton: {
    backgroundColor: '#e50914',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  watchlistButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ShowDetailsScreen; 