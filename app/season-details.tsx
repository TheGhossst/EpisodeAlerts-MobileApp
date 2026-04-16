import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import TMDBService, { Season, Episode } from "@/app/services/TMDBService";
import { TMDB_CONFIG } from "@/constants/Config";
import CachedImage from "@/components/CachedImage";
import { useTheme } from "@/app/context/ThemeContext";
import AnalyticsService from "@/app/services/AnalyticsService";
import StaleDataIndicator from "@/app/components/StaleDataIndicator";
import { useNetworkStatus } from "@/app/context/NetworkStatusContext";
import { reportError } from "@/app/utils/errorHandling";

export default function SeasonDetailsScreen() {
  const { theme } = useTheme();
  const { isOffline } = useNetworkStatus();
  const { id, season } = useLocalSearchParams<{ id: string; season: string }>();
  const [seasonDetails, setSeasonDetails] = useState<Season | null>(null);
  const [showName, setShowName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUsingStaleData, setIsUsingStaleData] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const loadData = useCallback(
    async (isManualRefresh = false) => {
      if (!id || !season) {
        setError("Missing required parameters. Please go back and try again.");
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      try {
        const showId = parseInt(id, 10);
        const seasonNumber = parseInt(season, 10);

        if (isNaN(showId) || isNaN(seasonNumber)) {
          throw new Error("Invalid show ID or season number");
        }

        setError(null);

        if (!isManualRefresh) {
          setIsLoading(true);
        }

        const [details, showDetails] = await Promise.all([
          TMDBService.getSeasonDetails(showId, seasonNumber),
          TMDBService.getTVShowDetails(showId),
        ]);

        setSeasonDetails(details);
        setShowName(showDetails.name);

        await AnalyticsService.trackScreenView("season-details", {
          showId: showId.toString(),
          seasonNumber: seasonNumber.toString(),
        });

        setIsUsingStaleData(TMDBService.consumeStaleFallbackFlag());
        setLastUpdatedAt(TMDBService.getLastCachedDataUpdatedAt());
      } catch (err) {
        const appError = reportError("SeasonDetailsScreen.loadData", err, {
          fallbackMessage: "Failed to load season details. Please try again.",
        });
        setError(
          isOffline
            ? "You are offline and this season is not available in cache yet."
            : appError.message,
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [id, season, isOffline],
  );

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    void loadData(true);
  };

  const getImageUrl = (path: string | null) => {
    if (!path) {
      return "";
    }

    return `${TMDB_CONFIG.IMAGE_BASE_URL}/${TMDB_CONFIG.POSTER_SIZES.MEDIUM}${path}`;
  };

  const handleImageError = () => {
    reportError(
      "SeasonDetailsScreen.handleImageError",
      new Error("Episode image failed to load"),
      {
        fallbackMessage: "Episode image could not be loaded.",
        trackAnalytics: false,
      },
    );
  };

  const handleBackPress = () => {
    if (id) {
      router.push({ pathname: "/show-details", params: { id } });
    } else {
      router.back();
    }
  };

  const renderEpisode = ({ item }: { item: Episode }) => (
    <View style={[styles.episodeCard, { backgroundColor: theme.colors.card }]}>
      {item.still_path ? (
        <CachedImage
          uri={getImageUrl(item.still_path)}
          style={styles.episodeImage}
          resizeMode="cover"
          onError={handleImageError}
        />
      ) : (
        <View
          style={[styles.noImage, { backgroundColor: theme.colors.surface }]}
        >
          <Text
            style={[styles.noImageText, { color: theme.colors.textSecondary }]}
          >
            No Image
          </Text>
        </View>
      )}

      <View style={styles.episodeInfo}>
        <Text style={[styles.episodeNumber, { color: theme.colors.primary }]}>
          Episode {item.episode_number}
        </Text>
        <Text style={[styles.episodeName, { color: theme.colors.text }]}>
          {item.name || "Untitled Episode"}
        </Text>
        <Text
          style={[styles.episodeDate, { color: theme.colors.textSecondary }]}
        >
          {item.air_date || "Air date unknown"}
        </Text>
        {item.overview ? (
          <Text
            style={[
              styles.episodeOverview,
              { color: theme.colors.textSecondary },
            ]}
            numberOfLines={2}
          >
            {item.overview}
          </Text>
        ) : (
          <Text
            style={[styles.noOverview, { color: theme.colors.textSecondary }]}
          >
            No overview available
          </Text>
        )}
        <View style={styles.ratingContainer}>
          <Text style={[styles.rating, { color: theme.colors.primary }]}>
            ★ {item.vote_average?.toFixed(1) || "N/A"}
          </Text>
        </View>
      </View>
    </View>
  );

  if (isLoading && !isRefreshing) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error || !seasonDetails) {
    return (
      <View
        style={[
          styles.errorContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {error || "Season details not found"}
        </Text>
        <TouchableOpacity
          style={[
            styles.backButton,
            { backgroundColor: theme.colors.secondary },
          ]}
          onPress={handleBackPress}
        >
          <Text style={[styles.backButtonText, { color: theme.colors.text }]}>
            Back to Show
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.retryButton,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => void loadData(false)}
        >
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
            backgroundColor: theme.colors.card,
          },
          headerTintColor: theme.colors.text,
        }}
      />
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
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
              <Text style={[styles.seasonName, { color: theme.colors.text }]}>
                {seasonDetails.name}
              </Text>
              <Text
                style={[
                  styles.episodeCount,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {seasonDetails.episodes?.length || 0} Episodes
              </Text>
              <Text
                style={[styles.airDate, { color: theme.colors.textSecondary }]}
              >
                {seasonDetails.air_date
                  ? `First aired: ${seasonDetails.air_date}`
                  : ""}
              </Text>
            </View>
          </View>

          {seasonDetails.overview ? (
            <View style={styles.overviewContainer}>
              <Text
                style={[styles.overviewTitle, { color: theme.colors.text }]}
              >
                Season Overview
              </Text>
              <Text
                style={[styles.overview, { color: theme.colors.textSecondary }]}
              >
                {seasonDetails.overview}
              </Text>
            </View>
          ) : null}
        </View>

        {isUsingStaleData ? (
          <StaleDataIndicator lastUpdatedAt={lastUpdatedAt} />
        ) : null}

        <Text style={[styles.episodesTitle, { color: theme.colors.text }]}>
          Episodes
        </Text>
        <FlatList
          data={seasonDetails.episodes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderEpisode}
          contentContainerStyle={styles.episodesList}
          ItemSeparatorComponent={() => (
            <View
              style={[
                styles.separator,
                { backgroundColor: theme.colors.border },
              ]}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                No episodes available
              </Text>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 4,
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 4,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  header: {
    padding: 16,
    marginBottom: 10,
  },
  seasonInfo: {
    flexDirection: "row",
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
    justifyContent: "center",
  },
  seasonName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  episodeCount: {
    fontSize: 16,
    marginBottom: 4,
  },
  airDate: {
    fontSize: 14,
  },
  overviewContainer: {
    marginTop: 8,
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  overview: {
    fontSize: 14,
    lineHeight: 20,
  },
  episodesTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginHorizontal: 16,
    marginBottom: 10,
  },
  episodesList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  episodeCard: {
    flexDirection: "row",
    borderRadius: 8,
    overflow: "hidden",
  },
  episodeImage: {
    width: 160,
    height: 90,
  },
  noImage: {
    width: 160,
    height: 90,
    justifyContent: "center",
    alignItems: "center",
  },
  noImageText: {
    fontSize: 12,
  },
  episodeInfo: {
    flex: 1,
    padding: 10,
  },
  episodeNumber: {
    fontSize: 14,
    marginBottom: 4,
    fontWeight: "700",
  },
  episodeName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 6,
  },
  episodeDate: {
    fontSize: 13,
    marginBottom: 6,
  },
  episodeOverview: {
    fontSize: 13,
    lineHeight: 18,
  },
  noOverview: {
    fontSize: 13,
    fontStyle: "italic",
  },
  ratingContainer: {
    marginTop: 6,
  },
  rating: {
    fontSize: 14,
    fontWeight: "bold",
  },
  separator: {
    height: 12,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
  },
});
