import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { TVShow } from '@/app/services/TMDBService';
import type { Theme } from '@/app/context/ThemeContext';
import SearchResultItem from './SearchResultItem';

interface SearchResultsListProps {
  results: TVShow[];
  searchQuery: string;
  theme: Theme;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export default function SearchResultsList({
  results,
  searchQuery,
  theme,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
}: SearchResultsListProps) {
  const showEmptyState = !isLoadingMore && results.length === 0;

  return (
    <FlatList
      testID="search-results-list"
      data={results}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => <SearchResultItem item={item} theme={theme} />}
      contentContainerStyle={styles.resultsList}
      onEndReached={() => {
        if (hasMore && !isLoadingMore) {
          onLoadMore?.();
        }
      }}
      onEndReachedThreshold={0.4}
      ListEmptyComponent={
        showEmptyState ? (
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            {searchQuery.length > 0 ? 'No results found' : 'Start typing to search for TV shows'}
          </Text>
        ) : null
      }
      ListFooterComponent={
        isLoadingMore ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  resultsList: {
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
  },
  footerLoader: {
    paddingVertical: 16,
  },
});