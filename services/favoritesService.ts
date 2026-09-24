import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import type { Destination } from '../types/navigation';

const key = 'tri9i.favorites.v1';
export const favoriteKinds = ['home', 'work', 'school', 'gym', 'other'] as const;
export type FavoriteKind = typeof favoriteKinds[number];
const favoriteSchema = z.object({
  id: z.string().min(1).max(150), name: z.string().trim().min(1).max(120), kind: z.enum(favoriteKinds),
  coordinate: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }),
});
export type FavoritePlace = z.infer<typeof favoriteSchema>;
const schema = z.array(favoriteSchema).max(50);

export async function loadFavorites(): Promise<FavoritePlace[]> {
  const saved = await AsyncStorage.getItem(key);
  // Do not overwrite unreadable saved places with an empty collection.
  return saved === null ? [] : schema.parse(JSON.parse(saved));
}
export async function writeFavorites(places: FavoritePlace[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(schema.parse(places)));
}
export function upsertFavorite(places: FavoritePlace[], target: Destination, kind: FavoriteKind, name: string): FavoritePlace[] {
  const id = kind === 'other' ? `place-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` : `place-${kind}`;
  const favorite = favoriteSchema.parse({ id, name, kind, coordinate: target.coordinate });
  return schema.parse([...places.filter(place => place.id !== id), favorite]);
}
