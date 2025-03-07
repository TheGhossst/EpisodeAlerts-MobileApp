import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import TMDBService, { TVShow } from '@/app/services/TMDBService';
import { TMDB_CONFIG } from '@/constants/Config';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<TVShow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.length > 2) {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await TMDBService.searchTVShows(query);
        setResults(response.results);
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to search. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      setResults([]);
    }
  };

  const getPosterUrl = (path: string | null) => {
    if (!path) return undefined;
    return `${TMDB_CONFIG.IMAGE_BASE_URL}/${TMDB_CONFIG.POSTER_SIZES.SMALL}${path}`;
  };

  const renderItem = ({ item }: { item: TVShow }) => (
    <Link href={{ pathname: '/show-details', params: { id: item.id } }} asChild>
      <TouchableOpacity style={styles.resultItem}>
        {item.poster_path ? (
          <Image
            source={{ uri: getPosterUrl(item.poster_path) }}
            style={styles.poster}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.noPoster}>
            <Text style={styles.noPosterText}>No Image</Text>
          </View>
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            {item.name}
          </Text>
          <Text style={styles.year}>
            {item.first_air_date ? item.first_air_date.split('-')[0] : 'N/A'}
          </Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.rating}>★ {item.vote_average?.toFixed(1)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Link>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search TV shows..."
          placeholderTextColor="#666666"
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e50914" />
        </View>
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.resultsList}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {searchQuery.length > 0
                ? 'No results found'
                : 'Start typing to search for TV shows'}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#1a1a1a',
  },
  searchInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsList: {
    padding: 16,
  },
  resultItem: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    overflow: 'hidden',
  },
  poster: {
    width: 80,
    height: 120,
  },
  noPoster: {
    width: 80,
    height: 120,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPosterText: {
    color: '#666666',
    fontSize: 12,
  },
  itemInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  year: {
    color: '#999999',
    fontSize: 14,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    color: '#e50914',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#666666',
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
  },
  errorText: {
    color: '#e50914',
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
    padding: 16,
  },
}); 