import React from 'react';
import {
  Dimensions,
  ImageBackground,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Feather, FontAwesome, Ionicons } from '@expo/vector-icons';
import type { TVShow } from '@/app/services/TMDBService';
import EpisodeCountdown from '@/app/components/EpisodeCountdown';
import { formatDate, truncateText } from './_utils';

const { height } = Dimensions.get('window');
const BANNER_HEIGHT = height * 0.55;

interface HomeFeaturedBannerProps {
  featuredShow: TVShow;
  isInWatchlist: boolean;
  onToggleWatchlist: (show: TVShow) => void;
}

export default function HomeFeaturedBanner({
  featuredShow,
  isInWatchlist,
  onToggleWatchlist,
}: HomeFeaturedBannerProps) {
  return (
    <View style={styles.heroContainer}>
      <ImageBackground
        source={{ uri: `https://image.tmdb.org/t/p/original${featuredShow.backdrop_path}` }}
        style={styles.heroBanner}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
          style={styles.heroGradient}
        >
          <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

          <View style={styles.appHeader}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>Episode</Text>
              <Text style={[styles.logoText, styles.logoTextBold]}>Alerts</Text>
            </View>

            <View style={styles.headerActions}>
              <Link href="/search" asChild>
                <Pressable style={styles.headerButton}>
                  <Feather name="search" size={22} color="#fff" />
                </Pressable>
              </Link>

              <Link href="/settings" asChild>
                <Pressable style={styles.headerButton}>
                  <Feather name="settings" size={22} color="#fff" />
                </Pressable>
              </Link>
            </View>
          </View>

          <View style={styles.heroContent}>
            <Animated.View entering={FadeInDown.duration(500)}>
              <View style={styles.featuredRow}>
                <View style={styles.featuredBadge}>
                  <Text style={styles.featuredText}>Featured</Text>
                </View>
                <View style={styles.ratingContainer}>
                  <FontAwesome name="star" size={14} color="#FFD700" />
                  <Text style={styles.ratingText}>{featuredShow.vote_average?.toFixed(1)}</Text>
                </View>
              </View>

              <Text style={styles.heroTitle}>{featuredShow.name}</Text>

              <View style={styles.genreContainer}>
                {featuredShow.genres?.slice(0, 3).map((genre) => (
                  <View key={`genre-${genre.id}`} style={styles.genreTag}>
                    <Text style={styles.genreText}>{genre.name}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.heroDescription}>{truncateText(featuredShow.overview, 150)}</Text>

              {featuredShow.next_episode_to_air && (
                <View style={styles.nextEpisodeInfo}>
                  <View style={styles.nextEpisodeBadge}>
                    <Text style={styles.nextEpisodeText}>
                      Next Episode: {formatDate(featuredShow.next_episode_to_air.air_date)}
                    </Text>
                  </View>
                  <EpisodeCountdown airDate={featuredShow.next_episode_to_air.air_date} />
                </View>
              )}

              <View style={styles.heroActions}>
                <Link
                  href={{
                    pathname: '/show-details',
                    params: { id: featuredShow.id.toString() },
                  }}
                  asChild
                >
                  <Pressable style={styles.watchButton}>
                    <Ionicons name="information-circle-outline" size={20} color="#FFF" />
                    <Text style={styles.watchButtonText}>Details</Text>
                  </Pressable>
                </Link>

                <Pressable
                  style={[
                    styles.watchlistButton,
                    isInWatchlist ? styles.watchlistButtonActive : null,
                  ]}
                  onPress={() => onToggleWatchlist(featuredShow)}
                >
                  <Ionicons
                    name={isInWatchlist ? 'bookmark' : 'bookmark-outline'}
                    size={20}
                    color="#FFF"
                  />
                  <Text style={styles.watchlistButtonText}>
                    {isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    width: '100%',
    height: BANNER_HEIGHT,
  },
  heroBanner: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingTop: 50,
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '400',
  },
  logoTextBold: {
    fontWeight: 'bold',
    color: '#3d85c6',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    padding: 16,
    justifyContent: 'flex-end',
    paddingBottom: 32,
  },
  featuredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  featuredBadge: {
    backgroundColor: '#3d85c6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  featuredText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  ratingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  genreContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  genreTag: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    marginRight: 8,
  },
  genreText: {
    color: '#fff',
    fontSize: 12,
  },
  heroDescription: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    opacity: 0.8,
  },
  nextEpisodeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  nextEpisodeBadge: {
    backgroundColor: 'rgba(61, 133, 198, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    marginRight: 10,
  },
  nextEpisodeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  heroActions: {
    flexDirection: 'row',
  },
  watchButton: {
    backgroundColor: '#3d85c6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginRight: 12,
  },
  watchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  watchlistButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  watchlistButtonActive: {
    backgroundColor: 'rgba(61, 133, 198, 0.5)',
  },
  watchlistButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
});