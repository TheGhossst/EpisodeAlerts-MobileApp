# Episode Alerts

<div align="center">
  <img src="assets/images/icon.png" alt="Episode Alerts Logo" width="200"/>
  <h3>Never miss your favorite TV shows again!</h3>
</div>

## 📱 Overview

Episode Alerts is a React Native mobile application that helps you track your favorite TV shows and receive notifications for upcoming episodes. Built with Expo and TypeScript, this app uses TMDB API to provide comprehensive information about TV shows, their seasons, episodes, and air dates.

## ✨ Features

- **Show Discovery**: Browse popular, top-rated, and currently airing TV shows
- **Show Details**: Access detailed information about TV shows, including seasons, episodes, ratings, and more
- **Watchlist Management**: Add/remove shows to/from your personal watchlist
- **Episode Tracking**: View upcoming episodes for shows in your watchlist
- **Notifications**: Receive notifications for upcoming episodes
- **Image Caching**: Efficient image loading with caching for performance
- **Customizable Themes**: Choose between light and dark themes
- **User Preferences**: Personalize your experience with customizable settings
- **Offline Support**: View previously loaded content even when offline
- **Analytics**: Basic usage tracking for app improvements (optional, can be disabled)

## 📋 Prerequisites

- Node.js (v14 or newer)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- TMDB API key (get one at [themoviedb.org](https://www.themoviedb.org/settings/api))

## 🛠️ Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/EpisodeAlerts.git
   cd EpisodeAlertMobileApp/EpisodeAlerts
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file in the root directory and add your TMDB API key:
   ```
   TMDB_API_KEY=your_tmdb_api_key_here
   ```

4. Start the development server:
   ```bash
   npm start
   # or
   yarn start
   ```

5. Use the Expo Go app on your mobile device to scan the QR code, or run on an emulator/simulator.

## 📂 Project Structure

```
EpisodeAlerts/
├── app/                       # Main application code
│   ├── (tabs)/                # Tab-based screens
│   │   ├── index.tsx          # Home screen
│   │   ├── search.tsx         # Search screen
│   │   ├── watchlist.tsx      # Watchlist screen
│   │   ├── settings.tsx       # Settings screen
│   │   └── _layout.tsx        # Tab layout configuration
│   ├── components/            # Reusable UI components
│   │   ├── CachedImage.tsx    # Image component with caching
│   │   ├── EpisodeCountdown.tsx # Countdown timer component
│   │   ├── FeaturedShowBanner.tsx # Featured show component
│   │   ├── ShowCard.tsx       # TV show card component
│   │   ├── ShowList.tsx       # List of TV shows component
│   │   └── SkeletonLoader.tsx # Loading skeleton component
│   ├── context/               # React Context providers
│   │   └── ThemeContext.tsx   # Theme context provider
│   ├── services/              # Service classes
│   │   ├── AnalyticsService.ts # Analytics tracking service
│   │   ├── ImageCacheService.ts # Image caching service
│   │   ├── NotificationService.ts # Push notification service
│   │   ├── TMDBService.ts     # TMDB API service
│   │   ├── UserPreferencesService.ts # User preferences service
│   │   └── WatchlistService.ts # Watchlist management service
│   ├── show-details.tsx       # Show details screen
│   └── season-details.tsx     # Season details screen
├── assets/                    # Static assets (images, fonts)
├── components/                # Legacy or global components
├── constants/                 # Application constants
│   └── Config.ts              # Configuration constants
├── .env                       # Environment variables (not in git)
├── babel.config.js            # Babel configuration
├── env.d.ts                   # TypeScript declarations for env vars
├── package.json               # Project dependencies
└── tsconfig.json              # TypeScript configuration
```

## 🌐 API Integration

Episode Alerts uses The Movie Database (TMDB) API to fetch TV show data. To use the app, you'll need to:

1. Create an account at [themoviedb.org](https://www.themoviedb.org/signup)
2. Go to [API settings](https://www.themoviedb.org/settings/api) to get your API key/token
3. Add your API key to the `.env` file as described in the installation section

## 🔧 Environment Variables

The application uses environment variables for security and configuration:

```
TMDB_API_KEY=your_tmdb_api_key_here
```

This key is loaded using `react-native-dotenv` and should never be committed to your repository. The `.env` file is already added to `.gitignore`.

## 📱 Usage

### Home Screen
The home screen displays a featured show, shows airing today, popular shows, and top-rated shows. You can scroll horizontally through each category to discover new content.

### Search
Use the search screen to find TV shows by title. Results will display relevant shows with basic information.

### Watchlist
The watchlist screen shows all the TV shows you've added to your watchlist. You can:
- View shows with upcoming episodes
- Sort shows by name, date added, or next episode
- Filter shows by genre or status
- Switch between grid and list views
- Long-press a show to remove it from your watchlist

### Show Details
Tap on any show to see detailed information including:
- Show description, rating, and status
- Next episode information with countdown timer
- Last aired episode details
- Complete list of seasons and episodes
- Creator information

### Settings
The settings screen allows you to customize your experience:
- Change theme (Light/Dark/System)
- Enable/disable push notifications
- Manage image caching
- Control analytics preferences
- View app version information

## 📲 Push Notifications

Episode Alerts can send push notifications for upcoming episodes of shows in your watchlist. To enable this feature:

1. Go to the Settings screen
2. Toggle on "Push Notifications"
3. Add shows to your watchlist

The app will automatically schedule notifications for upcoming episodes of shows in your watchlist.

## 🎨 Theming

Episode Alerts supports both light and dark themes. You can:

1. Go to the Settings screen
2. Select your preferred theme (Light/Dark/System)
3. If set to "System", the app will follow your device's theme settings

## 📊 Analytics

The app includes basic analytics to help improve the user experience. Analytics tracking includes:

- Screen views
- Watchlist actions
- Search queries
- Settings changes

Analytics are opt-in and can be disabled in the Settings screen.

## 🧰 Tech Stack

- **React Native**: Core framework for building the mobile app
- **Expo**: Development platform simplifying React Native development
- **TypeScript**: Type-safe JavaScript for better code quality
- **AsyncStorage**: Local storage for user preferences and watchlist
- **Expo Notifications**: Push notifications for upcoming episodes
- **Expo FileSystem**: File system access for image caching
- **React Navigation**: Navigation between screens
- **Reanimated**: Smooth animations throughout the app
- **Linear Gradient**: Gradient effects for UI components
- **React Native Dotenv**: Environment variable management

## 🚀 Building for Production

To create a production build:

### For Expo EAS Build

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Configure your project for EAS Build:
   ```bash
   eas build:configure
   ```

3. Create a build:
   ```bash
   # For Android
   eas build --platform android
   
   # For iOS
   eas build --platform ios
   ```

### For Local Builds

#### Android

1. Run the build command:
   ```bash
   expo build:android
   ```

2. Choose between APK and AAB format when prompted.

#### iOS

1. Run the build command:
   ```bash
   expo build:ios
   ```

2. Follow the prompts to generate an iOS build.

## 🔍 Troubleshooting

### Common Issues

- **API Key Not Working**: Ensure your TMDB API key is correctly added to the `.env` file and you've restarted the development server.
- **Images Not Loading**: Check your internet connection. The app caches images but needs to download them first.
- **Notifications Not Working**: Make sure you've granted the necessary permissions for the app to send notifications.

### Debug Mode

To run the app in debug mode with more detailed logging:

```bash
npm start -- --dev
```

## 👥 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code follows the project's coding style and includes appropriate tests.


## 🙏 Acknowledgements

- [The Movie Database (TMDB)](https://www.themoviedb.org/) for providing the API
- [Expo](https://expo.dev/) for the excellent React Native development platform
- [React Navigation](https://reactnavigation.org/) for the navigation system

---
