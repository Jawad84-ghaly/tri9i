export const config = {
  // No automatic fake-data fallback after a network failure.
  demo: process.env.EXPO_PUBLIC_DEMO_MODE !== 'false',
  mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '',
  alertsUrl: (process.env.EXPO_PUBLIC_ALERTS_URL ?? '').replace(/\/$/, ''),
  alertPollMs: 15_000,
  trafficRefreshMs: 90_000,
};
