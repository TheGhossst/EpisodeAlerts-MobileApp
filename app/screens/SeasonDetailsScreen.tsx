import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import TMDBService, { Season, Episode } from '../services/TMDBService';

type Props = NativeStackScreenProps<RootStackParamList, 'SeasonDetails'>;

const SeasonDetailsScreen = ({ route }: Props) => {
  const { tvId, seasonNumber } = route.params;
  const [season, setSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSeasonDetails();
  }, [tvId, seasonNumber]);

  const loadSeasonDetails = async () => {
    try {
      const details = await TMDBService.getSeasonDetails(tvId, seasonNumber);
      setSeason(details);
    } catch (error) {
      console.error('Failed to load season details:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderEpisode = ({ item }: { item: Episode }) => (
    <View style={styles.episodeItem}>
      <Text style={styles.episodeNumber}>Episode {item.episode_number}</Text>
      <Text style={styles.episodeTitle}>{item.name}</Text>
      <Text style={styles.episodeAirDate}>
        Air Date: {item.air_date || 'TBA'}
      </Text>
      {item.overview && (
        <Text style={styles.episodeOverview}>{item.overview}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e50914" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {season && (
        <>
          <View style={styles.header}>
            <Text style={styles.seasonTitle}>{season.name}</Text>
            <Text style={styles.episodeCount}>
              {season.episode_count} Episodes
            </Text>
          </View>

          <FlatList
            data={season.episodes}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderEpisode}
            contentContainerStyle={styles.episodeList}
          />
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  header: {
    padding: 16,
    backgroundColor: '#1a1a1a',
  },
  seasonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  episodeCount: {
    fontSize: 16,
    color: '#666666',
  },
  episodeList: {
    padding: 16,
  },
  episodeItem: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    paddingBottom: 16,
  },
  episodeNumber: {
    fontSize: 14,
    color: '#e50914',
    marginBottom: 4,
  },
  episodeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  episodeAirDate: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  episodeOverview: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
  },
});

export default SeasonDetailsScreen; 