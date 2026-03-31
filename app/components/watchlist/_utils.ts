interface EpisodeLike {
  season_number?: number;
  episode_number?: number;
}

export const formatEpisodeText = (episode: EpisodeLike | null | undefined): string => {
  if (!episode) {
    return '';
  }

  return `S${episode.season_number} E${episode.episode_number}`;
};

// Expo Router scans files under app/ as routes; this keeps helper files warning-free.
export default function WatchlistUtilsRouteShim(): null {
  return null;
}