import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
  View,
  Text,
  Pressable,
  Dimensions,
  StatusBar,
  ImageBackground,
} from 'react-native';
import TMDBService, { TVShow } from '@/app/services/TMDBService';
import { useTheme } from '@/app/context/ThemeContext';
import WatchlistService from '@/app/services/WatchlistService';
import Animated, { FadeInDown, FadeIn, SlideInRight } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import AnalyticsService, { EventType } from '@/app/services/AnalyticsService';
import { SkeletonBanner, SkeletonList } from '@/app/components/SkeletonLoader';
import { Ionicons, Feather, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, Stack, useFocusEffect } from 'expo-router';
import CachedImage from '@/components/CachedImage';
import EpisodeCountdown from '@/app/components/EpisodeCountdown';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.42;
const CARD_HEIGHT = CARD_WIDTH * 1.5;
const BANNER_HEIGHT = height * 0.55;

export default function HomeScreen() {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [featuredShow, setFeaturedShow] = useState<TVShow | null>(null);
  const [popularShows, setPopularShows] = useState<TVShow[]>([]);
  const [topRatedShows, setTopRatedShows] = useState<TVShow[]>([]);
  const [airingTodayShows, setAiringTodayShows] = useState<TVShow[]>([]);
  const [watchlist, setWatchlist] = useState<number[]>([]);
  const [recentlyViewedShows, setRecentlyViewedShows] = useState<TVShow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadWatchlist();
    }, [])
  );

  useEffect(() => {
    loadData();
    loadWatchlist();
    AnalyticsService.trackScreenView('home');
  }, []);

  const loadWatchlist = async () => {
    try {
      const watchlistShows = await WatchlistService.getWatchlist();
      setWatchlist(watchlistShows.map(show => show.id));
      
      if (watchlistShows.length > 0) {
        setRecentlyViewedShows(watchlistShows.slice(0, 3));
      } else {
        setRecentlyViewedShows([]);
      }
    } catch (err) {
      console.error('Error loading watchlist:', err);
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const popularResponse = await TMDBService.getPopularTVShows();
      if (popularResponse.results.length === 0) {
        throw new Error('No popular shows found');
      }
      setPopularShows(popularResponse.results);
      
      const topFiveShows = popularResponse.results.slice(0, 5);
      const randomIndex = Math.floor(Math.random() * topFiveShows.length);
      const selectedShow = topFiveShows[randomIndex];
      
      const detailedShow = await TMDBService.getTVShowDetails(selectedShow.id);
      setFeaturedShow(detailedShow);

      const topRatedResponse = await TMDBService.getTopRatedTVShows();
      setTopRatedShows(topRatedResponse.results);

      const airingTodayResponse = await TMDBService.getTVShowsAiringToday();
      setAiringTodayShows(airingTodayResponse.results);

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load TV show data. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
    loadWatchlist();
  };

  const handleToggleWatchlist = async (show: TVShow) => {
    try {
      const isInWatchlist = watchlist.includes(show.id);
      
      if (isInWatchlist) {
        await WatchlistService.removeFromWatchlist(show.id);
        setWatchlist(prev => prev.filter(id => id !== show.id));
        
        // Also remove from recently viewed shows if present
        setRecentlyViewedShows(prev => prev.filter(s => s.id !== show.id));
        
        Toast.show({
          type: 'success',
          text1: 'Removed from Watchlist',
          text2: `${show.name} has been removed from your watchlist`,
          position: 'bottom',
        });
        await AnalyticsService.trackEvent(EventType.REMOVE_FROM_WATCHLIST, { showId: show.id, showName: show.name });
      } else {
        await WatchlistService.addToWatchlist(show);
        setWatchlist(prev => [...prev, show.id]);
        
        const updatedRecentlyViewed = [show, ...recentlyViewedShows.filter(s => s.id !== show.id)].slice(0, 3);
        setRecentlyViewedShows(updatedRecentlyViewed);
        
        Toast.show({
          type: 'success',
          text1: 'Added to Watchlist',
          text2: `${show.name} has been added to your watchlist`,
          position: 'bottom',
        });
        await AnalyticsService.trackEvent(EventType.ADD_TO_WATCHLIST, { showId: show.id, showName: show.name });
      }
    } catch (err) {
      console.error('Error toggling watchlist:', err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update watchlist. Please try again.',
        position: 'bottom',
      });
    }
  };

  const truncateText = (text: string, length: number) => {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderFeaturedShow = () => {
    if (!featuredShow) return null;

    const isInWatchlist = watchlist.includes(featuredShow.id);
    
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
                
                <Text style={styles.heroDescription}>
                  {truncateText(featuredShow.overview, 150)}
                </Text>
                
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
                  <Link href={{ pathname: '/show-details', params: { id: featuredShow.id.toString() } }} asChild>
                    <Pressable style={styles.watchButton}>
                      <Ionicons name="information-circle-outline" size={20} color="#FFF" />
                      <Text style={styles.watchButtonText}>Details</Text>
                    </Pressable>
                  </Link>
                  
                  <Pressable 
                    style={[
                      styles.watchlistButton,
                      isInWatchlist ? styles.watchlistButtonActive : null
                    ]}
                    onPress={() => handleToggleWatchlist(featuredShow)}
                  >
                    <Ionicons 
                      name={isInWatchlist ? "bookmark" : "bookmark-outline"} 
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
  };

  const renderShowItem = ({ item, index, sectionTitle }: { item: TVShow, index: number, sectionTitle: string }) => {
    const isInWatchlist = watchlist.includes(item.id);

    return (
      <Animated.View 
        entering={SlideInRight.delay(index * 100).duration(400)} 
        style={styles.showCard}
      >
        <Link href={{ pathname: '/show-details', params: { id: item.id.toString() } }} asChild>
          <Pressable style={styles.showCardContent}>
            <View style={styles.posterContainer}>
              <CachedImage
                uri={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
                style={styles.posterImage}
                showLoader={true}
              />

              {isInWatchlist && (
                <View style={styles.bookmarkBadge}>
                  <FontAwesome name="bookmark" size={14} color="#fff" />
                </View>
              )}

              <View style={styles.cardRating}>
                <FontAwesome name="star" size={10} color="#FFD700" />
                <Text style={styles.cardRatingText}>{item.vote_average?.toFixed(1)}</Text>
              </View>
            </View>

            <View style={styles.cardDetails}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.name}
              </Text>
              
              <Text style={styles.cardYear}>
                {item.first_air_date ? new Date(item.first_air_date).getFullYear() : ''}
              </Text>
            </View>
            
            {item.next_episode_to_air && (
              <View style={styles.cardEpisodeBadge}>
                <Feather name="calendar" size={10} color="#FFF" />
                <Text style={styles.cardEpisodeText}>
                  {formatDate(item.next_episode_to_air.air_date)}
                </Text>
              </View>
            )}
          </Pressable>
        </Link>
      </Animated.View>
    );
  };

  const renderShowSection = (title: string, shows: TVShow[]) => {
    if (!shows || shows.length === 0) return null;

    return (
      <Animated.View entering={FadeInDown.duration(400)} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Feather name="chevron-right" size={20} color="#fff" />
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.showsScrollContainer}
        >
          {shows.map((show, index) => (
            <React.Fragment key={`${title}-${show.id}`}>
              {renderShowItem({ item: show, index, sectionTitle: title })}
            </React.Fragment>
          ))}
        </ScrollView>
      </Animated.View>
    );
  };

  const renderContent = () => {
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#e74c3c" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    if (isLoading && !isRefreshing) {
      return (
        <View style={styles.skeletonContainer}>
          <SkeletonBanner />
          <SkeletonList />
          <SkeletonList />
          <SkeletonList />
        </View>
      );
    }

    return (
      <>
        {renderFeaturedShow()}
        
        <View style={styles.content}>
          {renderShowSection('Airing Today', airingTodayShows)}
          {renderShowSection('Popular Shows', popularShows)}
          {renderShowSection('Top Rated', topRatedShows)}
          
          {recentlyViewedShows.length > 0 && (
            <Link href="/watchlist" asChild>
              <Pressable style={styles.watchlistButton}>
                <Text style={styles.watchlistButtonText}>View My Watchlist</Text>
                <Feather name="chevron-right" size={16} color="#fff" />
              </Pressable>
            </Link>
          )}
        </View>
      </>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={isRefreshing} 
              onRefresh={handleRefresh} 
              tintColor="#fff"
              colors={["#fff"]}
              progressBackgroundColor="rgba(0,0,0,0.2)"
            />
          }
        >
          {renderContent()}
        </ScrollView>
        
        <Toast />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090b13',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  content: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  skeletonContainer: {
    paddingTop: 60,
  },
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
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  showsScrollContainer: {
    paddingHorizontal: 16,
  },
  showCard: {
    width: CARD_WIDTH,
    marginRight: 14,
  },
  showCardContent: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1f2937',
  },
  posterContainer: {
    width: '100%',
    height: CARD_HEIGHT * 0.75,
    position: 'relative',
  },
  posterImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  bookmarkBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(61, 133, 198, 0.8)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardRating: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  cardRatingText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 3,
  },
  cardDetails: {
    padding: 10,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  cardYear: {
    color: '#ccc',
    fontSize: 12,
  },
  cardEpisodeBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(61, 133, 198, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  cardEpisodeText: {
    color: '#fff',
    fontSize: 9,
    marginLeft: 3,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 100,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3d85c6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});