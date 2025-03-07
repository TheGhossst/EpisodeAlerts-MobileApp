import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { TVShow } from '@/app/services/TMDBService';
import CachedImage from '@/components/CachedImage';
import { useTheme } from '@/app/context/ThemeContext';
import EpisodeCountdown from './EpisodeCountdown';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

interface FeaturedShowBannerProps {
  show: TVShow;
  onAddToWatchlist?: () => void;
  isInWatchlist?: boolean;
}

const BANNER_HEIGHT = 220;

export default function FeaturedShowBanner({ 
  show, 
  onAddToWatchlist,
  isInWatchlist = false 
}: FeaturedShowBannerProps) {
  const { theme } = useTheme();

  if (!show) return null;

  return (
    <Animated.View 
      style={styles.container}
      entering={FadeIn.duration(800)}
    >
      <Link href={{ pathname: '/show-details', params: { id: show.id.toString() } }} asChild>
        <TouchableOpacity activeOpacity={0.9} style={styles.touchable}>
          <View style={styles.bannerContainer}>
            <CachedImage
              uri={`https://image.tmdb.org/t/p/w780${show.backdrop_path}`}
              style={styles.backdropImage}
              resizeMode="cover"
            />
            
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)', theme.colors.background]}
              style={styles.gradient}
            />
            
            <View style={styles.contentContainer}>
              <Animated.Text 
                style={[styles.title, { color: '#fff' }]}
                numberOfLines={2}
                entering={FadeInDown.delay(200).duration(500)}
              >
                {show.name}
              </Animated.Text>
              
              <View style={styles.metaContainer}>
                {show.first_air_date && (
                  <Text style={styles.year}>
                    {new Date(show.first_air_date).getFullYear()}
                  </Text>
                )}
                
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.rating}>
                    {show.vote_average?.toFixed(1)}
                  </Text>
                </View>
              </View>
              
              <Animated.Text 
                style={styles.overview}
                numberOfLines={2}
                entering={FadeInDown.delay(300).duration(500)}
              >
                {show.overview}
              </Animated.Text>
              
              {show.next_episode_to_air && (
                <View style={styles.nextEpisodeContainer}>
                  <Text style={styles.nextEpisodeLabel}>
                    Next Episode
                  </Text>
                  <EpisodeCountdown airDate={show.next_episode_to_air.air_date} />
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Link>
      
      {onAddToWatchlist && (
        <TouchableOpacity 
          style={[
            styles.watchlistButton,
            { backgroundColor: isInWatchlist ? theme.colors.secondary : theme.colors.primary }
          ]}
          onPress={onAddToWatchlist}
        >
          <Ionicons 
            name={isInWatchlist ? "bookmark" : "bookmark-outline"} 
            size={20} 
            color="#fff" 
          />
          <Text style={styles.watchlistText}>
            {isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginHorizontal: 16,
  },
  touchable: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  bannerContainer: {
    height: BANNER_HEIGHT,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  backdropImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: BANNER_HEIGHT,
  },
  contentContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  year: {
    color: '#fff',
    fontSize: 14,
    marginRight: 12,
    opacity: 0.9,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 4,
    opacity: 0.9,
  },
  overview: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    opacity: 0.9,
  },
  nextEpisodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  nextEpisodeLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  watchlistButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  watchlistText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
}); 