import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import UserPreferencesService, { ThemeType } from '../services/UserPreferencesService';

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
  
  const initialTheme = systemColorScheme === 'dark' ? DarkTheme : LightTheme;
  
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        await UserPreferencesService.initialize();
        const userThemeMode = UserPreferencesService.getTheme();
        await updateTheme(userThemeMode);
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing theme:', error);
        setIsInitialized(true);
      }
    };
    
    initializeTheme();
  }, []);
  
  useEffect(() => {
    if (isInitialized && theme.mode === 'system') {
      const newTheme = systemColorScheme === 'dark' ? DarkTheme : LightTheme;
      newTheme.mode = 'system';
      setThemeState(newTheme);
    }
  }, [systemColorScheme, isInitialized, theme.mode]);
  
  const updateTheme = async (mode: ThemeType) => {
    try {
      let newTheme: Theme;
      
      if (mode === 'system') {
        newTheme = systemColorScheme === 'dark' ? DarkTheme : LightTheme;
        newTheme.mode = 'system';
      } else if (mode === 'dark') {
        newTheme = DarkTheme;
      } else {
        newTheme = LightTheme;
      }
      
      setThemeState(newTheme);
      
      await UserPreferencesService.setTheme(mode);
    } catch (error) {
      console.error('Error updating theme:', error);
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