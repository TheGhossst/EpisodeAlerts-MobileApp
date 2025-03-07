import React from 'react';
import { useRouter } from 'expo-router';


export const useNavigation = () => {
  const router = useRouter();

  return {
    navigate: (screen: string, params?: any) => {
      if (screen === 'ShowDetails' && params?.show) {
        router.push({
          pathname: '/show-details',
          params: { id: params.show.id }
        });
      } else if (screen === 'SeasonDetails' && params?.tvId && params?.seasonNumber) {
        router.push({
          pathname: '/season-details',
          params: {
            id: params.tvId,
            season: params.seasonNumber
          }
        });
      } else if (screen === 'Home') {
        router.push('/');
      } else if (screen === 'Search') {
        router.push('/search');
      } else if (screen === 'Watchlist') {
        router.push('/watchlist');
      }
    },
    goBack: () => router.back()
  };
};

// A dummy Navigation component that doesn't actually render anything
// Since navigation is handled by Expo Router
const Navigation = () => {
  return null;
};

export default Navigation; 