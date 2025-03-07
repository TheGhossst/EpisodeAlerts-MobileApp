import React, { useState, useEffect } from 'react';
import { Image, View, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import * as FileSystem from 'expo-file-system';
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
    const loadImage = async () => {
      try {
        // Reset state when URI changes
        setIsLoading(true);
        setHasError(false);
        
        if (!uri) {
          setHasError(true);
          setIsLoading(false);
          return;
        }
        
        if (!ImageCacheService.isImageCacheEnabled()) {
          setCachedUri(uri);
          setIsLoading(false);
          return;
        }
        
        const filename = uri.substring(uri.lastIndexOf('/') + 1);
        const cacheDir = `${FileSystem.cacheDirectory}images/`;
        const cacheFilePath = `${cacheDir}${filename}`;
        
        const dirInfo = await FileSystem.getInfoAsync(cacheDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
        }
        
        const fileInfo = await FileSystem.getInfoAsync(cacheFilePath);
        
        if (fileInfo.exists) {
          setCachedUri(fileInfo.uri);
        } else {
          // Download and cache file
          const downloadResult = await FileSystem.downloadAsync(uri, cacheFilePath);
          if (downloadResult.status === 200) {
            setCachedUri(downloadResult.uri);
          } else {
            // If download fails, use original URI
            setCachedUri(uri);
          }
        }
      } catch (error) {
        console.error('Error caching image:', error, uri);
        // Fallback to original URI on error
        setCachedUri(uri);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
    
    // Cleanup function
    return () => {
      // Cancel download if component unmounts
      // No specific cleanup needed here, but this is where it would go
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