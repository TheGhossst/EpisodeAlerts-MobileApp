import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import type { Theme } from '@/app/context/ThemeContext';

interface SearchBarProps {
  value: string;
  onChangeText: (query: string) => void;
  theme: Theme;
}

export default function SearchBar({ value, onChangeText, theme }: SearchBarProps) {
  return (
    <View style={[styles.searchContainer, { backgroundColor: theme.colors.card }]}>
      <TextInput
        style={[
          styles.searchInput,
          {
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            borderColor: theme.colors.border,
          },
        ]}
        placeholder="Search TV shows..."
        placeholderTextColor={theme.colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    fontSize: 16,
  },
});