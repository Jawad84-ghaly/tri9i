import type { Coordinate, Destination, RoadAlert, Route } from '../types/navigation';
import { distance } from '../utils/geo';
import { estimateFuel, selectOptions } from '../services/routingService';

export const demoOrigin: Coordinate = { latitude: 33.588, longitude: -7.632 };
export const demoDestination: Destination = { id: 'demo', name: 'دورة تجريبية فـ كازا', coordinate: { latitude: 33.599, longitude: -7.621 } };
function makeRoute(id: string, line: Coordinate[], duration: number, tollFree: boolean): Route {
  const length = line.slice(1).reduce((sum, p, i) => sum + distance(line[i]!, p), 0);
  return { id, geometry: line, duration, distance: length, tollFree, fuelLiters: estimateFuel(length, duration),
    trafficAvailable: false, fetchedAt: Date.now(), alerts: [],
    steps: line.map((p, i) => ({ coordinate: p, type: i === 0 ? 'depart' : i === line.length - 1 ? 'arrive' : 'turn',
      modifier: i % 2 ? 'right' : 'left', distance: line[i + 1] ? distance(p, line[i + 1]!) : 0,
      geometry: [p, line[i + 1] ?? p] })),
  };
}
export function demoOptions() {
  const end = demoDestination.coordinate;
  return selectOptions([
    makeRoute('demo-fast', [demoOrigin, { latitude: 33.588, longitude: -7.619 }, { latitude: 33.599, longitude: -7.619 }, end], 330, false),
    makeRoute('demo-short', [demoOrigin, { latitude: 33.594, longitude: -7.629 }, end], 520, false),
  ], [makeRoute('demo-eco', [demoOrigin, { latitude: 33.594, longitude: -7.632 }, { latitude: 33.594, longitude: -7.621 }, end], 420, true)]);
}
export function demoAlerts(): RoadAlert[] {
  return (['radar', 'construction', 'accident', 'traffic', 'police'] as const).map((kind, i) => ({
    id: `demo-${i}`, kind, coordinate: { latitude: 33.589 + i * 0.002, longitude: -7.621 },
    createdAt: Date.now(), expiresAt: Date.now() + 3600_000, source: 'demo',
  }));
}
// Interpolated movement, explicitly simulated. No location permission in demo mode.
export function demoPosition(route: Route, progress: number): Coordinate {
  const lengths = route.geometry.slice(1).map((p, i) => distance(route.geometry[i]!, p));
  let remaining = lengths.reduce((a, b) => a + b, 0) * Math.min(1, Math.max(0, progress));
  for (let i = 0; i < lengths.length; i++) {
    const length = lengths[i]!;
    if (remaining <= length) {
      const a = route.geometry[i]!, b = route.geometry[i + 1]!, t = remaining / (length || 1);
      return { latitude: a.latitude + (b.latitude - a.latitude) * t, longitude: a.longitude + (b.longitude - a.longitude) * t };
    }
    remaining -= length;
  }
  return route.geometry[route.geometry.length - 1]!;
}
