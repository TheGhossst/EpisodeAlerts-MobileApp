export const TMDB_CONFIG = {
  BASE_URL: 'https://api.themoviedb.org/3',
  IMAGE_BASE_URL: 'https://image.tmdb.org/t/p',
  POSTER_SIZES: {
    SMALL: 'w185',
    MEDIUM: 'w342',
    LARGE: 'w500',
    ORIGINAL: 'original'
  },
  BACKDROP_SIZES: {
    SMALL: 'w300',
    MEDIUM: 'w780',
    LARGE: 'w1280',
    ORIGINAL: 'original'
  }
};

const env = process.env;
export const API_KEY = env.EXPO_PUBLIC_TMDB_API_KEY || env.TMDB_API_KEY || '';

export const FIREBASE_CONFIG = {
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured =
  !!FIREBASE_CONFIG.apiKey &&
  !!FIREBASE_CONFIG.authDomain &&
  !!FIREBASE_CONFIG.projectId &&
  !!FIREBASE_CONFIG.appId;

if (!API_KEY) {
  console.warn('TMDB API key not found in environment variables. API requests will fail.');
}

if (!isFirebaseConfigured) {
  console.warn('Firebase config is missing. Cloud sync will be disabled.');
}