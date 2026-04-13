import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, type Theme } from '@/app/context/ThemeContext';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastMessageProps {
  text1?: string;
  text2?: string;
}

interface VariantTokens {
  accent: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
}

function getVariantTokens(theme: Theme, variant: ToastVariant): VariantTokens {
  if (variant === 'success') {
    return {
      accent: theme.dark ? '#2DD4BF' : '#16A34A',
      iconName: 'checkmark-circle-outline',
    };
  }

  if (variant === 'error') {
    return {
      accent: theme.colors.error,
      iconName: 'alert-circle-outline',
    };
  }

  return {
    accent: theme.colors.accent,
    iconName: 'information-circle-outline',
  };
}

function AppToastCard({
  text1,
  text2,
  variant,
}: ToastMessageProps & { variant: ToastVariant }) {
  const { theme } = useTheme();
  const tokens = getVariantTokens(theme, variant);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: tokens.accent,
          shadowColor: theme.dark ? '#000000' : '#111827',
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: tokens.accent }]}>
        <Ionicons name={tokens.iconName} size={18} color="#FFFFFF" />
      </View>

      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
          {text1 || 'Update'}
        </Text>
        {text2 ? (
          <Text style={[styles.message, { color: theme.colors.textSecondary }]} numberOfLines={3}>
            {text2}
          </Text>
        ) : null}
      </View>

      <TouchableOpacity onPress={() => Toast.hide()} style={styles.closeButton} hitSlop={8}>
        <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

export default function AppToast() {
  const insets = useSafeAreaInsets();

  const config = useMemo(
    () => ({
      success: (props: ToastMessageProps) => <AppToastCard {...props} variant="success" />,
      error: (props: ToastMessageProps) => <AppToastCard {...props} variant="error" />,
      info: (props: ToastMessageProps) => <AppToastCard {...props} variant="info" />,
    }),
    [],
  );

  return (
    <Toast
      config={config}
      position="bottom"
      bottomOffset={insets.bottom + 82}
      visibilityTime={3500}
      autoHide
    />
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  textWrap: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  message: {
    marginTop: 3,
    fontSize: 12.5,
    lineHeight: 18,
  },
  closeButton: {
    paddingTop: 2,
    paddingHorizontal: 2,
  },
});