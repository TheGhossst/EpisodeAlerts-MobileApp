import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/app/context/ThemeContext';

interface EpisodeCountdownProps {
  airDate: string;
}

export default function EpisodeCountdown({ airDate }: EpisodeCountdownProps) {
  const { theme } = useTheme();
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const normalizedAirDate = airDate?.split('T')[0];

      if (!normalizedAirDate) {
        setTimeLeft('TBA');
        return;
      }

      const todayString = now.toISOString().split('T')[0];

      // TMDB dates are day-level for episodes. For today, treat the episode as
      // potentially airing until end-of-day so users see a useful countdown.
      if (normalizedAirDate === todayString) {
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        const todayDifference = endOfDay.getTime() - now.getTime();

        if (todayDifference <= 0) {
          setTimeLeft('Aired');
          return;
        }

        const hours = Math.floor(todayDifference / (1000 * 60 * 60));
        const minutes = Math.floor((todayDifference % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m`);
        } else {
          setTimeLeft(`${Math.max(minutes, 1)}m`);
        }
        return;
      }

      const airDateTime = new Date(`${normalizedAirDate}T00:00:00`).getTime();
      const difference = airDateTime - now.getTime();

      if (difference <= 0) {
        setTimeLeft('Aired');
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${Math.max(minutes, 1)}m`);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [airDate]);

  return (
    <View style={styles.container}>
      <Text style={[styles.timeText, { color: theme.colors.primary }]}>
        {timeLeft}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 4,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
}); 