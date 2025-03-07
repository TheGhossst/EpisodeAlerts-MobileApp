import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, NativeSyntheticEvent, ImageErrorEventData } from 'react-native';
import { Link } from 'expo-router';
import { TVShow } from '@/app/services/TMDBService';
import { TMDB_CONFIG } from '@/constants/Config';
import CachedImage from './CachedImage';
import EpisodeCountdown from '@/app/components/EpisodeCountdown';
import { useTheme } from '@/app/context/ThemeContext';

interface ShowCardProps {
  show: TVShow;
  size?: 'small' | 'medium' | 'large';
  onError?: (error: Error) => void;
  compact?: boolean;
}

const ShowCard: React.FC<ShowCardProps> = ({ show, size = 'medium', onError, compact = false }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { theme } = useTheme();

  const getPosterSize = () => {
    try {
      switch (size) {
        case 'small':
          return TMDB_CONFIG.POSTER_SIZES.SMALL;
        case 'large':
          return TMDB_CONFIG.POSTER_SIZES.LARGE;
        default:
          return TMDB_CONFIG.POSTER_SIZES.MEDIUM;
      }
    } catch (error) {
      setHasError(true);
      onError?.(error as Error);
      return TMDB_CONFIG.POSTER_SIZES.MEDIUM;
    }
  };

  const getPosterUrl = (path: string) => {
    try {
      if (!path) return '';
      return `${TMDB_CONFIG.IMAGE_BASE_URL}/${getPosterSize()}${path}`;
    } catch (error) {
      setHasError(true);
      onError?.(error as Error);
      return '';
    }
  };

  const getCardStyle = () => {
    try {
      switch (size) {
        case 'small':
          return { width: 120, height: 180 };
        case 'large':
          return { width: 200, height: 300 };
        default:
          return { width: 160, height: 240 };
      }
    } catch (error) {
      setHasError(true);
      onError?.(error as Error);
      return { width: 160, height: 240 };
    }
  };

  const cardStyle = getCardStyle();

  if (hasError || !show || !show.id) {
    return (
      <View style={[styles.container, { width: cardStyle.width }]}>
        <View style={[styles.noPoster, cardStyle]}>
          <Text style={styles.noPosterText}>Unable to load</Text>
        </View>
      </View>
    );
  }

  const handleImageError = () => {
    console.error('Error loading image for show:', show.name);
    setHasError(true);
    
    const error = new Error(`Failed to load image for show: ${show.name}`);
    onError?.(error);
  };

  return (
    <Link href={{ pathname: '/show-details', params: { id: show.id } }} asChild>
      <TouchableOpacity 
        style={[
          styles.container, 
          { backgroundColor: theme.colors.card },
          compact && styles.compactContainer
        ]}
        onPress={() => setIsLoading(true)}
      >
        {isLoading && (
          <View style={[styles.loadingOverlay, cardStyle]}>
            <ActivityIndicator size="small" color="#e50914" />
          </View>
        )}
        
        {show.poster_path ? (
          <CachedImage
            uri={getPosterUrl(show.poster_path)}
            style={[styles.poster, cardStyle, compact && styles.compactPoster]}
            resizeMode="cover"
            showLoader={true}
            onError={handleImageError}
          />
        ) : (
          <View style={[styles.noPoster, cardStyle]}>
            <Text style={styles.noPosterText}>{show.name || 'No title'}</Text>
          </View>
        )}
        <View style={styles.infoContainer}>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>
            {show.name || 'Untitled Show'}
          </Text>
          {!compact && (
            <>
              <Text style={[styles.overview, { color: theme.colors.textSecondary }]} numberOfLines={3}>
                {show.overview}
              </Text>
              {show.next_episode_to_air && (
                <View style={styles.nextEpisodeContainer}>
                  <Text style={[styles.nextEpisode, { color: theme.colors.textSecondary }]}>
                    Next: S{show.next_episode_to_air.season_number}E{show.next_episode_to_air.episode_number}
                  </Text>
                  <EpisodeCountdown airDate={show.next_episode_to_air.air_date} />
                </View>
              )}
            </>
          )}
          {compact && show.next_episode_to_air && (
            <View style={styles.compactNextEpisode}>
              <EpisodeCountdown airDate={show.next_episode_to_air.air_date} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Link>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: 12,
    marginBottom: 16,
    position: 'relative',
  },
  poster: {
    borderRadius: 8,
  },
  noPoster: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  noPosterText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 14,
  },
  infoContainer: {
    marginTop: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  overview: {
    color: '#ffffff',
    fontSize: 12,
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    color: '#e50914',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  nextEpisodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  nextEpisode: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  compactContainer: {
    marginVertical: 4,
    marginHorizontal: 8,
  },
  compactPoster: {
    width: 60,
    height: 90,
  },
  compactNextEpisode: {
    marginTop: 4,
  },
});

export default ShowCard; 