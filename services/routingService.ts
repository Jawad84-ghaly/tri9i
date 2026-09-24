import { z } from 'zod';
import { config } from '../constants/config';
import type { Coordinate, RoadAlert, Route, RouteOption } from '../types/navigation';
import { isCoordinate } from '../utils/geo';
import { jsonRequest } from './http';

const position = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
const geometry = z.object({ coordinates: z.array(position).min(2) });
const incident = z.object({
  id: z.union([z.string(), z.number()]), type: z.string(), geometry_index_start: z.number().int().nonnegative(),
  creation_time: z.string().optional(), end_time: z.string().optional(),
});
const rawRoute = z.object({
  distance: z.number().nonnegative(), duration: z.number().nonnegative(), geometry,
  legs: z.array(z.object({
    steps: z.array(z.object({
      distance: z.number().nonnegative(), geometry: z.object({ coordinates: z.array(position).min(1) }),
      maneuver: z.object({ location: position, type: z.string(), modifier: z.string().optional(), exit: z.number().optional() }),
      intersections: z.array(z.object({ classes: z.array(z.string()).optional() })).optional(),
    })).min(1),
    annotation: z.object({ congestion: z.array(z.string()).optional() }).optional(),
    incidents: z.array(incident).optional(),
    notifications: z.array(z.object({ type: z.string(), subtype: z.string().optional() })).optional(),
  })).min(1),
});
const responseSchema = z.object({ code: z.literal('Ok'), routes: z.array(rawRoute).min(1) });
type RawRoute = z.infer<typeof rawRoute>;
const coord = (p: [number, number]): Coordinate => ({ latitude: p[1], longitude: p[0] });

// Transparent proxy: 6.5 L/100 km + 0.6 L/hour. Not a vehicle-specific fuel model.
export function estimateFuel(meters: number, seconds: number): number {
  return meters / 100_000 * 6.5 + seconds / 3600 * 0.6;
}
export function routeFingerprint(route: Route): string {
  return route.geometry.map(p => `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`).join(';');
}
function normalize(raw: RawRoute, tollExcluded: boolean, traffic: boolean): Route {
  const now = Date.now(), line = raw.geometry.coordinates.map(coord);
  const steps = raw.legs.flatMap(leg => leg.steps);
  // Exclude=toll can still violate the exclusion: never mark these as toll-free.
  const hasToll = steps.some(s => s.intersections?.some(i => i.classes?.includes('toll')))
    || raw.legs.some(leg => leg.notifications?.some(n => n.type === 'violation' && n.subtype === 'toll'));
  const alerts: RoadAlert[] = [];
  // Exactly two waypoints => one leg; incident indices are local to this leg.
  for (const item of raw.legs[0]?.incidents ?? []) {
    const kind = ({ accident: 'accident', construction: 'construction', congestion: 'traffic' } as Partial<Record<string, RoadAlert['kind']>>)[item.type];
    const location = line[item.geometry_index_start];
    const reportedEnd = item.end_time ? Date.parse(item.end_time) : NaN;
    const expiresAt = Number.isFinite(reportedEnd) ? Math.min(reportedEnd, now + 5 * 60_000) : now + 5 * 60_000;
    if (kind && location && expiresAt > now) alerts.push({
      id: `mapbox-${item.id}`, kind, coordinate: location, createdAt: now, expiresAt, source: 'mapbox',
    });
  }
  return {
    id: `${tollExcluded ? 'tollfree' : 'regular'}-${Math.round(raw.distance)}-${Math.round(raw.duration)}`,
    distance: raw.distance, duration: raw.duration, geometry: line, tollFree: tollExcluded && !hasToll,
    steps: steps.map(s => ({ coordinate: coord(s.maneuver.location), type: s.maneuver.type,
      modifier: s.maneuver.modifier, exit: s.maneuver.exit, distance: s.distance, geometry: s.geometry.coordinates.map(coord) })),
    fuelLiters: estimateFuel(raw.distance, raw.duration),
    // An annotation proves traffic data was returned, not that every segment is live.
    trafficAvailable: traffic && raw.legs.some(l => l.annotation?.congestion?.some(v => v !== 'unknown')),
    alerts, fetchedAt: now,
  };
}

export function selectOptions(regular: Route[], tollFree: Route[]): RouteOption[] {
  const all = [...regular, ...tollFree];
  const min = (items: Route[], score: (r: Route) => number) => [...items].sort((a, b) => score(a) - score(b))[0] ?? null;
  // Prefer an actual toll-free result. If exclusion could not be satisfied, only
  // consider the avoidance query, and explicitly warn that tolls remain possible.
  // Mapbox does not supply toll prices: this cannot promise the cheapest toll bill.
  const economical = min(tollFree.filter(r => r.tollFree), r => r.fuelLiters)
    ?? min(tollFree, r => r.fuelLiters);
  const options: RouteOption[] = [
    { mode: 'fastest', route: min(all, r => r.duration) },
    { mode: 'economical', route: economical, tollsPossible: !!economical && !economical.tollFree },
    // Mapbox optimizes travel time. This is only the shortest returned candidate.
    { mode: 'shortest', route: min(all, r => r.distance) },
  ];
  options.forEach((option, index) => {
    if (!option.route) return;
    option.sameAs = options.slice(0, index).find(previous => previous.route
      && routeFingerprint(previous.route) === routeFingerprint(option.route!))?.mode;
  });
  return options;
}

async function fetchRoutes(origin: Coordinate, destination: Coordinate, tollExcluded: boolean, signal?: AbortSignal) {
  const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const params = new URLSearchParams({ access_token: config.mapboxToken, alternatives: 'true',
    geometries: 'geojson', overview: 'full', steps: 'true', annotations: 'congestion,distance,duration',
    depart_at: 'now', ...(tollExcluded ? { exclude: 'toll' } : {}) });
  const raw = responseSchema.parse(await jsonRequest(
    `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordinates}?${params}`, {}, signal));
  return raw.routes.map(r => normalize(r, tollExcluded, true));
}

export async function calculateRoutes(origin: Coordinate, destination: Coordinate, signal?: AbortSignal): Promise<RouteOption[]> {
  if (!isCoordinate(origin) || !isCoordinate(destination)) throw new Error('INVALID_COORDINATES');
  if (!config.mapboxToken.startsWith('pk.')) throw new Error('MISSING_MAPBOX_TOKEN');
  // Partial failure leaves its option unavailable; never claim a toll route is economical.
  const results = await Promise.allSettled([
    fetchRoutes(origin, destination, false, signal), fetchRoutes(origin, destination, true, signal),
  ]);
  if (signal?.aborted) throw new Error('ABORTED');
  const [regular, tollFree] = results;
  if (regular.status === 'rejected' && tollFree.status === 'rejected') throw new Error('ROUTING_FAILED');
  return selectOptions(regular.status === 'fulfilled' ? regular.value : [], tollFree.status === 'fulfilled' ? tollFree.value : []);
}
