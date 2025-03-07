import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { TVShow } from '@/app/services/TMDBService';
import ShowCard from './ShowCard';
import { Theme } from '@/app/context/ThemeContext';
import Animated, { FadeInRight } from 'react-native-reanimated';

interface ShowListProps {
  title: string;
  shows: TVShow[];
  isLoading?: boolean;
  error?: string | null;
  showSize?: 'small' | 'medium' | 'large';
  horizontal?: boolean;
}

const ShowList: React.FC<ShowListProps> = ({
  title,
  shows,
  isLoading = false,
  error = null,
  showSize = 'medium',
  horizontal = true,
}) => {
  const renderItem = ({ item, index }: { item: TVShow; index: number }) => (
    <Animated.View 
      entering={FadeInRight.delay(index * 100).duration(400)}
    >
      <ShowCard show={item} size={showSize} />
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e50914" />
        </View>
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={shows}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          horizontal={horizontal}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            !horizontal && styles.gridContent
          ]}
          numColumns={horizontal ? 1 : 2}
          key={horizontal ? 'horizontal' : 'grid'}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No shows available</Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  gridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#e50914',
    fontSize: 14,
    paddingHorizontal: 16,
  },
  emptyText: {
    color: '#666666',
    fontSize: 14,
    paddingVertical: 20,
  },
});

export default ShowList; 