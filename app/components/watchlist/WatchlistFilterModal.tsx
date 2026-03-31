import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { SlideInRight, SlideOutRight } from 'react-native-reanimated';
import type { Theme } from '@/app/context/ThemeContext';
import type { Genre } from '@/app/services/TMDBService';
import type { FilterOptions } from './_types';

interface WatchlistFilterModalProps {
  visible: boolean;
  theme: Theme;
  availableGenres: Genre[];
  availableStatuses: string[];
  filterOptions: FilterOptions;
  onClose: () => void;
  onToggleGenre: (genreId: number) => void;
  onToggleStatus: (status: string) => void;
  onClearFilters: () => void;
}

export default function WatchlistFilterModal({
  visible,
  theme,
  availableGenres,
  availableStatuses,
  filterOptions,
  onClose,
  onToggleGenre,
  onToggleStatus,
  onClearFilters,
}: WatchlistFilterModalProps) {
  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <Animated.View
          style={[styles.modalContent, { backgroundColor: theme.colors.card }]}
          entering={SlideInRight.duration(300)}
          exiting={SlideOutRight.duration(300)}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Filter Shows</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScrollContent}>
            {availableGenres.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={[styles.filterTitle, { color: theme.colors.text }]}>Genres</Text>
                <View style={styles.filterOptionsContainer}>
                  {availableGenres.map((genre) => (
                    <TouchableOpacity
                      key={genre.id}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: filterOptions.genres.includes(genre.id)
                            ? theme.colors.primary
                            : theme.colors.secondary,
                        },
                      ]}
                      onPress={() => onToggleGenre(genre.id)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          {
                            color: filterOptions.genres.includes(genre.id) ? '#FFF' : theme.colors.text,
                          },
                        ]}
                      >
                        {genre.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {availableStatuses.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={[styles.filterTitle, { color: theme.colors.text }]}>Status</Text>
                <View style={styles.filterOptionsContainer}>
                  {availableStatuses.map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: filterOptions.status.includes(status)
                            ? theme.colors.primary
                            : theme.colors.secondary,
                        },
                      ]}
                      onPress={() => onToggleStatus(status)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          {
                            color: filterOptions.status.includes(status) ? '#FFF' : theme.colors.text,
                          },
                        ]}
                      >
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.footerButton, { borderColor: theme.colors.border }]}
              onPress={onClearFilters}
            >
              <Text style={[styles.footerButtonText, { color: theme.colors.text }]}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, { backgroundColor: theme.colors.primary }]}
              onPress={onClose}
            >
              <Text style={[styles.footerButtonText, { color: '#FFF' }]}>Apply</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxHeight: '80%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalScrollContent: {
    padding: 16,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  filterOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  filterChipText: {
    fontSize: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  footerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  footerButtonText: {
    fontWeight: 'bold',
  },
});