import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import UserPreferencesService, { ThemeType } from '../services/UserPreferencesService';
import { reportError } from '@/app/utils/errorHandling';

export interface ThemeColors {
  // Background colors
  background: string;
  card: string;
  surface: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textDisabled: string;
  
  // UI colors
  primary: string;
  secondary: string;
  accent: string;
  error: string;
  
  // Other colors
  border: string;
  divider: string;
}

export interface Theme {
  dark: boolean;
  mode: ThemeType;
  colors: ThemeColors;
}

const DarkTheme: Theme = {
  dark: true,
  mode: 'dark',
  colors: {
    background: '#121212',
    card: '#1a1a1a',
    surface: '#222222',
    
    text: '#ffffff',
    textSecondary: '#cccccc',
    textDisabled: '#777777',
    
    primary: '#e50914',
    secondary: '#333333',
    accent: '#29b6f6',
    error: '#f44336',
    
    border: '#333333',
    divider: '#2a2a2a',
  },
};

const LightTheme: Theme = {
  dark: false,
  mode: 'light',
  colors: {
    background: '#f5f5f5',
    card: '#ffffff',
    surface: '#f0f0f0',
    
    text: '#121212',
    textSecondary: '#555555',
    textDisabled: '#999999',
    
    primary: '#e50914',
    secondary: '#e6e6e6',
    accent: '#0277bd',
    error: '#d32f2f',
    
    border: '#dddddd',
    divider: '#e0e0e0',
  },
};

const resolveTheme = (
  mode: ThemeType,
  systemColorScheme: ReturnType<typeof useColorScheme>
): Theme => {
  const prefersDark = systemColorScheme === 'dark';

  if (mode === 'system') {
    const base = prefersDark ? DarkTheme : LightTheme;
    return {
      dark: base.dark,
      mode: 'system',
      colors: { ...base.colors },
    };
  }

  if (mode === 'dark') {
    return {
      dark: true,
      mode: 'dark',
      colors: { ...DarkTheme.colors },
    };
  }

  return {
    dark: false,
    mode: 'light',
    colors: { ...LightTheme.colors },
  };
};

interface ThemeContextType {
  theme: Theme;
  setTheme: (mode: ThemeType) => Promise<void>;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: DarkTheme,
  setTheme: async () => {},
  isDark: true,
});

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();

  const [theme, setThemeState] = useState<Theme>(resolveTheme('system', systemColorScheme));
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        await UserPreferencesService.initialize();
        const userThemeMode = UserPreferencesService.getTheme();
        setThemeState(resolveTheme(userThemeMode, systemColorScheme));
        setIsInitialized(true);
      } catch (error) {
        reportError('ThemeContext.initializeTheme', error, {
          fallbackMessage: 'Failed to initialize app theme.',
        });
        setIsInitialized(true);
      }
    };
    
    initializeTheme();
  }, []);
  
  useEffect(() => {
    if (isInitialized && theme.mode === 'system') {
      setThemeState(resolveTheme('system', systemColorScheme));
    }
  }, [systemColorScheme, isInitialized, theme.mode]);
  
  const updateTheme = async (mode: ThemeType) => {
    try {
      setThemeState(resolveTheme(mode, systemColorScheme));
      await UserPreferencesService.setTheme(mode);
    } catch (error) {
      reportError('ThemeContext.updateTheme', error, {
        fallbackMessage: 'Failed to update app theme.',
      });
    }
  };
  
  const contextValue: ThemeContextType = {
    theme,
    setTheme: updateTheme,
    isDark: theme.dark,
  };
  
  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export { DarkTheme, LightTheme }; 

export default ThemeProvider;