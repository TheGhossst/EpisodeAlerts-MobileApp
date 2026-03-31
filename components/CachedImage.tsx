import React, { useState, useEffect } from 'react';
import { Image, View, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import ImageCacheService from '@/app/services/ImageCacheService';
import { useTheme } from '@/app/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';

interface CachedImageProps {
  uri: string;
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  showLoader?: boolean;
  onError?: () => void;
  fallbackSource?: any;
}

const CachedImage: React.FC<CachedImageProps> = ({
  uri,
  style,
  resizeMode = 'cover',
  showLoader = false,
  onError,
  fallbackSource,
}) => {
  const { theme } = useTheme();
  const [cachedUri, setCachedUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    let isActive = true;

    const loadImage = async () => {
      try {
        // Reset state when URI changes
        if (isActive) {
          setIsLoading(true);
          setHasError(false);
        }
        
        if (!uri) {
          if (isActive) {
            setHasError(true);
            setIsLoading(false);
          }
          return;
        }
        
        if (!ImageCacheService.isImageCacheEnabled()) {
          if (isActive) {
            setCachedUri(uri);
            setIsLoading(false);
          }
          return;
        }

        const cached = await ImageCacheService.getCachedImageUri(uri);
        if (isActive) {
          setCachedUri(cached);
        }
      } catch (error) {
        console.error('Error caching image:', error, uri);
        // Fallback to original URI on error
        if (isActive) {
          setCachedUri(uri);
          setHasError(true);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadImage();
    
    return () => {
      isActive = false;
    };
  }, [uri]);

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  // Show fallback when error occurs
  if (hasError) {
    if (fallbackSource) {
      return <Image source={fallbackSource} style={style} resizeMode={resizeMode} />;
    }
    return (
      <View style={[styles.errorContainer as ViewStyle, style]}>
        <MaterialIcons name="broken-image" size={30} color={theme.colors.textSecondary} />
      </View>
    );
  }

  return (
    <View style={[styles.container as ViewStyle, style]}>
      {cachedUri ? (
        <Image
          source={{ uri: cachedUri }}
          style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
          resizeMode={resizeMode}
          onError={handleError}
          onLoad={handleLoad}
        />
      ) : null}

      {(isLoading && showLoader) && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={theme.colors.primary} size="small" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
});

export default CachedImage;