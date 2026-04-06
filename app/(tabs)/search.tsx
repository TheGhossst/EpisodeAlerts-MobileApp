import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
} from 'react-native';
import TMDBService, { TVShow } from '@/app/services/TMDBService';
import SearchBar from '@/app/components/search/SearchBar';
import SearchResultsList from '@/app/components/search/SearchResultsList';
import { useTheme } from '@/app/context/ThemeContext';
import AnalyticsService, { EventType } from '@/app/services/AnalyticsService';
import StaleDataIndicator from '@/app/components/StaleDataIndicator';

export default function SearchScreen() {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<TVShow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUsingStaleData, setIsUsingStaleData] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const latestRequestId = useRef(0);

  useEffect(() => {
    void AnalyticsService.trackScreenView('search');
  }, []);

  const handleSearchInputChange = (query: string) => {
    setSearchQuery(query);
  };

  useEffect(() => {
    const trimmed = searchQuery.trim();

    if (trimmed.length <= 2) {
      latestRequestId.current += 1;
      setDebouncedQuery('');
      setResults([]);
      setCurrentPage(1);
      setHasMore(false);
      setError(null);
      setIsUsingStaleData(false);
      setLastUpdatedAt(null);
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedQuery(trimmed);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadSearchPage = async (query: string, page: number, replaceResults: boolean) => {
    const requestId = ++latestRequestId.current;

    if (replaceResults) {
      setIsLoading(true);
      setError(null);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const response = await TMDBService.searchTVShows(query, page);

      if (requestId !== latestRequestId.current) {
        return;
      }

      setResults((prev) => {
        if (replaceResults) {
          return response.results;
        }

        const existingIds = new Set(prev.map((item) => item.id));
        const uniqueNext = response.results.filter((item) => !existingIds.has(item.id));
        return [...prev, ...uniqueNext];
      });

      setCurrentPage(page);
      const totalPages = response.total_pages ?? page;
      setHasMore(page < totalPages && response.results.length > 0);

      setIsUsingStaleData(TMDBService.consumeStaleFallbackFlag());
      setLastUpdatedAt(TMDBService.getLastCachedDataUpdatedAt());

      if (replaceResults) {
        await AnalyticsService.trackEvent(EventType.SEARCH_QUERY, {
          query: query.slice(0, 100),
          resultCount: response.results.length,
        });
      }
    } catch (err) {
      console.error('Search error:', err);
      if (requestId === latestRequestId.current) {
        setError('Failed to search. Please try again.');
      }
    } finally {
      if (requestId === latestRequestId.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    if (!debouncedQuery) {
      return;
    }

    void loadSearchPage(debouncedQuery, 1, true);
  }, [debouncedQuery]);

  const handleLoadMore = () => {
    if (isLoading || isLoadingMore || !hasMore || !debouncedQuery) {
      return;
    }

    void loadSearchPage(debouncedQuery, currentPage + 1, false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SearchBar value={searchQuery} onChangeText={handleSearchInputChange} theme={theme} />

      {isUsingStaleData ? <StaleDataIndicator lastUpdatedAt={lastUpdatedAt} /> : null}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : error ? (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
      ) : (
        <SearchResultsList
          results={results}
          searchQuery={searchQuery}
          theme={theme}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
    padding: 16,
  },
}); 