import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Link, useFocusEffect, Stack } from 'expo-router';
import { TVShow, Genre } from '@/app/services/TMDBService';
import WatchlistService from '@/app/services/WatchlistService';
import { TMDB_CONFIG } from '@/constants/Config';
import { useTheme } from '@/app/context/ThemeContext';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import ShowCard from '@/components/ShowCard';
import ShowList from '@/components/ShowList';
import Toast from 'react-native-toast-message';
import AnalyticsService, { EventType } from '@/app/services/AnalyticsService';
import Animated, { FadeIn, SlideInRight, SlideOutRight, FadeInDown } from 'react-native-reanimated';
import EpisodeCountdown from '@/app/components/EpisodeCountdown';
import CachedImage from '@/components/CachedImage';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;
const CARD_ASPECT_RATIO = 1.5;
const CARD_HEIGHT = CARD_WIDTH * CARD_ASPECT_RATIO;

type SortOption = 'name' | 'date_added' | 'next_episode';
interface SortConfig {
  by: SortOption;
  ascending: boolean;
}

interface FilterOptions {
  genres: number[];
  status: string[];
}

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [upcomingShows, setUpcomingShows] = useState<TVShow[]>([]);

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
      
      watchlist.forEach(show => {
        show.genres?.forEach(genre => {
          if (!genreMap.has(genre.id)) {
            genreMap.set(genre.id, genre);
          }
        });
      });
      
      genreMap.forEach(genre => allGenres.push(genre));
      setAvailableGenres(allGenres);
      
      const statuses = [...new Set(watchlist.map(show => show.status))].filter(Boolean) as string[];
      setAvailableStatuses(statuses);
    }
  }, [watchlist]);

  useEffect(() => {
    const shows = watchlist.filter(show => show.next_episode_to_air);
    setUpcomingShows(shows);
  }, [watchlist]);

  const loadWatchlist = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const shows = await WatchlistService.getWatchlist();
      setWatchlist(shows);
    } catch (err) {
      console.error('Error loading watchlist:', err);
      setError('Failed to load your watchlist. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromWatchlist = async (id: number) => {
    try {
      const show = watchlist.find(s => s.id === id);
      if (!show) return;
      
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
                setWatchlist(prev => prev.filter(s => s.id !== id));
                
                Toast.show({
                  type: 'success',
                  text1: 'Removed from Watchlist',
                  text2: `${show.name} has been removed from your watchlist`,
                  position: 'bottom',
                });
                
                await AnalyticsService.trackEvent(
                  EventType.REMOVE_FROM_WATCHLIST, 
                  { showId: id, showName: show.name }
                );
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
    if (watchlist.length === 0) return;
    
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
                await AnalyticsService.trackEvent(EventType.CHANGE_SETTINGS, { action: 'clearWatchlist' });
              }
            } catch (error) {
              console.error('Error clearing watchlist:', error);
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
      filtered = filtered.filter(show => 
        show.genres?.some(genre => filterOptions.genres.includes(genre.id))
      );
    }
    
    if (filterOptions.status.length > 0) {
      filtered = filtered.filter(show => 
        filterOptions.status.includes(show.status)
      );
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
          } 
          else if (!a.next_episode_to_air && b.next_episode_to_air) {
            comparison = 1;
          } 
          else if (a.next_episode_to_air && b.next_episode_to_air) {
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
    setFilterOptions(prev => {
      const isSelected = prev.genres.includes(genreId);
      const newGenres = isSelected 
        ? prev.genres.filter(id => id !== genreId)
        : [...prev.genres, genreId];
        
      return { ...prev, genres: newGenres };
    });
  };

  const toggleStatusFilter = (status: string) => {
    setFilterOptions(prev => {
      const isSelected = prev.status.includes(status);
      const newStatuses = isSelected 
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status];
        
      return { ...prev, status: newStatuses };
    });
  };

  const clearFilters = () => {
    setFilterOptions({ genres: [], status: [] });
  };

  const handleSort = (by: SortOption) => {
    setSortConfig(prev => ({
      by,
      ascending: prev.by === by ? !prev.ascending : true
    }));
    setIsSortModalVisible(false);
  };

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
    AnalyticsService.trackEvent(EventType.CHANGE_SETTINGS, { 
      setting: 'watchlistViewMode', 
      value: viewMode === 'grid' ? 'list' : 'grid' 
    });
  };

  const formatEpisodeText = (episode: any) => {
    if (!episode) return '';
    return `S${episode.season_number} E${episode.episode_number}`;
  };

  const renderUpcomingItem = ({ item, index }: { item: TVShow, index: number }) => {
    if (!item.next_episode_to_air) return null;
    
    return (
      <Animated.View 
        entering={FadeInDown.delay(index * 100).duration(400)}
        style={[styles.upcomingItem, { backgroundColor: theme.colors.card }]}
      >
        <View style={styles.upcomingItemContent}>
          <CachedImage
            uri={`https://image.tmdb.org/t/p/w185${item.poster_path}`}
            style={styles.upcomingImage}
            resizeMode="cover"
          />
          
          <View style={styles.upcomingInfo}>
            <Text style={[styles.upcomingShowTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.upcomingEpisodeInfo, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {formatEpisodeText(item.next_episode_to_air)} - {item.next_episode_to_air.name}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.upcomingDate, { color: theme.colors.primary }]}>
          {item.next_episode_to_air.air_date}
        </Text>
      </Animated.View>
    );
  };

  const renderWatchlistItem = ({ item, index }: { item: TVShow, index: number }) => {
    const hasNextEpisode = !!item.next_episode_to_air;
    
    return (
      <Animated.View 
        entering={FadeInDown.delay(index * 100).duration(400)}
        style={styles.cardContainer}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={() => removeFromWatchlist(item.id)}
          style={[styles.card, { backgroundColor: theme.colors.card }]}
        >
          <Link href={{ pathname: '/show-details', params: { id: item.id.toString() } }} asChild>
            <TouchableOpacity activeOpacity={0.9} style={styles.cardContent}>
              <View style={styles.cardImageContainer}>
                <CachedImage
                  uri={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
                
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.ratingText}>
                    {item.vote_average?.toFixed(1)}
                  </Text>
                </View>
                
                <View style={styles.bookmarkIcon}>
                  <Ionicons name="bookmark" size={20} color={theme.colors.primary} />
                </View>
              </View>
              
              {hasNextEpisode && item.next_episode_to_air && (
                <View style={styles.episodeInfo}>
                  <View style={styles.episodeHeader}>
                    <Text style={styles.nextEpisodeLabel}>Next Episode</Text>
                    <Text style={styles.episodeNumber}>{formatEpisodeText(item.next_episode_to_air)}</Text>
                  </View>
                  
                  <Text style={styles.episodeTitle} numberOfLines={1}>
                    {item.next_episode_to_air.name}
                  </Text>
                  
                  <Text style={styles.episodeDate}>
                    {item.next_episode_to_air.air_date}
                  </Text>
                  
                  <View style={styles.countdownContainer}>
                    <CountdownTimer airDate={item.next_episode_to_air.air_date} />
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </Link>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const CountdownTimer = ({ airDate }: { airDate: string }) => {
    const [timeLeft, setTimeLeft] = useState<string>('');
    
    useEffect(() => {
      const calculateTimeLeft = () => {
        const now = new Date().getTime();
        const airDateTime = new Date(airDate).getTime();
        const difference = airDateTime - now;
        
        if (difference <= 0) {
          setTimeLeft('Aired');
          return;
        }
        
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        if (days > 0) {
          setTimeLeft(`${days}d ${hours}:${minutes}:${seconds}`);
        } else {
          setTimeLeft(`${hours}:${minutes}:${seconds}`);
        }
      };
      
      calculateTimeLeft();
      const timer = setInterval(calculateTimeLeft, 1000);
      
      return () => clearInterval(timer);
    }, [airDate]);
    
    return (
      <Text style={styles.countdownText}>{timeLeft}</Text>
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={isFilterModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setIsFilterModalVisible(false)}
    >
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <Animated.View 
          style={[
            styles.modalContent, 
            { backgroundColor: theme.colors.card }
          ]}
          entering={SlideInRight.duration(300)}
          exiting={SlideOutRight.duration(300)}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Filter Shows</Text>
            <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalScrollContent}>
            {availableGenres.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={[styles.filterTitle, { color: theme.colors.text }]}>Genres</Text>
                <View style={styles.filterOptionsContainer}>
                  {availableGenres.map(genre => (
                    <TouchableOpacity
                      key={genre.id}
                      style={[
                        styles.filterChip,
                        { 
                          backgroundColor: filterOptions.genres.includes(genre.id) 
                            ? theme.colors.primary 
                            : theme.colors.secondary 
                        }
                      ]}
                      onPress={() => toggleGenreFilter(genre.id)}
                    >
                      <Text 
                        style={[
                          styles.filterChipText, 
                          { 
                            color: filterOptions.genres.includes(genre.id) 
                              ? '#FFF' 
                              : theme.colors.text 
                          }
                        ]}
                      >
                        {genre.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            
            {availableStatuses.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={[styles.filterTitle, { color: theme.colors.text }]}>Status</Text>
                <View style={styles.filterOptionsContainer}>
                  {availableStatuses.map(status => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterChip,
                        { 
                          backgroundColor: filterOptions.status.includes(status) 
                            ? theme.colors.primary 
                            : theme.colors.secondary 
                        }
                      ]}
                      onPress={() => toggleStatusFilter(status)}
                    >
                      <Text 
                        style={[
                          styles.filterChipText, 
                          { 
                            color: filterOptions.status.includes(status) 
                              ? '#FFF' 
                              : theme.colors.text 
                          }
                        ]}
                      >
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={[styles.footerButton, { borderColor: theme.colors.border }]}
              onPress={clearFilters}
            >
              <Text style={[styles.footerButtonText, { color: theme.colors.text }]}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.footerButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setIsFilterModalVisible(false)}
            >
              <Text style={[styles.footerButtonText, { color: '#FFF' }]}>Apply</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );

  const renderSortModal = () => (
    <Modal
      visible={isSortModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setIsSortModalVisible(false)}
    >
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <Animated.View 
          style={[
            styles.modalContent, 
            styles.sortModalContent,
            { backgroundColor: theme.colors.card }
          ]}
          entering={SlideInRight.duration(300)}
          exiting={SlideOutRight.duration(300)}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Sort By</Text>
            <TouchableOpacity onPress={() => setIsSortModalVisible(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.sortOptions}>
            <TouchableOpacity 
              style={styles.sortOption}
              onPress={() => handleSort('name')}
            >
              <Text style={[styles.sortOptionText, { color: theme.colors.text }]}>
                Show Name
              </Text>
              {sortConfig.by === 'name' && (
                <Ionicons 
                  name={sortConfig.ascending ? "arrow-up" : "arrow-down"} 
                  size={18} 
                  color={theme.colors.primary} 
                />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.sortOption}
              onPress={() => handleSort('date_added')}
            >
              <Text style={[styles.sortOptionText, { color: theme.colors.text }]}>
                Date Added
              </Text>
              {sortConfig.by === 'date_added' && (
                <Ionicons 
                  name={sortConfig.ascending ? "arrow-up" : "arrow-down"} 
                  size={18} 
                  color={theme.colors.primary} 
                />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.sortOption}
              onPress={() => handleSort('next_episode')}
            >
              <Text style={[styles.sortOptionText, { color: theme.colors.text }]}>
                Next Episode
              </Text>
              {sortConfig.by === 'next_episode' && (
                <Ionicons 
                  name={sortConfig.ascending ? "arrow-up" : "arrow-down"} 
                  size={18} 
                  color={theme.colors.primary} 
                />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
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
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              My Watchlist
            </Text>
            <Text style={[styles.showCount, { color: theme.colors.textSecondary }]}>
              {watchlist.length} {watchlist.length === 1 ? 'show' : 'shows'}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: theme.colors.card }]}
            onPress={() => {
              Toast.show({
                type: 'info',
                text1: 'Add Shows',
                text2: 'Search for shows to add to your watchlist',
                position: 'bottom',
              });
            }}
          >
            <Ionicons name="add" size={20} color={theme.colors.text} />
            <Text style={[styles.addButtonText, { color: theme.colors.text }]}>Add Shows</Text>
          </TouchableOpacity>
        </View>
        
        {upcomingShows.length > 0 && (
          <View style={styles.upcomingSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Upcoming Episodes
              </Text>
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
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            My Shows
          </Text>
          
          {watchlist.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="tv-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>
                Your watchlist is empty
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: theme.colors.textSecondary }]}>
                Add shows to keep track of your favorites
              </Text>
              <Link href="/search" asChild>
                <TouchableOpacity 
                  style={[styles.emptyStateButton, { backgroundColor: theme.colors.primary }]}
                >
                  <Text style={styles.emptyStateButtonText}>Discover Shows</Text>
                </TouchableOpacity>
              </Link>
            </View>
          ) : (
            <FlatList
              data={watchlist}
              keyExtractor={(item) => `show-${item.id}`}
              renderItem={renderWatchlistItem}
              numColumns={2}
              scrollEnabled={false}
              columnWrapperStyle={styles.columnWrapper}
            />
          )}
        </View>
      </ScrollView>
      
      <Toast />
      
      {renderFilterModal()}
      {renderSortModal()}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  showCount: {
    fontSize: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
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
  upcomingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  upcomingItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  upcomingImage: {
    width: 40,
    height: 60,
    borderRadius: 6,
  },
  upcomingInfo: {
    marginLeft: 12,
    flex: 1,
  },
  upcomingShowTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  upcomingEpisodeInfo: {
    fontSize: 14,
  },
  upcomingDate: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  showsSection: {
    paddingHorizontal: 16,
    marginBottom: 30,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  cardContainer: {
    width: CARD_WIDTH,
    marginBottom: 16,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    height: CARD_HEIGHT,
  },
  cardContent: {
    flex: 1,
  },
  cardImageContainer: {
    height: '60%',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  bookmarkIcon: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  episodeInfo: {
    padding: 10,
    height: '40%',
    justifyContent: 'space-between',
  },
  episodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextEpisodeLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.7,
  },
  episodeNumber: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
    backgroundColor: 'rgba(230, 30, 40, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  episodeTitle: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  episodeDate: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.7,
  },
  countdownContainer: {
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxHeight: '80%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  sortModalContent: {
    width: '70%',
    maxHeight: 'auto',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalScrollContent: {
    padding: 16,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  filterOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  filterChipText: {
    fontSize: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  footerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  footerButtonText: {
    fontWeight: 'bold',
  },
  sortOptions: {
    padding: 16,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  sortOptionText: {
    fontSize: 16,
  },
}); 