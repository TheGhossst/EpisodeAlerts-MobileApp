import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
  View,
  Text,
  Pressable,
} from 'react-native';
import TMDBService, { TVShow } from '@/app/services/TMDBService';
import { useTheme } from '@/app/context/ThemeContext';
import WatchlistService from '@/app/services/WatchlistService';
import Toast from 'react-native-toast-message';
import AnalyticsService, { EventType } from '@/app/services/AnalyticsService';
import { SkeletonBanner, SkeletonList } from '@/app/components/SkeletonLoader';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Link, Stack, useFocusEffect } from 'expo-router';
import HomeFeaturedBanner from '@/app/components/home/HomeFeaturedBanner';
import HomeShowSection from '@/app/components/home/HomeShowSection';
import { getAiringTodayStatusText } from '@/app/components/home/_utils';

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
  const [clockTick, setClockTick] = useState<number>(Date.now());

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

  useEffect(() => {
    const timer = setInterval(() => {
      setClockTick(Date.now());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const loadWatchlist = async () => {
    try {
      const watchlistShows = await WatchlistService.getWatchlist();
      setWatchlist(watchlistShows.map((show) => show.id));

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
        setWatchlist((prev) => prev.filter((id) => id !== show.id));
        setRecentlyViewedShows((prev) => prev.filter((s) => s.id !== show.id));

        Toast.show({
          type: 'success',
          text1: 'Removed from Watchlist',
          text2: `${show.name} has been removed from your watchlist`,
          position: 'bottom',
        });
        await AnalyticsService.trackEvent(EventType.REMOVE_FROM_WATCHLIST, {
          showId: show.id,
          showName: show.name,
        });
      } else {
        await WatchlistService.addToWatchlist(show);
        setWatchlist((prev) => [...prev, show.id]);

        const updatedRecentlyViewed = [
          show,
          ...recentlyViewedShows.filter((s) => s.id !== show.id),
        ].slice(0, 3);
        setRecentlyViewedShows(updatedRecentlyViewed);

        Toast.show({
          type: 'success',
          text1: 'Added to Watchlist',
          text2: `${show.name} has been added to your watchlist`,
          position: 'bottom',
        });
        await AnalyticsService.trackEvent(EventType.ADD_TO_WATCHLIST, {
          showId: show.id,
          showName: show.name,
        });
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

  const airingTodayStatusText = getAiringTodayStatusText(clockTick);

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
        {featuredShow && (
          <HomeFeaturedBanner
            featuredShow={featuredShow}
            isInWatchlist={watchlist.includes(featuredShow.id)}
            onToggleWatchlist={handleToggleWatchlist}
          />
        )}

        <View style={styles.content}>
          <HomeShowSection
            title="Airing Today"
            shows={airingTodayShows}
            watchlistIds={watchlist}
            theme={theme}
            airingTodayStatusText={airingTodayStatusText}
          />
          <HomeShowSection
            title="Popular Shows"
            shows={popularShows}
            watchlistIds={watchlist}
            theme={theme}
            airingTodayStatusText={airingTodayStatusText}
          />
          <HomeShowSection
            title="Top Rated"
            shows={topRatedShows}
            watchlistIds={watchlist}
            theme={theme}
            airingTodayStatusText={airingTodayStatusText}
          />

          {recentlyViewedShows.length > 0 && (
            <Link href="/watchlist" asChild>
              <Pressable style={styles.watchlistCtaButton}>
                <Text style={styles.watchlistCtaText}>View My Watchlist</Text>
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
              colors={['#fff']}
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
  watchlistCtaButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginHorizontal: 16,
  },
  watchlistCtaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 6,
  },
});