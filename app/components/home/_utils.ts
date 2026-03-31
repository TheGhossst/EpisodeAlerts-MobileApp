export const truncateText = (text: string, length: number): string => {
  if (!text) {
    return '';
  }

  if (text.length <= length) {
    return text;
  }

  return `${text.substring(0, length)}...`;
};

export const formatDate = (dateString: string | undefined): string => {
  if (!dateString) {
    return '';
  }

  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const getAiringTodayStatusText = (clockTick: number): string => {
  const now = new Date(clockTick);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const difference = endOfDay.getTime() - now.getTime();
  if (difference <= 0) {
    return 'Aired';
  }

  const hours = Math.floor(difference / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `Airs in ${hours}h ${minutes}m`;
  }

  return `Airs in ${Math.max(minutes, 1)}m`;
};

// Expo Router scans files under app/ as routes; this keeps helper files warning-free.
export default function HomeUtilsRouteShim(): null {
  return null;
}