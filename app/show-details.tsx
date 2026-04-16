import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Dimensions,
  Linking,
} from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import TMDBService, {
  TVShow,
  Season,
  Episode,
} from "@/app/services/TMDBService";
import WatchlistService from "@/app/services/WatchlistService";
import type {
  LastWatchedEpisode,
  WatchHistoryEntry,
} from "@/app/services/WatchlistService";
import NotificationService from "@/app/services/NotificationService";
import AnalyticsService, { EventType } from "@/app/services/AnalyticsService";
import CalendarService, {
  CalendarServiceError,
} from "@/app/services/CalendarService";
import { TMDB_CONFIG } from "@/constants/Config";
import { LinearGradient } from "expo-linear-gradient";
import CachedImage from "@/components/CachedImage";
import { useTheme } from "@/app/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SkeletonDetails } from "@/app/components/SkeletonLoader";
import EpisodeCountdown from "@/app/components/EpisodeCountdown";
import Toast from "react-native-toast-message";
import StaleDataIndicator from "@/app/components/StaleDataIndicator";
import { reportError, showErrorAlert, showErrorToast } from "@/app/utils/errorHandling";

const { width } = Dimensions.get("window");

export default function ShowDetailsScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [show, setShow] = useState<TVShow | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);
  const [seasonEpisodes, setSeasonEpisodes] = useState<
    Record<number, Episode[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [lastWatchedEpisode, setLastWatchedEpisode] =
    useState<LastWatchedEpisode | null>(null);
  const [watchHistory, setWatchHistory] = useState<WatchHistoryEntry[]>([]);
  const [isUsingStaleData, setIsUsingStaleData] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!id) {
      setError("Show ID is missing. Please go back and try again.");
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      const showId = parseInt(id);
      if (isNaN(showId)) {
        throw new Error("Invalid show ID");
      }

      setError(null);

      if (!isRefreshing) {
        setIsLoading(true);
      }

      const details = await TMDBService.getTVShowDetails(showId);
      setShow(details);

      await AnalyticsService.trackScreenView("show-details", {
        showId: showId.toString(),
        showName: details.name,
      });

      if (details.number_of_seasons > 0) {
        const seasonsList: Season[] = [];
        for (let i = 1; i <= details.number_of_seasons; i++) {
          seasonsList.push({
            id: i,
            name: `Season ${i}`,
            season_number: i,
            episode_count: 0,
            poster_path: details.poster_path,
            overview: "",
            air_date: "",
          });
        }
        setSeasons(seasonsList);

        if (details.last_episode_to_air) {
          const latestSeasonNumber = details.last_episode_to_air.season_number;
          await loadSeasonEpisodes(showId, latestSeasonNumber);
          setExpandedSeason(latestSeasonNumber);
        }
      }

      const status = await WatchlistService.isInWatchlist(showId);
      setIsInWatchlist(status);

      const lastWatched = await WatchlistService.getLastWatchedEpisode(showId);
      setLastWatchedEpisode(lastWatched);

      const history = await WatchlistService.getWatchHistory(showId);
      setWatchHistory(history);

      setNotificationEnabled(NotificationService.isNotificationsEnabled());
      setIsUsingStaleData(TMDBService.consumeStaleFallbackFlag());
      setLastUpdatedAt(TMDBService.getLastCachedDataUpdatedAt());
    } catch (err) {
      const appError = reportError("ShowDetailsScreen.loadData", err, {
        fallbackMessage: "Failed to load show details. Please try again.",
      });
      setError(appError.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id]);

  const loadSeasonEpisodes = async (showId: number, seasonNumber: number) => {
    try {
      const seasonDetails = await TMDBService.getSeasonDetails(
        showId,
        seasonNumber,
      );
      if (seasonDetails && seasonDetails.episodes) {
        setSeasonEpisodes((prev) => ({
          ...prev,
          [seasonNumber]: seasonDetails.episodes || [],
        }));
      }
    } catch (error) {
      showErrorToast("ShowDetailsScreen.loadSeasonEpisodes", error, {
        title: "Season load failed",
        fallbackMessage: `Failed to load episodes for season ${seasonNumber}.`,
      });
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleWatchlistToggle = async () => {
    if (!show) return;

    try {
      if (isInWatchlist) {
        const success = await WatchlistService.removeFromWatchlist(show.id);
        if (success) {
          setIsInWatchlist(false);
          await NotificationService.cancelShowNotifications(show.id);

          Toast.show({
            type: "success",
            text1: "Removed from Watchlist",
            text2: `${show.name} has been removed from your watchlist`,
            position: "bottom",
          });

          await AnalyticsService.trackEvent(EventType.REMOVE_FROM_WATCHLIST, {
            showId: show.id,
            showName: show.name,
          });
        }
      } else {
        const success = await WatchlistService.addToWatchlist(show);
        if (success) {
          setIsInWatchlist(true);

          if (show.next_episode_to_air && notificationEnabled) {
            await scheduleNotification();
          }

          Toast.show({
            type: "success",
            text1: "Added to Watchlist",
            text2: `${show.name} has been added to your watchlist`,
            position: "bottom",
          });

          await AnalyticsService.trackEvent(EventType.ADD_TO_WATCHLIST, {
            showId: show.id,
            showName: show.name,
          });
        }
      }
    } catch (err) {
      showErrorToast("ShowDetailsScreen.handleWatchlistToggle", err, {
        title: "Watchlist update failed",
        fallbackMessage: "Failed to update watchlist. Please try again.",
      });
    }
  };

  const handleSetLastWatchedEpisode = async (episode: Episode) => {
    if (!show) {
      return;
    }

    try {
      let wasAddedToWatchlist = false;
      if (!isInWatchlist) {
        const addSuccess = await WatchlistService.addToWatchlist(show);
        if (addSuccess || (await WatchlistService.isInWatchlist(show.id))) {
          setIsInWatchlist(true);
          wasAddedToWatchlist = true;
        }
      }

      const success = await WatchlistService.setLastWatchedEpisode(
        show.id,
        show.name,
        episode,
      );
      if (!success) {
        showErrorToast(
          "ShowDetailsScreen.handleSetLastWatchedEpisode",
          new Error("WatchlistService failed to persist last watched episode"),
          {
            title: "Progress update failed",
            fallbackMessage: "Failed to save progress. Please try again.",
          },
        );
        return;
      }

      setLastWatchedEpisode({
        showId: show.id,
        showName: show.name,
        seasonNumber: episode.season_number,
        episodeNumber: episode.episode_number,
        episodeName: episode.name,
        watchedAt: Date.now(),
      });

      const history = await WatchlistService.getWatchHistory(show.id);
      setWatchHistory(history);

      Toast.show({
        type: "success",
        text1: "Progress updated",
        text2: wasAddedToWatchlist
          ? `Added to watchlist and set to S${episode.season_number}E${episode.episode_number}`
          : `Last watched set to S${episode.season_number}E${episode.episode_number}`,
        position: "bottom",
      });
    } catch (error) {
      showErrorToast("ShowDetailsScreen.handleSetLastWatchedEpisode", error, {
        title: "Progress update failed",
        fallbackMessage: "Failed to save progress. Please try again.",
      });
    }
  };

  const scheduleNotification = async () => {
    if (!show || !show.next_episode_to_air) return;

    try {
      const notificationId =
        await NotificationService.scheduleEpisodeNotification(show);
      if (notificationId) {
        console.log(`Notification scheduled with ID: ${notificationId}`);
      }
    } catch (error) {
      reportError("ShowDetailsScreen.scheduleNotification", error, {
        fallbackMessage: "Failed to schedule notification for this episode.",
      });
    }
  };

  const handleAddNextEpisodeToCalendar = async () => {
    if (!show || !show.next_episode_to_air) {
      return;
    }

    try {
      await CalendarService.addEpisodeToCalendar(
        show,
        show.next_episode_to_air,
      );

      Toast.show({
        type: "success",
        text1: "Added to Calendar",
        text2: `${show.next_episode_to_air.name} was added to your calendar.`,
        position: "bottom",
      });

      await AnalyticsService.trackEvent(EventType.CHANGE_SETTINGS, {
        action: "addEpisodeToCalendar",
        showId: show.id,
        episodeId: show.next_episode_to_air.id,
      });
    } catch (calendarError) {
      if (calendarError instanceof CalendarServiceError) {
        if (calendarError.code === "CALENDAR_PERMISSION_DENIED") {
          if (calendarError.canAskAgain) {
            Alert.alert(
              "Calendar Permission Needed",
              "Please allow calendar access to add episode reminders.",
            );
          } else {
            Alert.alert(
              "Calendar Permission Needed",
              "Calendar access is disabled. Enable it in device settings to add events.",
              [
                {
                  text: "Not Now",
                  style: "cancel",
                },
                {
                  text: "Open Settings",
                  onPress: () => {
                    void Linking.openSettings();
                  },
                },
              ],
            );
          }

          return;
        }

        if (calendarError.code === "CALENDAR_UNAVAILABLE") {
          Alert.alert(
            "Calendar Unavailable",
            "No writable calendar was found on this device.",
          );
          return;
        }
      }

      showErrorAlert("ShowDetailsScreen.handleAddNextEpisodeToCalendar", calendarError, {
        title: "Calendar Error",
        fallbackMessage: "Could not add the episode to your calendar right now.",
      });
    }
  };

  const getPosterUrl = (path: string | null) => {
    if (!path) return "";
    return `${TMDB_CONFIG.IMAGE_BASE_URL}/${TMDB_CONFIG.POSTER_SIZES.LARGE}${path}`;
  };

  const getBackdropUrl = (path: string | null) => {
    if (!path) return "";
    return `${TMDB_CONFIG.IMAGE_BASE_URL}/${TMDB_CONFIG.BACKDROP_SIZES.LARGE}${path}`;
  };

  const toggleSeason = async (seasonNumber: number) => {
    if (expandedSeason === seasonNumber) {
      setExpandedSeason(null);
    } else {
      setExpandedSeason(seasonNumber);

      if (!seasonEpisodes[seasonNumber] && show) {
        await loadSeasonEpisodes(show.id, seasonNumber);
      }
    }
  };

  const openSeasonDetails = (seasonNumber: number) => {
    if (!show) {
      return;
    }

    router.push({
      pathname: "/season-details",
      params: {
        id: show.id.toString(),
        season: seasonNumber.toString(),
      },
    });
  };

  const handleBackPress = () => {
    router.back();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "TBA";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getEpisodeStatusText = (airDate: string) => {
    if (!airDate) return "TBA";

    const normalizedAirDate = airDate.split("T")[0];
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    if (normalizedAirDate !== today) {
      return `Airs on ${formatDate(normalizedAirDate)}`;
    }

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const difference = endOfDay.getTime() - now.getTime();

    if (difference <= 0) {
      return "Aired";
    }

    const hours = Math.floor(difference / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `Airs in ${hours}h ${minutes}m`;
    }

    return `Airs in ${Math.max(minutes, 1)}m`;
  };

  const formatRuntime = (minutes?: number) => {
    if (!minutes) return "";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Returning Series":
        return theme.colors.primary;
      case "Ended":
        return theme.colors.error;
      case "Canceled":
        return theme.colors.error;
      default:
        return theme.colors.text;
    }
  };

  const renderNetworks = () => {
    if (!show || !show.networks || show.networks.length === 0) return null;

    return (
      <View style={styles.networksContainer}>
        {show.networks.map((network) => (
          <View key={network.id} style={styles.networkItem}>
            {network.logo_path ? (
              <CachedImage
                uri={`${TMDB_CONFIG.IMAGE_BASE_URL}/w92${network.logo_path}`}
                style={styles.networkLogo}
                resizeMode="contain"
              />
            ) : (
              <Text style={[styles.networkName, { color: theme.colors.text }]}>
                {network.name}
              </Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderGenres = () => {
    if (!show || !show.genres || show.genres.length === 0) return null;

    return (
      <View style={styles.genresContainer}>
        {show.genres.map((genre) => (
          <View
            key={genre.id}
            style={[
              styles.genreItem,
              { backgroundColor: theme.colors.secondary },
            ]}
          >
            <Text style={[styles.genreText, { color: theme.colors.text }]}>
              {genre.name}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderNextEpisode = () => {
    if (!show || !show.next_episode_to_air) return null;

    const episode = show.next_episode_to_air;

    return (
      <Animated.View
        style={[styles.nextEpisodeCard, { backgroundColor: theme.colors.card }]}
        entering={FadeInDown.duration(500).delay(300)}
      >
        <View
          style={[
            styles.nextEpisodeHeader,
            { borderBottomColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.nextEpisodeTitle, { color: theme.colors.text }]}>
            Next Episode
          </Text>
          <View style={styles.countdownContainer}>
            <Ionicons
              name="time-outline"
              size={18}
              color={theme.colors.primary}
            />
            <EpisodeCountdown airDate={episode.air_date} />
          </View>
        </View>

        <View style={styles.nextEpisodeContent}>
          <View style={styles.nextEpisodeInfo}>
            <Text
              style={[
                styles.nextEpisodeNumber,
                { color: theme.colors.textSecondary },
              ]}
            >
              Season {episode.season_number} · Episode {episode.episode_number}
            </Text>
            <Text
              style={[styles.nextEpisodeName, { color: theme.colors.text }]}
            >
              {episode.name}
            </Text>
            <Text
              style={[
                styles.nextEpisodeDate,
                { color: theme.colors.textSecondary },
              ]}
            >
              {getEpisodeStatusText(episode.air_date)}
            </Text>
          </View>

          {episode.still_path && (
            <CachedImage
              uri={`${TMDB_CONFIG.IMAGE_BASE_URL}/w300${episode.still_path}`}
              style={styles.nextEpisodeImage}
              resizeMode="cover"
            />
          )}
        </View>

        {episode.overview ? (
          <Text
            style={[styles.nextEpisodeOverview, { color: theme.colors.text }]}
          >
            {episode.overview}
          </Text>
        ) : null}

        <View style={styles.nextEpisodeActions}>
          <TouchableOpacity
            style={[
              styles.calendarActionButton,
              { backgroundColor: theme.colors.secondary },
            ]}
            onPress={handleAddNextEpisodeToCalendar}
          >
            <Ionicons
              name="calendar-outline"
              size={16}
              color={theme.colors.text}
            />
            <Text
              style={[styles.calendarActionText, { color: theme.colors.text }]}
            >
              Add to Calendar
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderLastEpisode = () => {
    if (!show || !show.last_episode_to_air) return null;

    const episode = show.last_episode_to_air;

    return (
      <Animated.View
        style={[styles.lastEpisodeCard, { backgroundColor: theme.colors.card }]}
        entering={FadeInDown.duration(500).delay(400)}
      >
        <Text style={[styles.lastEpisodeTitle, { color: theme.colors.text }]}>
          Last Episode
        </Text>

        <View style={styles.lastEpisodeContent}>
          <View style={styles.lastEpisodeInfo}>
            <Text
              style={[
                styles.lastEpisodeNumber,
                { color: theme.colors.textSecondary },
              ]}
            >
              Season {episode.season_number} · Episode {episode.episode_number}
            </Text>
            <Text
              style={[styles.lastEpisodeName, { color: theme.colors.text }]}
            >
              {episode.name}
            </Text>
            <Text
              style={[
                styles.lastEpisodeDate,
                { color: theme.colors.textSecondary },
              ]}
            >
              Aired on {formatDate(episode.air_date)}
            </Text>
          </View>

          {episode.still_path && (
            <CachedImage
              uri={`${TMDB_CONFIG.IMAGE_BASE_URL}/w300${episode.still_path}`}
              style={styles.lastEpisodeImage}
              resizeMode="cover"
            />
          )}
        </View>
      </Animated.View>
    );
  };

  const renderWatchProgress = () => {
    if (!lastWatchedEpisode) return null;

    const sortedSeasons = (show?.seasons || seasons)
      .filter((season) => season.season_number > 0)
      .sort((a, b) => a.season_number - b.season_number);

    const totalEpisodesFromSeasons = sortedSeasons.reduce((sum, season) => {
      if (season.episode_count) {
        return sum + season.episode_count;
      }

      return sum + (seasonEpisodes[season.season_number]?.length || 0);
    }, 0);

    const totalEpisodes =
      show?.number_of_episodes || totalEpisodesFromSeasons || 0;

    const watchedEpisodesFromPreviousSeasons = sortedSeasons
      .filter(
        (season) => season.season_number < lastWatchedEpisode.seasonNumber,
      )
      .reduce((sum, season) => {
        if (season.episode_count) {
          return sum + season.episode_count;
        }

        return sum + (seasonEpisodes[season.season_number]?.length || 0);
      }, 0);

    const watchedEpisodes =
      watchedEpisodesFromPreviousSeasons + lastWatchedEpisode.episodeNumber;
    const progressPercent =
      totalEpisodes > 0
        ? Math.max(
            0,
            Math.min(100, Math.round((watchedEpisodes / totalEpisodes) * 100)),
          )
        : null;

    const currentSeasonEpisodeCount =
      sortedSeasons.find(
        (season) => season.season_number === lastWatchedEpisode.seasonNumber,
      )?.episode_count ||
      seasonEpisodes[lastWatchedEpisode.seasonNumber]?.length ||
      0;
    const canSuggestNextEpisode = currentSeasonEpisodeCount > 0;

    let nextSeason = lastWatchedEpisode.seasonNumber;
    let nextEpisode = lastWatchedEpisode.episodeNumber + 1;

    if (canSuggestNextEpisode && nextEpisode > currentSeasonEpisodeCount) {
      const nextSeasonMeta = sortedSeasons.find(
        (season) => season.season_number > lastWatchedEpisode.seasonNumber,
      );

      if (nextSeasonMeta) {
        nextSeason = nextSeasonMeta.season_number;
        nextEpisode = 1;
      }
    }

    const hasNextSuggestion =
      canSuggestNextEpisode &&
      (totalEpisodes === 0 ||
        watchedEpisodes < totalEpisodes ||
        nextSeason > lastWatchedEpisode.seasonNumber);

    return (
      <Animated.View
        style={[styles.progressCard, { backgroundColor: theme.colors.card }]}
        entering={FadeInDown.duration(500).delay(450)}
      >
        <Text style={[styles.progressTitle, { color: theme.colors.text }]}>
          Your Progress
        </Text>
        <Text
          style={[styles.progressMeta, { color: theme.colors.textSecondary }]}
        >
          Last watched: Season {lastWatchedEpisode.seasonNumber} · Episode{" "}
          {lastWatchedEpisode.episodeNumber}
        </Text>
        <Text
          style={[styles.progressEpisodeName, { color: theme.colors.text }]}
          numberOfLines={2}
        >
          {lastWatchedEpisode.episodeName}
        </Text>

        {progressPercent !== null ? (
          <>
            <View
              style={[
                styles.progressBarTrack,
                { backgroundColor: theme.colors.border },
              ]}
            >
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: theme.colors.primary,
                    width: `${progressPercent}%`,
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.progressPercentText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {progressPercent}% complete (
              {Math.min(watchedEpisodes, totalEpisodes)} / {totalEpisodes})
            </Text>
          </>
        ) : null}

        <Text
          style={[styles.progressHint, { color: theme.colors.textSecondary }]}
        >
          {!canSuggestNextEpisode
            ? "Next episode suggestion will appear once season data is loaded."
            : hasNextSuggestion
              ? `Next episode suggestion: S${nextSeason}E${nextEpisode}`
              : "You are caught up with available episodes."}
        </Text>

        {watchHistory.length > 0 ? (
          <View style={styles.watchHistorySection}>
            <Text
              style={[styles.watchHistoryTitle, { color: theme.colors.text }]}
            >
              Recent Watch History
            </Text>
            {watchHistory.slice(0, 3).map((entry) => (
              <Text
                key={entry.id}
                style={[
                  styles.watchHistoryItem,
                  { color: theme.colors.textSecondary },
                ]}
              >
                S{entry.seasonNumber}E{entry.episodeNumber} ·{" "}
                {entry.episodeName}
              </Text>
            ))}
          </View>
        ) : null}
      </Animated.View>
    );
  };

  const renderSeasons = () => {
    if (!show || !seasons || seasons.length === 0) return null;

    return (
      <Animated.View
        style={styles.seasonsContainer}
        entering={FadeInDown.duration(500).delay(500)}
      >
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Seasons
          </Text>
          <Text
            style={[styles.seasonCount, { color: theme.colors.textSecondary }]}
          >
            {show.number_of_seasons}{" "}
            {show.number_of_seasons === 1 ? "Season" : "Seasons"}
          </Text>
        </View>

        {seasons.map((season) => (
          <View key={season.season_number}>
            <TouchableOpacity
              style={[
                styles.seasonHeader,
                { backgroundColor: theme.colors.card },
              ]}
              onPress={() => toggleSeason(season.season_number)}
            >
              <View style={styles.seasonHeaderContent}>
                <Text style={[styles.seasonName, { color: theme.colors.text }]}>
                  {season.name}
                </Text>
                <Text
                  style={[
                    styles.episodeCount,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {seasonEpisodes[season.season_number]?.length || ""} Episodes
                </Text>
              </View>
              <Ionicons
                name={
                  expandedSeason === season.season_number
                    ? "chevron-up"
                    : "chevron-down"
                }
                size={24}
                color={theme.colors.text}
              />
            </TouchableOpacity>

            {expandedSeason === season.season_number && (
              <View
                style={[
                  styles.episodeList,
                  { backgroundColor: theme.colors.background },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.viewSeasonDetailsButton,
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => openSeasonDetails(season.season_number)}
                >
                  <Ionicons
                    name="open-outline"
                    size={15}
                    color={theme.colors.primary}
                  />
                  <Text
                    style={[
                      styles.viewSeasonDetailsText,
                      { color: theme.colors.primary },
                    ]}
                  >
                    Open full season details
                  </Text>
                </TouchableOpacity>

                {seasonEpisodes[season.season_number] ? (
                  seasonEpisodes[season.season_number].map((episode) => (
                    <View
                      key={episode.id}
                      style={[
                        styles.episodeItem,
                        { borderBottomColor: theme.colors.border },
                      ]}
                    >
                      <View style={styles.episodeContent}>
                        <View style={styles.episodeMainInfo}>
                          <Text
                            style={[
                              styles.episodeNumber,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            {episode.episode_number}
                          </Text>
                          <View style={styles.episodeDetails}>
                            <Text
                              style={[
                                styles.episodeName,
                                { color: theme.colors.text },
                              ]}
                            >
                              {episode.name}
                            </Text>
                            <Text
                              style={[
                                styles.episodeAirDate,
                                { color: theme.colors.textSecondary },
                              ]}
                            >
                              {formatDate(episode.air_date)}
                              {episode.runtime
                                ? ` · ${formatRuntime(episode.runtime)}`
                                : ""}
                            </Text>
                          </View>
                        </View>

                        {episode.still_path && (
                          <CachedImage
                            uri={`${TMDB_CONFIG.IMAGE_BASE_URL}/w300${episode.still_path}`}
                            style={styles.episodeImage}
                            resizeMode="cover"
                          />
                        )}
                      </View>

                      {episode.overview ? (
                        <Text
                          style={[
                            styles.episodeOverview,
                            { color: theme.colors.textSecondary },
                          ]}
                          numberOfLines={3}
                        >
                          {episode.overview}
                        </Text>
                      ) : null}

                      <TouchableOpacity
                        style={[
                          styles.markWatchedButton,
                          {
                            backgroundColor:
                              lastWatchedEpisode?.showId === show.id &&
                              lastWatchedEpisode?.seasonNumber ===
                                episode.season_number &&
                              lastWatchedEpisode?.episodeNumber ===
                                episode.episode_number
                                ? theme.colors.primary
                                : theme.colors.secondary,
                          },
                        ]}
                        onPress={() => handleSetLastWatchedEpisode(episode)}
                      >
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color={
                            lastWatchedEpisode?.showId === show.id &&
                            lastWatchedEpisode?.seasonNumber ===
                              episode.season_number &&
                            lastWatchedEpisode?.episodeNumber ===
                              episode.episode_number
                              ? "#FFFFFF"
                              : theme.colors.text
                          }
                        />
                        <Text
                          style={[
                            styles.markWatchedText,
                            {
                              color:
                                lastWatchedEpisode?.showId === show.id &&
                                lastWatchedEpisode?.seasonNumber ===
                                  episode.season_number &&
                                lastWatchedEpisode?.episodeNumber ===
                                  episode.episode_number
                                  ? "#FFFFFF"
                                  : theme.colors.text,
                            },
                          ]}
                        >
                          {lastWatchedEpisode?.showId === show.id &&
                          lastWatchedEpisode?.seasonNumber ===
                            episode.season_number &&
                          lastWatchedEpisode?.episodeNumber ===
                            episode.episode_number
                            ? "Last Watched"
                            : "Mark as Last Watched"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <View style={styles.loadingEpisodes}>
                    <ActivityIndicator color={theme.colors.primary} />
                  </View>
                )}
              </View>
            )}
          </View>
        ))}
      </Animated.View>
    );
  };

  const renderCreators = () => {
    if (!show || !show.created_by || show.created_by.length === 0) return null;

    const hasAnyCreatorImages = show.created_by.some(
      (creator) => creator.profile_path,
    );

    return (
      <Animated.View
        style={styles.creatorsContainer}
        entering={FadeInDown.duration(500).delay(600)}
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Created By
        </Text>
        <View
          style={
            hasAnyCreatorImages
              ? styles.creatorsContent
              : styles.creatorsTextContent
          }
        >
          {show.created_by.map((creator) => (
            <View key={creator.id} style={styles.creatorItem}>
              {creator.profile_path ? (
                <CachedImage
                  uri={`${TMDB_CONFIG.IMAGE_BASE_URL}/w185${creator.profile_path}`}
                  style={styles.creatorImage}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.creatorPlaceholder,
                    { backgroundColor: theme.colors.card },
                  ]}
                >
                  <Ionicons
                    name="person"
                    size={32}
                    color={theme.colors.textSecondary}
                  />
                </View>
              )}
              <Text style={[styles.creatorName, { color: theme.colors.text }]}>
                {creator.name}
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>
    );
  };

  if (isLoading && !isRefreshing) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <SkeletonDetails />
      </View>
    );
  }

  if (error || !show) {
    return (
      <View
        style={[
          styles.errorContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {error || "Show not found"}
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.secondary }]}
          onPress={handleBackPress}
        >
          <Text style={[styles.buttonText, { color: theme.colors.text }]}>
            Go Back
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={loadData}
        >
          <Text style={[styles.buttonText, { color: "#FFFFFF" }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const backdropOverlayColor = theme.dark
    ? "rgba(0,0,0,0.7)"
    : "rgba(255,255,255,0.55)";
  const backButtonColor = theme.dark
    ? "rgba(0,0,0,0.5)"
    : "rgba(255,255,255,0.75)";

  return (
    <>
      <Stack.Screen
        options={{
          title: show.name,
          headerShown: false,
        }}
      />
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.backdropContainer}>
            <CachedImage
              uri={getBackdropUrl(show.backdrop_path)}
              style={styles.backdropImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={[
                "transparent",
                backdropOverlayColor,
                theme.colors.background,
              ]}
              style={styles.backdropGradient}
            />

            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: backButtonColor }]}
              onPress={handleBackPress}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={theme.dark ? "#FFFFFF" : theme.colors.text}
              />
            </TouchableOpacity>
          </View>

          <Animated.View
            style={styles.headerContent}
            entering={FadeIn.duration(800)}
          >
            <View style={styles.headerRow}>
              <CachedImage
                uri={getPosterUrl(show.poster_path)}
                style={styles.posterImage}
                resizeMode="cover"
              />

              <View style={styles.headerInfo}>
                <Text style={[styles.title, { color: theme.colors.text }]}>
                  {show.name}
                </Text>

                <View style={styles.metaRow}>
                  {show.first_air_date && (
                    <Text
                      style={[
                        styles.metaText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {new Date(show.first_air_date).getFullYear()}
                    </Text>
                  )}

                  {show.status && (
                    <Text
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(show.status) },
                      ]}
                    >
                      {show.status}
                    </Text>
                  )}
                </View>

                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={18} color="#FFD700" />
                  <Text style={[styles.rating, { color: theme.colors.text }]}>
                    {show.vote_average?.toFixed(1)}
                  </Text>
                </View>

                {renderGenres()}

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[
                      styles.watchlistButton,
                      {
                        backgroundColor: isInWatchlist
                          ? theme.colors.primary
                          : theme.colors.secondary,
                      },
                    ]}
                    onPress={handleWatchlistToggle}
                  >
                    <Ionicons
                      name={isInWatchlist ? "bookmark" : "bookmark-outline"}
                      size={18}
                      color={isInWatchlist ? "#FFFFFF" : theme.colors.text}
                    />
                    <Text
                      style={[
                        styles.watchlistButtonText,
                        {
                          color: isInWatchlist ? "#FFFFFF" : theme.colors.text,
                        },
                      ]}
                    >
                      {isInWatchlist ? "In Watchlist" : "Add to Watchlist"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {renderNetworks()}

            {isUsingStaleData ? (
              <StaleDataIndicator lastUpdatedAt={lastUpdatedAt} />
            ) : null}

            {show.overview && (
              <Animated.View
                style={styles.overviewContainer}
                entering={FadeInDown.duration(500).delay(200)}
              >
                <Text
                  style={[styles.overviewText, { color: theme.colors.text }]}
                >
                  {show.overview}
                </Text>
              </Animated.View>
            )}

            {renderNextEpisode()}
            {renderLastEpisode()}
            {renderWatchProgress()}
            {renderSeasons()}
            {renderCreators()}
          </Animated.View>
        </ScrollView>
      </View>
      <Toast />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
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
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 8,
    minWidth: 150,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  backdropContainer: {
    height: 250,
    width: "100%",
    position: "relative",
  },
  backdropImage: {
    height: "100%",
    width: "100%",
  },
  backdropGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "100%",
  },
  backButton: {
    position: "absolute",
    top: 48,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    paddingHorizontal: 16,
    marginTop: -80,
  },
  headerRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  posterImage: {
    width: 120,
    height: 180,
    borderRadius: 8,
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
    justifyContent: "flex-start",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "wrap",
  },
  metaText: {
    fontSize: 14,
    marginRight: 8,
  },
  statusBadge: {
    fontSize: 12,
    color: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: "hidden",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  rating: {
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 4,
  },
  genresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  genreItem: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  genreText: {
    fontSize: 12,
  },
  actions: {
    flexDirection: "row",
    marginBottom: 8,
  },
  watchlistButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  watchlistButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 4,
  },
  networksContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  networkItem: {
    marginRight: 16,
    marginBottom: 8,
  },
  networkLogo: {
    height: 30,
    width: 60,
    resizeMode: "contain",
  },
  networkName: {
    fontSize: 14,
  },
  overviewContainer: {
    marginBottom: 24,
  },
  overviewText: {
    fontSize: 16,
    lineHeight: 24,
  },
  nextEpisodeCard: {
    borderRadius: 12,
    marginBottom: 24,
    overflow: "hidden",
  },
  nextEpisodeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  nextEpisodeTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  countdownContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  nextEpisodeContent: {
    flexDirection: "row",
    padding: 16,
  },
  nextEpisodeInfo: {
    flex: 1,
    marginRight: 16,
  },
  nextEpisodeNumber: {
    fontSize: 14,
    marginBottom: 4,
  },
  nextEpisodeName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  nextEpisodeDate: {
    fontSize: 14,
  },
  nextEpisodeImage: {
    width: 120,
    height: 68,
    borderRadius: 4,
  },
  nextEpisodeOverview: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  nextEpisodeActions: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  calendarActionButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  calendarActionText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "600",
  },
  lastEpisodeCard: {
    borderRadius: 12,
    marginBottom: 24,
    padding: 16,
  },
  lastEpisodeTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  lastEpisodeContent: {
    flexDirection: "row",
  },
  lastEpisodeInfo: {
    flex: 1,
    marginRight: 16,
  },
  lastEpisodeNumber: {
    fontSize: 14,
    marginBottom: 4,
  },
  lastEpisodeName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  lastEpisodeDate: {
    fontSize: 14,
  },
  progressCard: {
    borderRadius: 12,
    marginBottom: 24,
    padding: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  progressMeta: {
    fontSize: 14,
    marginBottom: 6,
  },
  progressEpisodeName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  progressBarTrack: {
    width: "100%",
    height: 8,
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 5,
  },
  progressPercentText: {
    fontSize: 12,
    marginBottom: 8,
  },
  progressHint: {
    fontSize: 13,
  },
  watchHistorySection: {
    marginTop: 10,
  },
  watchHistoryTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  watchHistoryItem: {
    fontSize: 12,
    marginBottom: 2,
  },
  lastEpisodeImage: {
    width: 120,
    height: 68,
    borderRadius: 4,
  },
  seasonsContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  seasonCount: {
    fontSize: 14,
  },
  seasonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  seasonHeaderContent: {
    flex: 1,
  },
  seasonName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  episodeCount: {
    fontSize: 14,
  },
  episodeList: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: "hidden",
  },
  viewSeasonDetailsButton: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  viewSeasonDetailsText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "600",
  },
  episodeItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  episodeContent: {
    flexDirection: "row",
    marginBottom: 8,
  },
  episodeMainInfo: {
    flex: 1,
    flexDirection: "row",
    marginRight: 16,
  },
  episodeNumber: {
    fontSize: 14,
    fontWeight: "bold",
    marginRight: 12,
    width: 24,
  },
  episodeDetails: {
    flex: 1,
  },
  episodeName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  episodeAirDate: {
    fontSize: 14,
  },
  episodeImage: {
    width: 100,
    height: 56,
    borderRadius: 4,
  },
  episodeOverview: {
    fontSize: 14,
    lineHeight: 20,
  },
  markWatchedButton: {
    marginTop: 10,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  markWatchedText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  loadingEpisodes: {
    padding: 20,
    alignItems: "center",
  },
  creatorsContainer: {
    marginBottom: 24,
  },
  creatorsContent: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },
  creatorsTextContent: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },
  creatorItem: {
    width: 80,
    marginRight: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  creatorImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  creatorPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  creatorName: {
    fontSize: 14,
    textAlign: "center",
  },
});
