import React from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import { TVShow } from '@/app/services/TMDBService';
import type { Theme } from '@/app/context/ThemeContext';
import SearchResultItem from './SearchResultItem';

interface SearchResultsListProps {
  results: TVShow[];
  searchQuery: string;
  theme: Theme;
}

export default function SearchResultsList({ results, searchQuery, theme }: SearchResultsListProps) {
  return (
    <FlatList
      data={results}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => <SearchResultItem item={item} theme={theme} />}
      contentContainerStyle={styles.resultsList}
      ListEmptyComponent={
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          {searchQuery.length > 0 ? 'No results found' : 'Start typing to search for TV shows'}
        </Text>
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
});