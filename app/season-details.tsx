import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, Stack, Link, router } from 'expo-router';
import TMDBService, { Season, Episode } from '@/app/services/TMDBService';
import { TMDB_CONFIG } from '@/constants/Config';
import CachedImage from '@/components/CachedImage';

export default function SeasonDetailsScreen() {
  const { id, season } = useLocalSearchParams<{ id: string; season: string }>();
  const [seasonDetails, setSeasonDetails] = useState<Season | null>(null);
  const [showName, setShowName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id || !season) {
      setError('Missing required parameters. Please go back and try again.');
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      const showId = parseInt(id);
      const seasonNumber = parseInt(season);
      
      if (isNaN(showId) || isNaN(seasonNumber)) {
        throw new Error('Invalid show ID or season number');
      }

      setError(null);
      
      if (!isRefreshing) {
        setIsLoading(true);
      }

      // Load season details
      const details = await TMDBService.getSeasonDetails(showId, seasonNumber);
      setSeasonDetails(details);

      // Load show name
      const showDetails = await TMDBService.getTVShowDetails(showId);
      setShowName(showDetails.name);
    } catch (err) {
      console.error('Error loading season details:', err);
      setError('Failed to load season details. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id, season]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const getImageUrl = (path: string | null) => {
    if (!path) return '';
    return `${TMDB_CONFIG.IMAGE_BASE_URL}/${TMDB_CONFIG.POSTER_SIZES.MEDIUM}${path}`;
  };

  const handleImageError = () => {
    console.error('Image failed to load');
    // We could set a state here to show a fallback image
  };

  const handleBackPress = () => {
    if (id) {
      router.push({ pathname: '/show-details', params: { id } });
    } else {
      router.back();
    }
  };

  const renderEpisode = ({ item }: { item: Episode }) => (
    <View style={styles.episodeCard}>
      {item.still_path ? (
        <CachedImage
          uri={getImageUrl(item.still_path)}
          style={styles.episodeImage}
          resizeMode="cover"
          onError={handleImageError}
        />
      ) : (
        <View style={styles.noImage}>
          <Text style={styles.noImageText}>No Image</Text>
        </View>
      )}

      <View style={styles.episodeInfo}>
        <Text style={styles.episodeNumber}>
          Episode {item.episode_number}
        </Text>
        <Text style={styles.episodeName}>{item.name || 'Untitled Episode'}</Text>
        <Text style={styles.episodeDate}>
          {item.air_date || 'Air date unknown'}
        </Text>
        {item.overview ? (
          <Text style={styles.episodeOverview} numberOfLines={2}>
            {item.overview}
          </Text>
        ) : (
          <Text style={styles.noOverview}>No overview available</Text>
        )}
        <View style={styles.ratingContainer}>
          <Text style={styles.rating}>★ {item.vote_average?.toFixed(1) || 'N/A'}</Text>
        </View>
      </View>
    </View>
  );

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e50914" />
      </View>
    );
  }

  if (error || !seasonDetails) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Season details not found'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Text style={styles.backButtonText}>Back to Show</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `${showName}: ${seasonDetails.name}`,
          headerStyle: {
            backgroundColor: '#1a1a1a',
          },
          headerTintColor: '#ffffff',
        }}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.seasonInfo}>
            {seasonDetails.poster_path ? (
              <CachedImage
                uri={getImageUrl(seasonDetails.poster_path)}
                style={styles.seasonPoster}
                resizeMode="cover"
                onError={handleImageError}
              />
            ) : null}
            <View style={styles.infoContainer}>
              <Text style={styles.seasonName}>{seasonDetails.name}</Text>
              <Text style={styles.episodeCount}>
                {seasonDetails.episodes?.length || 0} Episodes
              </Text>
              <Text style={styles.airDate}>
                {seasonDetails.air_date ? `First aired: ${seasonDetails.air_date}` : ''}
              </Text>
            </View>
          </View>

          {seasonDetails.overview ? (
            <View style={styles.overviewContainer}>
              <Text style={styles.overviewTitle}>Season Overview</Text>
              <Text style={styles.overview}>{seasonDetails.overview}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.episodesTitle}>Episodes</Text>
        <FlatList
          data={seasonDetails.episodes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderEpisode}
          contentContainerStyle={styles.episodesList}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl 
              refreshing={isRefreshing} 
              onRefresh={handleRefresh}
              colors={['#e50914']}
              tintColor="#e50914"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No episodes available</Text>
            </View>
          }
        />
      </View>
    </>
  );
}

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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 16,
  },
  errorText: {
    color: '#e50914',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#333333',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 4,
    marginBottom: 12,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  retryButton: {
    backgroundColor: '#e50914',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    padding: 16,
    backgroundColor: '#1a1a1a',
  },
  seasonInfo: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  seasonPoster: {
    width: 100,
    height: 150,
    borderRadius: 8,
  },
  infoContainer: {
    marginLeft: 16,
    flex: 1,
    justifyContent: 'center',
  },
  seasonName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  episodeCount: {
    fontSize: 16,
    color: '#cccccc',
    marginBottom: 4,
  },
  airDate: {
    fontSize: 14,
    color: '#999999',
  },
  overviewContainer: {
    marginTop: 8,
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  overview: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
  },
  episodesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    margin: 16,
  },
  episodesList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  episodeCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    overflow: 'hidden',
  },
  episodeImage: {
    width: 160,
    height: 90,
  },
  noImage: {
    width: 160,
    height: 90,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#666666',
    fontSize: 12,
  },
  episodeInfo: {
    flex: 1,
    padding: 12,
  },
  episodeNumber: {
    fontSize: 12,
    color: '#e50914',
    marginBottom: 4,
  },
  episodeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  episodeDate: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
  },
  episodeOverview: {
    fontSize: 12,
    color: '#cccccc',
    marginBottom: 4,
  },
  noOverview: {
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  ratingContainer: {
    marginTop: 4,
  },
  rating: {
    fontSize: 12,
    color: '#e50914',
    fontWeight: 'bold',
  },
  separator: {
    height: 12,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999999',
    fontSize: 16,
  },
}); 