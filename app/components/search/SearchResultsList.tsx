import React from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import { TVShow } from '@/app/services/TMDBService';
import SearchResultItem from './SearchResultItem';

interface SearchResultsListProps {
  results: TVShow[];
  searchQuery: string;
}

export default function SearchResultsList({ results, searchQuery }: SearchResultsListProps) {
  return (
    <FlatList
      data={results}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => <SearchResultItem item={item} />}
      contentContainerStyle={styles.resultsList}
      ListEmptyComponent={
        <Text style={styles.emptyText}>
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
    color: '#666666',
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
  },
});