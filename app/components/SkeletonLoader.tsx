import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/app/context/ThemeContext';

interface SkeletonLoaderProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const { theme } = useTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.6, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const baseStyle: ViewStyle = {
    width,
    height,
    borderRadius,
    backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
  };

  return (
    <Animated.View
      style={[
        styles.skeleton,
        baseStyle,
        animatedStyle,
        style,
      ]}
    />
  );
};

export const SkeletonCard: React.FC<{ size?: 'small' | 'medium' | 'large' }> = ({ 
  size = 'medium' 
}) => {
  const sizeMap = {
    small: { width: 120, height: 180 },
    medium: { width: 160, height: 240 },
    large: { width: 200, height: 300 },
  };

  const dimensions = sizeMap[size];

  return (
    <View style={styles.cardContainer}>
      <SkeletonLoader
        width={dimensions.width}
        height={dimensions.height}
        borderRadius={8}
      />
      <SkeletonLoader
        width={dimensions.width * 0.8}
        height={16}
        style={styles.cardTitle}
      />
      <SkeletonLoader
        width={dimensions.width * 0.5}
        height={12}
        style={styles.cardSubtitle}
      />
    </View>
  );
};

export const SkeletonBanner: React.FC = () => {
  return (
    <View style={styles.bannerContainer}>
      <SkeletonLoader
        width="100%"
        height={220}
        borderRadius={12}
      />
    </View>
  );
};

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <View style={styles.listContainer}>
      <SkeletonLoader
        width={120}
        height={24}
        style={styles.listTitle}
      />
      <View style={styles.cardsRow}>
        {Array(count).fill(0).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </View>
    </View>
  );
};

export const SkeletonDetails: React.FC = () => {
  return (
    <View style={styles.detailsContainer}>
      <SkeletonLoader
        width="100%"
        height={250}
        borderRadius={0}
      />
      <View style={styles.detailsContent}>
        <SkeletonLoader
          width="80%"
          height={28}
          style={styles.detailsTitle}
        />
        <SkeletonLoader
          width="50%"
          height={20}
          style={styles.detailsSubtitle}
        />
        <SkeletonLoader
          width="100%"
          height={16}
          style={styles.detailsText}
        />
        <SkeletonLoader
          width="100%"
          height={16}
          style={styles.detailsText}
        />
        <SkeletonLoader
          width="70%"
          height={16}
          style={styles.detailsText}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  cardContainer: {
    marginRight: 12,
    marginBottom: 16,
  },
  cardTitle: {
    marginTop: 8,
    marginBottom: 4,
  },
  cardSubtitle: {
    marginBottom: 4,
  },
  bannerContainer: {
    margin: 16,
  },
  listContainer: {
    marginBottom: 24,
  },
  listTitle: {
    marginLeft: 16,
    marginBottom: 16,
  },
  cardsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  detailsContainer: {
    flex: 1,
  },
  detailsContent: {
    padding: 16,
  },
  detailsTitle: {
    marginBottom: 8,
  },
  detailsSubtitle: {
    marginBottom: 16,
  },
  detailsText: {
    marginBottom: 8,
  },
}); 