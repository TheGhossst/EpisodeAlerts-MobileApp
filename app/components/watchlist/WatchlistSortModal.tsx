import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { SlideInRight, SlideOutRight } from 'react-native-reanimated';
import type { Theme } from '@/app/context/ThemeContext';
import type { SortConfig, SortOption } from './_types';

interface WatchlistSortModalProps {
  visible: boolean;
  theme: Theme;
  sortConfig: SortConfig;
  onClose: () => void;
  onSort: (by: SortOption) => void;
}

export default function WatchlistSortModal({
  visible,
  theme,
  sortConfig,
  onClose,
  onSort,
}: WatchlistSortModalProps) {
  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <Animated.View
          style={[styles.modalContent, { backgroundColor: theme.colors.card }]}
          entering={SlideInRight.duration(300)}
          exiting={SlideOutRight.duration(300)}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Sort By</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.sortOptions}>
            <TouchableOpacity style={styles.sortOption} onPress={() => onSort('name')}>
              <Text style={[styles.sortOptionText, { color: theme.colors.text }]}>Show Name</Text>
              {sortConfig.by === 'name' && (
                <Ionicons
                  name={sortConfig.ascending ? 'arrow-up' : 'arrow-down'}
                  size={18}
                  color={theme.colors.primary}
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.sortOption} onPress={() => onSort('date_added')}>
              <Text style={[styles.sortOptionText, { color: theme.colors.text }]}>Date Added</Text>
              {sortConfig.by === 'date_added' && (
                <Ionicons
                  name={sortConfig.ascending ? 'arrow-up' : 'arrow-down'}
                  size={18}
                  color={theme.colors.primary}
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.sortOption} onPress={() => onSort('next_episode')}>
              <Text style={[styles.sortOptionText, { color: theme.colors.text }]}>Next Episode</Text>
              {sortConfig.by === 'next_episode' && (
                <Ionicons
                  name={sortConfig.ascending ? 'arrow-up' : 'arrow-down'}
                  size={18}
                  color={theme.colors.primary}
                />
              )}
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
    width: '70%',
    maxHeight: 'auto',
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
  sortOptions: {
    padding: 16,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  sortOptionText: {
    fontSize: 16,
  },
});