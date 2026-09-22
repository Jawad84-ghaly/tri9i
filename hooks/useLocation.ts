import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { config } from '../constants/config';
import { demoOrigin } from '../data/demo';
import type { Coordinate } from '../types/navigation';

export type Fix = Coordinate & { heading: number; accuracy: number; timestamp: number };
export function useForeground() {
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => sub.remove();
  }, []);
  return foreground;
}
export function useLocation(foreground: boolean) {
  const [fix, setFix] = useState<Fix | null>(config.demo ? { ...demoOrigin, accuracy: 0, heading: 0, timestamp: Date.now() } : null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (config.demo || !foreground) return;
    let cancelled = false;
    let subscription: Location.LocationSubscription | undefined;
    setError(false);
    void (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (permission.status !== 'granted' || !await Location.hasServicesEnabledAsync()) { setError(true); return; }
        if (cancelled) return;
        subscription = await Location.watchPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 3,
        }, position => {
          if (!cancelled) {
            setError(false);
            setFix({ latitude: position.coords.latitude, longitude: position.coords.longitude,
              accuracy: position.coords.accuracy ?? 999, heading: position.coords.heading ?? 0, timestamp: position.timestamp });
          }
        }, () => { if (!cancelled) setError(true); });
        if (cancelled) subscription.remove();
      } catch { if (!cancelled) setError(true); }
    })();
    return () => { cancelled = true; subscription?.remove(); };
  }, [foreground, attempt]);
  return { fix, setFix, error, retry: () => setAttempt(n => n + 1) };
}
