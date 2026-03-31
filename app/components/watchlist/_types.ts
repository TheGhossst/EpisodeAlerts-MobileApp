export type SortOption = 'name' | 'date_added' | 'next_episode';

export interface SortConfig {
  by: SortOption;
  ascending: boolean;
}

export interface FilterOptions {
  genres: number[];
  status: string[];
}

// Expo Router scans files under app/ as routes; this keeps helper files warning-free.
export default function WatchlistTypesRouteShim(): null {
  return null;
}