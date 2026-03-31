import { NavigatorScreenParams } from '@react-navigation/native';
import { TVShow } from '../services/TMDBService';

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  ShowDetails: { show: TVShow };
  SeasonDetails: { tvId: number; seasonNumber: number };
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Watchlist: undefined;
}; 

// This file is a shared type module; return null if Expo Router treats it as a route.
export default function NavigationTypesRoute() {
  return null;
}