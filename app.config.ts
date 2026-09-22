import type { ConfigContext, ExpoConfig } from 'expo/config';

// Google Maps on Android; Apple Maps on iOS. Mapbox is the routing/search API.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'طريقي', slug: config.slug ?? 'tri9i-darija',
  plugins: [
    ...(config.plugins ?? []),
    ['react-native-maps', { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? '' }],
  ],
});
