import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { Link } from 'expo-router';
import { TVShow } from '@/app/services/TMDBService';
import { TMDB_CONFIG } from '@/constants/Config';
import { LinearGradient } from 'expo-linear-gradient';
import CachedImage from './CachedImage';

interface FeaturedShowProps {
  show: TVShow;
}

const FeaturedShow: React.FC<FeaturedShowProps> = ({ show }) => {
  const getBackdropUrl = (path: string) => {
    return `${TMDB_CONFIG.IMAGE_BASE_URL}/${TMDB_CONFIG.BACKDROP_SIZES.LARGE}${path}`;
  };

  return (
    <Link href={{ pathname: '/show-details', params: { id: show.id } }} asChild>
      <TouchableOpacity style={styles.container}>
        {show.backdrop_path ? (
          <View style={styles.backdropContainer}>
            <CachedImage
              uri={getBackdropUrl(show.backdrop_path)}
              style={styles.backdropImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)', '#121212']}
              style={styles.gradient}
            >
              <View style={styles.contentContainer}>
                <Text style={styles.title}>{show.name}</Text>
                
                <View style={styles.infoContainer}>
                  <Text style={styles.rating}>★ {show.vote_average?.toFixed(1)}</Text>
                  <Text style={styles.year}>
                    {show.first_air_date?.split('-')[0]}
                  </Text>
                </View>
                
                <Text style={styles.overview} numberOfLines={2} ellipsizeMode="tail">
                  {show.overview}
                </Text>
              </View>
            </LinearGradient>
          </View>
        ) : (
          <View style={styles.noBackdrop}>
            <Text style={styles.title}>{show.name}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Link>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 300,
    marginBottom: 16,
  },
  backdropContainer: {
    width: '100%',
    height: 300,
    position: 'relative',
  },
  backdropImage: {
    width: '100%',
    height: 300,
  },
  noBackdrop: {
    width: '100%',
    height: 300,
    backgroundColor: '#1a1a1a',
    justifyContent: 'flex-end',
    padding: 16,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 200,
    justifyContent: 'flex-end',
  },
  contentContainer: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rating: {
    color: '#e50914',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 12,
  },
  year: {
    color: '#ffffff',
    fontSize: 14,
  },
  overview: {
    color: '#cccccc',
    fontSize: 14,
    lineHeight: 20,
  },
});

export default FeaturedShow; 