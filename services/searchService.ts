import { z } from 'zod';
import { config } from '../constants/config';
import { getLanguage } from '../constants/language';
import type { Coordinate, Destination } from '../types/navigation';
import { jsonRequest } from './http';

const schema = z.object({ features: z.array(z.object({
  id: z.string(), geometry: z.object({ coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]) }),
  properties: z.object({ name: z.string(), full_address: z.string().optional() }),
})) });
export async function searchDestinations(query: string, proximity: Coordinate, signal?: AbortSignal): Promise<Destination[]> {
  if (!config.mapboxToken.startsWith('pk.')) throw new Error('MISSING_MAPBOX_TOKEN');
  const params = new URLSearchParams({ q: query.trim(), access_token: config.mapboxToken,
    country: 'ma', language: getLanguage() === 'darija' ? 'ar' : getLanguage(), limit: '5', proximity: `${proximity.longitude},${proximity.latitude}` });
  const result = schema.parse(await jsonRequest(`https://api.mapbox.com/search/geocode/v6/forward?${params}`, {}, signal));
  return result.features.map(f => ({ id: f.id, name: f.properties.full_address ?? f.properties.name,
    coordinate: { latitude: f.geometry.coordinates[1], longitude: f.geometry.coordinates[0] } }));
}
