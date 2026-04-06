import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { TVShow } from '@/app/services/TMDBService';
import type { Theme } from '@/app/context/ThemeContext';
import type { LastWatchedEpisode } from '@/app/services/WatchlistService';
import CachedImage from '@/components/CachedImage';
import { formatEpisodeText } from './_utils';

interface WatchlistShowCardProps {
  item: TVShow;
  index: number;
  theme: Theme;
  cardWidth: number;
  cardHeight: number;
  viewMode: 'grid' | 'list';
  lastWatched?: LastWatchedEpisode;
  onRemove: (showId: number) => void;
}

function CountdownTimer({ airDate, color }: { airDate: string; color: string }) {
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

  return <Text style={[styles.countdownText, { color }]}>{timeLeft}</Text>;
}

export default function WatchlistShowCard({
  item,
  index,
  theme,
  cardWidth,
  cardHeight,
  viewMode,
  lastWatched,
  onRemove,
}: WatchlistShowCardProps) {
  const hasNextEpisode = !!item.next_episode_to_air;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).duration(400)}
      style={[styles.cardContainer, { width: cardWidth }, viewMode === 'list' ? styles.listCardContainer : null]}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={() => onRemove(item.id)}
        style={[styles.card, { backgroundColor: theme.colors.card, height: cardHeight }]}
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
                <Text style={styles.ratingText}>{item.vote_average?.toFixed(1)}</Text>
              </View>

              <View style={styles.bookmarkIcon}>
                <Ionicons name="bookmark" size={20} color={theme.colors.primary} />
              </View>
            </View>

            <View style={styles.episodeInfo}>
              <Text style={[styles.cardShowTitle, { color: theme.colors.text }]} numberOfLines={2}>
                {item.name}
              </Text>

              {lastWatched ? (
                <Text style={[styles.resumeText, { color: theme.colors.primary }]} numberOfLines={1}>
                  Resume from S{lastWatched.seasonNumber}E{lastWatched.episodeNumber}
                </Text>
              ) : (
                <Text style={[styles.noProgressText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  No progress tracked yet
                </Text>
              )}

              {hasNextEpisode && item.next_episode_to_air ? (
                <>
                  <View style={styles.episodeHeader}>
                    <Text style={[styles.nextEpisodeLabel, { color: theme.colors.textSecondary }]}>
                      Next Episode
                    </Text>
                    <Text style={[styles.episodeNumber, { backgroundColor: theme.colors.primary }]}>
                      {formatEpisodeText(item.next_episode_to_air)}
                    </Text>
                  </View>

                  <Text style={[styles.episodeTitle, { color: theme.colors.text }]} numberOfLines={1}>
                    {item.next_episode_to_air.name}
                  </Text>

                  <Text style={[styles.episodeDate, { color: theme.colors.textSecondary }]}>
                    {item.next_episode_to_air.air_date}
                  </Text>

                  <View
                    style={[
                      styles.countdownContainer,
                      {
                        backgroundColor: theme.dark
                          ? 'rgba(255,255,255,0.08)'
                          : 'rgba(0,0,0,0.06)',
                      },
                    ]}
                  >
                    <CountdownTimer airDate={item.next_episode_to_air.air_date} color={theme.colors.primary} />
                  </View>
                </>
              ) : (
                <Text style={[styles.noUpcomingText, { color: theme.colors.textSecondary }]}>
                  No upcoming episodes scheduled
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </Link>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 16,
  },
  listCardContainer: {
    alignSelf: 'center',
  },
  card: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
  },
  cardImageContainer: {
    height: '52%',
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
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 12,
    height: '48%',
    justifyContent: 'flex-start',
  },
  cardShowTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  resumeText: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  noProgressText: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 8,
    opacity: 0.85,
  },
  episodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nextEpisodeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  episodeNumber: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  episodeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  episodeDate: {
    fontSize: 12,
    marginBottom: 8,
  },
  countdownContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 6,
  },
  countdownText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  noUpcomingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});