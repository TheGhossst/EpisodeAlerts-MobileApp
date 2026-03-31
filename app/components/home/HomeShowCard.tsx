import React from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import Animated, { SlideInRight } from 'react-native-reanimated';
import { Feather, FontAwesome } from '@expo/vector-icons';
import type { TVShow } from '@/app/services/TMDBService';
import type { Theme } from '@/app/context/ThemeContext';
import CachedImage from '@/components/CachedImage';
import { formatDate } from './_utils';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.42;
const CARD_HEIGHT = CARD_WIDTH * 1.5;

interface HomeShowCardProps {
  item: TVShow;
  index: number;
  sectionTitle: string;
  isInWatchlist: boolean;
  theme: Theme;
  airingTodayStatusText: string;
}

export default function HomeShowCard({
  item,
  index,
  sectionTitle,
  isInWatchlist,
  theme,
  airingTodayStatusText,
}: HomeShowCardProps) {
  const hasUpcoming = !!item.next_episode_to_air;
  const isAiringTodaySection = sectionTitle === 'Airing Today';

  return (
    <Animated.View
      entering={SlideInRight.delay(index * 100).duration(400)}
      style={styles.showCard}
    >
      <Link
        href={{
          pathname: '/show-details',
          params: { id: item.id.toString() },
        }}
        asChild
      >
        <Pressable
          style={StyleSheet.flatten([
            styles.showCardContent,
            { backgroundColor: theme.colors.card },
          ])}
        >
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
            <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={2}>
              {item.name}
            </Text>

            <Text style={[styles.cardYear, { color: theme.colors.textSecondary }]}> 
              {item.first_air_date ? new Date(item.first_air_date).getFullYear() : ''}
            </Text>

            {isAiringTodaySection ? (
              <Text style={[styles.cardUpcomingText, { color: theme.colors.primary }]} numberOfLines={1}>
                {airingTodayStatusText}
              </Text>
            ) : hasUpcoming ? (
              <Text style={[styles.cardUpcomingText, { color: theme.colors.primary }]} numberOfLines={1}>
                Next: {formatDate(item.next_episode_to_air?.air_date)}
              </Text>
            ) : (
              <Text style={[styles.cardUpcomingText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                No upcoming episode
              </Text>
            )}
          </View>

          {item.next_episode_to_air && !isAiringTodaySection && (
            <View style={styles.cardEpisodeBadge}>
              <Feather name="calendar" size={10} color="#FFF" />
              <Text style={styles.cardEpisodeText}>{formatDate(item.next_episode_to_air.air_date)}</Text>
            </View>
          )}
        </Pressable>
      </Link>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  showCard: {
    width: CARD_WIDTH,
    marginRight: 14,
    marginBottom: 2,
  },
  showCardContent: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  posterContainer: {
    width: '100%',
    height: CARD_HEIGHT * 0.72,
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
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 12,
    minHeight: 84,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    lineHeight: 18,
  },
  cardYear: {
    fontSize: 12,
    marginBottom: 6,
  },
  cardUpcomingText: {
    fontSize: 11,
    fontWeight: '600',
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
});