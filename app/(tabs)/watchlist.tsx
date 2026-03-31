import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Text,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useFocusEffect, Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { TVShow, Genre } from '@/app/services/TMDBService';
import WatchlistService from '@/app/services/WatchlistService';
import type { LastWatchedEpisode } from '@/app/services/WatchlistService';
import AnalyticsService, { EventType } from '@/app/services/AnalyticsService';
import { useTheme } from '@/app/context/ThemeContext';
import WatchlistHeader from '@/app/components/watchlist/WatchlistHeader';
import UpcomingEpisodeItem from '@/app/components/watchlist/UpcomingEpisodeItem';
import WatchlistShowCard from '@/app/components/watchlist/WatchlistShowCard';
import WatchlistEmptyState from '@/app/components/watchlist/WatchlistEmptyState';
import WatchlistFilterModal from '@/app/components/watchlist/WatchlistFilterModal';
import WatchlistSortModal from '@/app/components/watchlist/WatchlistSortModal';
import type { FilterOptions, SortConfig, SortOption } from '@/app/components/watchlist/_types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;
const CARD_ASPECT_RATIO = 1.62;
const CARD_HEIGHT = CARD_WIDTH * CARD_ASPECT_RATIO;

export default function WatchlistScreen() {
  const { theme } = useTheme();
  const [watchlist, setWatchlist] = useState<TVShow[]>([]);
  const [filteredWatchlist, setFilteredWatchlist] = useState<TVShow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ by: 'name', ascending: true });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ genres: [], status: [] });
  const [availableGenres, setAvailableGenres] = useState<Genre[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isSortModalVisible, setIsSortModalVisible] = useState(false);
  const [upcomingShows, setUpcomingShows] = useState<TVShow[]>([]);
  const [lastWatchedMap, setLastWatchedMap] = useState<Record<string, LastWatchedEpisode>>({});

  useFocusEffect(
    useCallback(() => {
      loadWatchlist();
    }, [])
  );

  useEffect(() => {
    AnalyticsService.trackScreenView('watchlist');
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [watchlist, filterOptions, sortConfig]);

  useEffect(() => {
    if (watchlist.length > 0) {
      const allGenres: Genre[] = [];
      const genreMap = new Map<number, Genre>();

      watchlist.forEach((show) => {
        show.genres?.forEach((genre) => {
          if (!genreMap.has(genre.id)) {
            genreMap.set(genre.id, genre);
          }
        });
      });

      genreMap.forEach((genre) => allGenres.push(genre));
      setAvailableGenres(allGenres);

      const statuses = [...new Set(watchlist.map((show) => show.status))].filter(Boolean) as string[];
      setAvailableStatuses(statuses);
    }
  }, [watchlist]);

  useEffect(() => {
    const shows = watchlist.filter((show) => show.next_episode_to_air);
    setUpcomingShows(shows);
  }, [watchlist]);

  const loadWatchlist = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [shows, progressMap] = await Promise.all([
        WatchlistService.getWatchlist(),
        WatchlistService.getLastWatchedEpisodes(),
      ]);
      setWatchlist(shows);
      setLastWatchedMap(progressMap);
    } catch (err) {
      console.error('Error loading watchlist:', err);
      setError('Failed to load your watchlist. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromWatchlist = async (id: number) => {
    try {
      const show = watchlist.find((s) => s.id === id);
      if (!show) {
        return;
      }

      Alert.alert(
        'Remove from Watchlist',
        `Do you want to remove "${show.name}" from your watchlist?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              const success = await WatchlistService.removeFromWatchlist(show.id);
              if (success) {
                setWatchlist((prev) => prev.filter((s) => s.id !== id));

                Toast.show({
                  type: 'success',
                  text1: 'Removed from Watchlist',
                  text2: `${show.name} has been removed from your watchlist`,
                  position: 'bottom',
                });

                await AnalyticsService.trackEvent(EventType.REMOVE_FROM_WATCHLIST, {
                  showId: id,
                  showName: show.name,
                });
              }
            },
          },
        ]
      );
    } catch (err) {
      console.error('Error removing from watchlist:', err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to remove from watchlist. Please try again.',
        position: 'bottom',
      });
    }
  };

  const clearWatchlist = async () => {
    if (watchlist.length === 0) {
      return;
    }

    Alert.alert(
      'Clear Watchlist',
      'Are you sure you want to clear your entire watchlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await WatchlistService.clearWatchlist();
              if (success) {
                setWatchlist([]);
                Toast.show({
                  type: 'success',
                  text1: 'Watchlist Cleared',
                  text2: 'Your watchlist has been cleared',
                  position: 'bottom',
                });
                await AnalyticsService.trackEvent(EventType.CHANGE_SETTINGS, {
                  action: 'clearWatchlist',
                });
              }
            } catch (clearError) {
              console.error('Error clearing watchlist:', clearError);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to clear watchlist. Please try again.',
                position: 'bottom',
              });
            }
          },
        },
      ]
    );
  };

  const applyFiltersAndSort = useCallback(() => {
    let filtered = [...watchlist];

    if (filterOptions.genres.length > 0) {
      filtered = filtered.filter((show) => show.genres?.some((genre) => filterOptions.genres.includes(genre.id)));
    }

    if (filterOptions.status.length > 0) {
      filtered = filtered.filter((show) => filterOptions.status.includes(show.status));
    }

    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortConfig.by) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;

        case 'date_added':
          comparison = b.id - a.id;
          break;

        case 'next_episode':
          if (a.next_episode_to_air && !b.next_episode_to_air) {
            comparison = -1;
          } else if (!a.next_episode_to_air && b.next_episode_to_air) {
            comparison = 1;
          } else if (a.next_episode_to_air && b.next_episode_to_air) {
            const dateA = new Date(a.next_episode_to_air.air_date).getTime();
            const dateB = new Date(b.next_episode_to_air.air_date).getTime();
            comparison = dateA - dateB;
          }
          break;
      }

      return sortConfig.ascending ? comparison : -comparison;
    });

    setFilteredWatchlist(filtered);
  }, [watchlist, filterOptions, sortConfig]);

  const toggleGenreFilter = (genreId: number) => {
    setFilterOptions((prev) => {
      const isSelected = prev.genres.includes(genreId);
      const newGenres = isSelected ? prev.genres.filter((id) => id !== genreId) : [...prev.genres, genreId];

      return { ...prev, genres: newGenres };
    });
  };

  const toggleStatusFilter = (status: string) => {
    setFilterOptions((prev) => {
      const isSelected = prev.status.includes(status);
      const newStatuses = isSelected ? prev.status.filter((s) => s !== status) : [...prev.status, status];

      return { ...prev, status: newStatuses };
    });
  };

  const clearFilters = () => {
    setFilterOptions({ genres: [], status: [] });
  };

  const handleSort = (by: SortOption) => {
    setSortConfig((prev) => ({
      by,
      ascending: prev.by === by ? !prev.ascending : true,
    }));
    setIsSortModalVisible(false);
  };

  const renderUpcomingItem = ({ item, index }: { item: TVShow; index: number }) => (
    <UpcomingEpisodeItem item={item} index={index} theme={theme} />
  );

  const renderWatchlistItem = ({ item, index }: { item: TVShow; index: number }) => (
    <WatchlistShowCard
      item={item}
      index={index}
      theme={theme}
      cardWidth={CARD_WIDTH}
      cardHeight={CARD_HEIGHT}
      lastWatched={lastWatchedMap[String(item.id)]}
      onRemove={removeFromWatchlist}
    />
  );

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        <WatchlistHeader showCount={watchlist.length} theme={theme} onAddShowsPress={() => router.push('/search')} />

        {upcomingShows.length > 0 && (
          <View style={styles.upcomingSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Upcoming Episodes</Text>
            </View>

            <FlatList
              data={upcomingShows}
              keyExtractor={(item) => `upcoming-${item.id}`}
              renderItem={renderUpcomingItem}
              scrollEnabled={false}
            />
          </View>
        )}

        <View style={styles.showsSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>My Shows</Text>

          {watchlist.length === 0 ? (
            <WatchlistEmptyState theme={theme} />
          ) : (
            <FlatList
              data={filteredWatchlist}
              keyExtractor={(item) => `show-${item.id}`}
              renderItem={renderWatchlistItem}
              numColumns={2}
              scrollEnabled={false}
              columnWrapperStyle={styles.columnWrapper}
            />
          )}

          {error && <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>}
        </View>
      </ScrollView>

      <Toast />

      <WatchlistFilterModal
        visible={isFilterModalVisible}
        theme={theme}
        availableGenres={availableGenres}
        availableStatuses={availableStatuses}
        filterOptions={filterOptions}
        onClose={() => setIsFilterModalVisible(false)}
        onToggleGenre={toggleGenreFilter}
        onToggleStatus={toggleStatusFilter}
        onClearFilters={clearFilters}
      />

      <WatchlistSortModal
        visible={isSortModalVisible}
        theme={theme}
        sortConfig={sortConfig}
        onClose={() => setIsSortModalVisible(false)}
        onSort={handleSort}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  upcomingSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  showsSection: {
    paddingHorizontal: 16,
    marginBottom: 30,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '600',
  },
});