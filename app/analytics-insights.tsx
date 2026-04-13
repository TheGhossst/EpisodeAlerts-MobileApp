import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useFocusEffect } from 'expo-router';
import AnalyticsService, { type AnalyticsEvent } from '@/app/services/AnalyticsService';
import { useTheme } from '@/app/context/ThemeContext';

const DAILY_WINDOW_DAYS = 7;
const GRAPH_HEIGHT = 220;
const GRAPH_PADDING_TOP = 18;
const GRAPH_PADDING_RIGHT = 12;
const GRAPH_PADDING_BOTTOM = 36;
const GRAPH_PADDING_LEFT = 34;
const GRAPH_POINT_SIZE = 12;
const GRAPH_LINE_THICKNESS = 3;
const GRAPH_BODY_HEIGHT = GRAPH_HEIGHT - GRAPH_PADDING_TOP - GRAPH_PADDING_BOTTOM;

interface DailyAnalyticsPoint {
  key: string;
  label: string;
  count: number;
}

interface GraphPoint extends DailyAnalyticsPoint {
  x: number;
  y: number;
  isToday: boolean;
}

interface GraphSegment {
  key: string;
  x: number;
  y: number;
  width: number;
  angle: number;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toEventLabel(eventType: string): string {
  return eventType
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function AnalyticsInsightsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAnalytics = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      await AnalyticsService.initialize();
      const localEvents = AnalyticsService
        .getEvents()
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEvents(localEvents);
    } catch (error) {
      console.error('Error loading analytics insights:', error);
      Alert.alert('Analytics Error', 'Could not load local analytics data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAnalytics();
    }, [loadAnalytics]),
  );

  const dailySeries = useMemo<DailyAnalyticsPoint[]>(() => {
    const dayKeys: Array<{ key: string; label: string }> = [];
    const today = new Date();

    for (let i = DAILY_WINDOW_DAYS - 1; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dayKeys.push({
        key: toDateKey(date),
        label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      });
    }

    const eventCountsByDay: Record<string, number> = {};
    events.forEach((event) => {
      const parsedDate = new Date(event.timestamp);
      if (Number.isNaN(parsedDate.getTime())) {
        return;
      }

      const key = toDateKey(parsedDate);
      eventCountsByDay[key] = (eventCountsByDay[key] || 0) + 1;
    });

    return dayKeys.map((day) => ({
      key: day.key,
      label: day.label,
      count: eventCountsByDay[day.key] || 0,
    }));
  }, [events]);

  const maxDailyCount = useMemo(() => {
    const highest = dailySeries.reduce((max, point) => Math.max(max, point.count), 0);
    return highest > 0 ? highest : 1;
  }, [dailySeries]);

  const eventTypeSeries = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((event) => {
      counts[event.type] = (counts[event.type] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([type, count]) => ({ type, count }));
  }, [events]);

  const maxTypeCount = useMemo(() => {
    const highest = eventTypeSeries.reduce((max, item) => Math.max(max, item.count), 0);
    return highest > 0 ? highest : 1;
  }, [eventTypeSeries]);

  const eventsTodayCount = useMemo(() => {
    const todayKey = toDateKey(new Date());
    return events.filter((event) => {
      const date = new Date(event.timestamp);
      return !Number.isNaN(date.getTime()) && toDateKey(date) === todayKey;
    }).length;
  }, [events]);

  const peakDay = useMemo<DailyAnalyticsPoint>(() => {
    if (dailySeries.length === 0) {
      return { key: 'none', label: 'N/A', count: 0 };
    }

    return dailySeries.reduce((currentPeak, point) => {
      return point.count > currentPeak.count ? point : currentPeak;
    }, dailySeries[0]);
  }, [dailySeries]);

  const averageDailyCount = events.length / DAILY_WINDOW_DAYS;
  const graphWidth = Math.max(0, screenWidth - 64);
  const currentDayKey = toDateKey(new Date());

  const graphPoints = useMemo<GraphPoint[]>(() => {
    const plotWidth = Math.max(0, graphWidth - GRAPH_PADDING_LEFT - GRAPH_PADDING_RIGHT);
    const safeMaxCount = Math.max(1, maxDailyCount);

    return dailySeries.map((point, index) => {
      const progress = dailySeries.length > 1 ? index / (dailySeries.length - 1) : 0.5;
      const x = GRAPH_PADDING_LEFT + plotWidth * progress;
      const y = GRAPH_PADDING_TOP + GRAPH_BODY_HEIGHT - (point.count / safeMaxCount) * GRAPH_BODY_HEIGHT;

      return {
        ...point,
        x,
        y,
        isToday: point.key === currentDayKey,
      };
    });
  }, [currentDayKey, dailySeries, graphWidth, maxDailyCount]);

  const graphSegments = useMemo<GraphSegment[]>(() => {
    return graphPoints.slice(1).map((point, index) => {
      const start = graphPoints[index];
      const dx = point.x - start.x;
      const dy = point.y - start.y;

      return {
        key: `${start.key}-${point.key}`,
        x: (start.x + point.x) / 2,
        y: (start.y + point.y) / 2,
        width: Math.max(1, Math.sqrt(dx * dx + dy * dy)),
        angle: (Math.atan2(dy, dx) * 180) / Math.PI,
      };
    });
  }, [graphPoints]);

  const clearAnalytics = () => {
    Alert.alert(
      'Clear Local Analytics',
      'This removes analytics stored on this device only. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            void AnalyticsService.clearEvents().then(() => loadAnalytics(true));
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}> 
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Analytics Insights',
          headerStyle: {
            backgroundColor: theme.colors.card,
          },
          headerTintColor: theme.colors.text,
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 2 + insets.bottom},
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void loadAnalytics(true);
            }}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}> 
          <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>Local Analytics</Text>
          <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>Total events: {events.length}</Text>
          <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>Events today: {eventsTodayCount}</Text>
          <Text style={[styles.summaryHint, { color: theme.colors.textSecondary }]}>Stored on this device only.</Text>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}> 
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Activity Trend</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}> 
            {events.length > 0
              ? `Average ${averageDailyCount.toFixed(1)} events/day | Peak ${peakDay.label} (${peakDay.count})`
              : 'No events recorded yet. The chart will fill in as the app records activity.'}
          </Text>

          <View style={styles.graphCanvas}>
            {[0, 0.5, 1].map((tick) => (
              <View
                key={`grid-${tick}`}
                style={[
                  styles.graphGridLine,
                  {
                    left: GRAPH_PADDING_LEFT,
                    right: GRAPH_PADDING_RIGHT,
                    top: GRAPH_PADDING_TOP + GRAPH_BODY_HEIGHT * (1 - tick),
                    borderTopColor: theme.colors.border,
                  },
                ]}
              />
            ))}

            {graphSegments.map((segment) => (
              <View
                key={segment.key}
                style={[
                  styles.graphSegment,
                  {
                    left: segment.x - segment.width / 2,
                    top: segment.y - GRAPH_LINE_THICKNESS / 2,
                    width: segment.width,
                    height: GRAPH_LINE_THICKNESS,
                    backgroundColor: theme.colors.primary,
                    transform: [{ rotate: `${segment.angle}deg` }],
                  },
                ]}
              />
            ))}

            {graphPoints.map((point) => (
              <React.Fragment key={point.key}>
                <Text
                  style={[
                    styles.graphValueLabel,
                    {
                      left: point.x - 16,
                      top: point.y - 28,
                      color: point.isToday ? theme.colors.primary : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {point.count}
                </Text>
                <View
                  style={[
                    styles.graphPoint,
                    {
                      left: point.x - (point.isToday ? GRAPH_POINT_SIZE + 4 : GRAPH_POINT_SIZE) / 2,
                      top: point.y - (point.isToday ? GRAPH_POINT_SIZE + 4 : GRAPH_POINT_SIZE) / 2,
                      width: point.isToday ? GRAPH_POINT_SIZE + 4 : GRAPH_POINT_SIZE,
                      height: point.isToday ? GRAPH_POINT_SIZE + 4 : GRAPH_POINT_SIZE,
                      borderRadius: point.isToday ? (GRAPH_POINT_SIZE + 4) / 2 : GRAPH_POINT_SIZE / 2,
                      backgroundColor: point.isToday ? theme.colors.accent : theme.colors.primary,
                      borderColor: theme.colors.card,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.graphDayLabel,
                    {
                      left: point.x - 18,
                      top: GRAPH_HEIGHT - 18,
                      color: theme.colors.textSecondary,
                    },
                  ]}
                >
                  {point.label}
                </Text>
              </React.Fragment>
            ))}

            {events.length === 0 ? (
              <View style={styles.graphEmptyOverlay}>
                <Text style={[styles.graphEmptyTitle, { color: theme.colors.text }]}>No activity yet</Text>
                <Text style={[styles.graphEmptyText, { color: theme.colors.textSecondary }]}>The graph will animate with real usage data once events exist.</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}> 
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Top Event Types</Text>
          {eventTypeSeries.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No local analytics events yet.</Text>
          ) : (
            eventTypeSeries.map((item) => {
              const widthPercent = Math.max(6, Math.round((item.count / maxTypeCount) * 100));
              return (
                <View key={item.type} style={styles.typeRow}>
                  <Text style={[styles.typeLabel, { color: theme.colors.text }]} numberOfLines={1}>
                    {toEventLabel(item.type)}
                  </Text>
                  <View style={[styles.typeBarTrack, { backgroundColor: theme.colors.border }]}> 
                    <View style={[styles.typeBarFill, { width: `${widthPercent}%`, backgroundColor: theme.colors.primary }]} />
                  </View>
                  <Text style={[styles.typeCount, { color: theme.colors.textSecondary }]}>{item.count}</Text>
                </View>
              );
            })
          )}
        </View>

        <TouchableOpacity
          style={[styles.clearButton, { backgroundColor: theme.colors.error }]}
          onPress={clearAnalytics}
        >
          <Text style={styles.clearButtonText}>Clear Local Analytics</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    marginBottom: 4,
  },
  summaryHint: {
    fontSize: 12,
    marginTop: 8,
  },
  sectionCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  graphCanvas: {
    height: GRAPH_HEIGHT,
    position: 'relative',
  },
  graphGridLine: {
    position: 'absolute',
    borderTopWidth: 1,
    opacity: 0.5,
  },
  graphSegment: {
    position: 'absolute',
    borderRadius: 999,
  },
  graphPoint: {
    position: 'absolute',
    borderWidth: 2,
  },
  graphValueLabel: {
    position: 'absolute',
    width: 32,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
  },
  graphDayLabel: {
    position: 'absolute',
    width: 36,
    textAlign: 'center',
    fontSize: 11,
  },
  graphEmptyOverlay: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: 64,
    alignItems: 'center',
  },
  graphEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  graphEmptyText: {
    fontSize: 12,
    textAlign: 'center',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeLabel: {
    width: 120,
    fontSize: 13,
    marginRight: 8,
  },
  typeBarTrack: {
    flex: 1,
    height: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  typeBarFill: {
    height: '100%',
    borderRadius: 10,
  },
  typeCount: {
    width: 36,
    textAlign: 'right',
    marginLeft: 8,
    fontSize: 12,
  },
  emptyText: {
    fontSize: 13,
  },
  clearButton: {
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
