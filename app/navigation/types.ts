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