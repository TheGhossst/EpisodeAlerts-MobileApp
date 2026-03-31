import React from 'react';
import { StyleSheet, Text } from 'react-native';
import type { Theme } from '@/app/context/ThemeContext';

interface SettingsSectionHeaderProps {
  title: string;
  theme: Theme;
}

export default function SettingsSectionHeader({ title, theme }: SettingsSectionHeaderProps) {
  return <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>;
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
});