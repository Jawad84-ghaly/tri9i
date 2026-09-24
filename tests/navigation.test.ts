import { describe, expect, it, vi, afterEach } from 'vitest';
import { calculateRoutes, estimateFuel, selectOptions } from '../services/routingService';
import { alertsAhead, guidanceAt, needsRouteRefresh } from '../utils/guidance';
import { distance, projectOnRoute } from '../utils/geo';
import { validAlerts } from '../services/alertsService';
import { maneuverPrompt } from '../constants/darijaAudioPrompts';
import { config } from '../constants/config';
import type { RoadAlert, Route } from '../types/navigation';

const a = { latitude: 33, longitude: -7 }, b = { latitude: 33.01, longitude: -7 };
function route(id: string, meters: number, seconds: number, tollFree = false): Route {
  return { id, distance: meters, duration: seconds, geometry: [a, b], tollFree,
    fuelLiters: estimateFuel(meters, seconds), trafficAvailable: false, fetchedAt: Date.now(), alerts: [],
    steps: [{ coordinate: a, type: 'depart', distance: meters, geometry: [a, b] }, { coordinate: b, type: 'arrive', distance: 0, geometry: [b, b] }] };
}
afterEach(() => vi.unstubAllGlobals());
describe('routing criteria', () => {
  it('selects time, toll-free fuel estimate, and candidate distance independently', () => {
    const fast = route('fast', 2000, 90), short = route('short', 1000, 300), eco = route('eco', 1500, 180, true);
    const options = selectOptions([fast, short], [eco]);
    expect(options.map(o => o.route?.id)).toEqual(['fast', 'eco', 'short']);
  });
  it('does not substitute a toll route when the no-toll request fails', () => {
    const options = selectOptions([route('one', 2000, 90)], []);
    expect(options).toHaveLength(3); expect(options[1]?.route).toBeNull(); expect(options[2]?.sameAs).toBe('fastest');
  });
  it('warns when the avoidance query can only return a toll route', () => {
    const option = selectOptions([], [route('toll', 1000, 80, false)])[1];
    expect(option?.route?.tollFree).toBe(false); expect(option?.tollsPossible).toBe(true);
    expect(selectOptions([], [route('toll', 1000, 80, false), route('free', 3000, 180, true)])[1]?.route?.id).toBe('free');
  });
  it('sends longitude first, requests toll exclusion, and parses API response', async () => {
    config.mapboxToken = 'pk.test';
    const raw = { code: 'Ok', routes: [{ distance: 1200, duration: 100,
      geometry: { coordinates: [[-7, 33], [-7, 33.01]] }, legs: [{ annotation: { congestion: ['moderate'] },
        steps: [{ distance: 1200, geometry: { coordinates: [[-7, 33], [-7, 33.01]] },
          maneuver: { location: [-7, 33], type: 'depart' }, intersections: [{ classes: [] }] }] }] }] };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => raw }); vi.stubGlobal('fetch', fetchMock);
    const result = await calculateRoutes(a, b);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('-7,33;-7,33.01');
    expect(fetchMock.mock.calls[1]?.[0]).toContain('exclude=toll');
    expect(result[1]?.route?.tollFree).toBe(true); expect(result[0]?.route?.trafficAvailable).toBe(true);
  });
  it('surfaces total API failure without injecting demo routes', async () => {
    config.mapboxToken = 'pk.test'; vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(calculateRoutes(a, b)).rejects.toThrow('ROUTING_FAILED');
  });
  it('honors provider toll-violation notifications even without intersection classes', async () => {
    config.mapboxToken = 'pk.test';
    const raw = { code: 'Ok', routes: [{ distance: 1200, duration: 100,
      geometry: { coordinates: [[-7, 33], [-7, 33.01]] }, legs: [{
        notifications: [{ type: 'violation', subtype: 'toll' }],
        steps: [{ distance: 0, geometry: { coordinates: [[-7, 33.01]] },
          maneuver: { location: [-7, 33.01], type: 'arrive' } }] }] }] };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => raw }));
    const option = (await calculateRoutes(a, b))[1];
    expect(option?.route?.tollFree).toBe(false); expect(option?.tollsPossible).toBe(true);
  });
});
describe('navigation and alerts', () => {
  it('recomputes before starting if the origin moved or the route became stale', () => {
    const r = route('start', 1112, 100);
    expect(needsRouteRefresh(r, a, r.fetchedAt)).toBe(false);
    expect(needsRouteRefresh(r, b, r.fetchedAt)).toBe(true);
    expect(needsRouteRefresh(r, a, r.fetchedAt + 31_000)).toBe(true);
  });
  it('keeps the imminent maneuver until after passing the intersection', () => {
    const turn = { latitude: 33.005, longitude: -7 };
    const end = { latitude: 33.005, longitude: -6.995 };
    const r = { ...route('turn', 1000, 100), geometry: [a, turn, end], steps: [
      { coordinate: a, type: 'depart', distance: 556, geometry: [a, turn] },
      { coordinate: turn, type: 'turn', modifier: 'right', distance: 466, geometry: [turn, end] },
      { coordinate: end, type: 'arrive', distance: 0, geometry: [end] },
    ] };
    expect(guidanceAt(r, { latitude: 33.00496, longitude: -7 }).step?.type).toBe('turn');
    expect(guidanceAt(r, turn).step?.type).toBe('turn');
    expect(guidanceAt(r, { latitude: 33.005, longitude: -6.9998 }).step?.type).toBe('arrive');
  });
  it('measures cross-track error and along-route progress', () => {
    const p = projectOnRoute({ latitude: 33.005, longitude: -7.001 }, [a, b]);
    expect(p.distance).toBeGreaterThan(80); expect(p.along / p.total).toBeCloseTo(0.5, 2);
    expect(distance(a, a)).toBe(0);
  });
  it('requires both endpoint proximity and route completion for arrival', () => {
    const r = route('r', 1112, 100);
    expect(guidanceAt(r, a).arrived).toBe(false); expect(guidanceAt(r, b).arrived).toBe(true);
  });
  it('only warns about unexpired incidents ahead and close to the route', () => {
    const r = route('r', 1112, 100), now = Date.now();
    const alert: RoadAlert = { id: '1', kind: 'police', coordinate: { latitude: 33.006, longitude: -7 }, createdAt: now, expiresAt: now + 1000, source: 'community' };
    const alerts = [alert, { ...alert, id: 'expired', expiresAt: now - 1 }, { ...alert, id: 'behind', coordinate: a },
      { ...alert, id: 'parallel-road', coordinate: { latitude: 33.006, longitude: -7.01 } }];
    expect(alertsAhead(r, { latitude: 33.005, longitude: -7 }, alerts, now).map(x => x.id)).toEqual(['1']);
    expect(validAlerts([alert, alert, { ...alert, expiresAt: now - 1 }], now)).toHaveLength(1);
  });
  it('generates Darija instructions without using provider language text', () => {
    expect(maneuverPrompt({ coordinate: a, type: 'roundabout', exit: 3, distance: 50, geometry: [a, b] }, 80)).toContain('الخرجة رقم 3');
    expect(maneuverPrompt({ coordinate: a, type: 'turn', modifier: 'right', distance: 50, geometry: [a, b] })).toContain('ليمن');
  });
});
