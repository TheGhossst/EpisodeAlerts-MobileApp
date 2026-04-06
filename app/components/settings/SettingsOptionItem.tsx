import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import type { Theme } from '@/app/context/ThemeContext';
import type { SettingOption } from './_types';

interface SettingsOptionItemProps {
  item: SettingOption;
  theme: Theme;
  imageCacheEnabled: boolean;
}

export default function SettingsOptionItem({
  item,
  theme,
  imageCacheEnabled,
}: SettingsOptionItemProps) {
  const isCacheActionDisabled = item.id === 'cacheSize' && !imageCacheEnabled;
  const isActionDisabled = !!item.disabled || isCacheActionDisabled;

  const getButtonBackground = () => {
    if (item.buttonIntent === 'danger') {
      return theme.dark ? 'rgba(244,67,54,0.2)' : '#FDEDED';
    }

    if (item.buttonIntent === 'primary') {
      return theme.colors.primary;
    }

    return theme.colors.secondary;
  };

  const getButtonTextColor = () => {
    if (item.buttonIntent === 'primary') {
      return '#FFFFFF';
    }

    if (item.buttonIntent === 'danger') {
      return theme.colors.error;
    }

    return theme.colors.text;
  };

  return (
    <View style={[styles.settingContainer, { backgroundColor: theme.colors.card }]}> 
      <View style={styles.settingTextContainer}>
        <Text style={[styles.settingTitle, { color: theme.colors.text }]}>{item.title}</Text>
        <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
          {item.description}
        </Text>
      </View>

      {item.type === 'toggle' && (
        <Switch
          value={item.value as boolean}
          onValueChange={(value) => item.onValueChange?.(value)}
          trackColor={{ false: '#767577', true: theme.colors.primary }}
          thumbColor="#f4f3f4"
        />
      )}

      {item.type === 'button' && item.onPress && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: getButtonBackground() }]}
          onPress={item.onPress}
          disabled={isActionDisabled}
        >
          <Text
            style={[
              styles.buttonText,
              { color: getButtonTextColor() },
              isActionDisabled ? styles.buttonTextDisabled : null,
            ]}
          >
            {item.buttonLabel || (item.id === 'cacheSize' ? 'Clear' : 'Select')}
          </Text>
        </TouchableOpacity>
      )}

      {item.type === 'select' && (
        <View style={styles.selectContainer}>
          {item.options?.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.selectOption,
                {
                  backgroundColor:
                    item.value === option.value ? theme.colors.primary : theme.colors.secondary,
                },
              ]}
              onPress={() => item.onValueChange?.(option.value)}
            >
              <Text
                style={[
                  styles.selectOptionText,
                  { color: item.value === option.value ? '#ffffff' : theme.colors.text },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  settingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonTextDisabled: {
    opacity: 0.5,
  },
  selectContainer: {
    flexDirection: 'column',
  },
  selectOption: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginBottom: 6,
    alignItems: 'center',
  },
  selectOptionText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});