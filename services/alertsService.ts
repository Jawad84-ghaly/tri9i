import { z } from 'zod';
import { config } from '../constants/config';
import type { AlertKind, Coordinate, RoadAlert } from '../types/navigation';
import { bounds } from '../utils/geo';
import { jsonRequest } from './http';

export const alertSchema = z.object({
  id: z.string().max(200), kind: z.enum(['police', 'radar', 'construction', 'accident', 'traffic']),
  coordinate: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }),
  createdAt: z.number().finite(), expiresAt: z.number().finite(),
  source: z.enum(['community', 'mapbox', 'waze', 'demo']),
});
let session: { token: string; expiresAt: number } | null = null;
function serverUrl(path: string) {
  if (!config.alertsUrl) throw new Error('ALERTS_DISABLED');
  return config.alertsUrl + path;
}
export function validAlerts(alerts: RoadAlert[], now = Date.now()): RoadAlert[] {
  return [...new Map(alerts.filter(a => a.expiresAt > now && a.createdAt <= now + 60_000
    && a.expiresAt > a.createdAt).map(a => [a.id, a])).values()];
}
export async function fetchAlerts(center: Coordinate, signal?: AbortSignal): Promise<RoadAlert[]> {
  const body = z.object({ alerts: z.array(alertSchema).max(2000) }).parse(
    await jsonRequest(serverUrl(`/alerts?bbox=${bounds(center)}`), {}, signal));
  return validAlerts(body.alerts);
}
export async function reportAlert(kind: AlertKind, coordinate: Coordinate): Promise<RoadAlert> {
  if (!session || session.expiresAt < Date.now() + 5000) {
    session = z.object({ token: z.string(), expiresAt: z.number() }).parse(
      await jsonRequest(serverUrl('/session'), { method: 'POST' }));
  }
  try {
    return alertSchema.parse(await jsonRequest(serverUrl('/alerts'), {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
      body: JSON.stringify({ kind, coordinate }),
    }));
  } catch (error) {
    // The development server may have restarted. Next manual retry creates a session.
    if (error instanceof Error && error.message === 'HTTP_401') session = null;
    throw error;
  }
}
