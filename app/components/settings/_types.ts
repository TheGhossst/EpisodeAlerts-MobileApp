export interface SettingOption {
  id: string;
  title: string;
  description: string;
  type: 'toggle' | 'select' | 'button';
  value?: boolean | string;
  options?: { label: string; value: string }[];
  onPress?: () => void;
  onValueChange?: (value: boolean | string) => void;
  buttonLabel?: string;
  disabled?: boolean;
  buttonIntent?: 'default' | 'primary' | 'danger';
}

export interface SettingSection {
  title: string;
  data: SettingOption[];
}

// Expo Router scans files under app/ as routes; this keeps helper files warning-free.
export default function SettingsTypesRouteShim(): null {
  return null;
}