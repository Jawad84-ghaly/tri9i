import type { Coordinate } from '../types/navigation';
export const isCoordinate = (p: Coordinate) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
  && Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180;
export function distance(a: Coordinate, b: Coordinate): number {
  const rad = Math.PI / 180;
  const h = Math.sin((b.latitude - a.latitude) * rad / 2) ** 2
    + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin((b.longitude - a.longitude) * rad / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
// Local equirectangular segment projection, adequate for nearby road segments.
export function projectOnRoute(point: Coordinate, line: Coordinate[]) {
  let best = { distance: Infinity, along: 0, segment: 0 };
  let travelled = 0;
  const scaleX = Math.cos(point.latitude * Math.PI / 180) * 111320;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]!, b = line[i + 1]!;
    const ax = (a.longitude - point.longitude) * scaleX, ay = (a.latitude - point.latitude) * 111320;
    const bx = (b.longitude - point.longitude) * scaleX, by = (b.latitude - point.latitude) * 111320;
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)));
    const d = Math.hypot(ax + t * dx, ay + t * dy), length = distance(a, b);
    if (d < best.distance) best = { distance: d, along: travelled + length * t, segment: i };
    travelled += length;
  }
  return { ...best, total: travelled };
}
export function bounds(point: Coordinate, radiusKm = 15) {
  const lat = radiusKm / 111.32, lon = lat / Math.max(0.1, Math.cos(point.latitude * Math.PI / 180));
  return [Math.max(-180, point.longitude - lon), Math.max(-90, point.latitude - lat),
    Math.min(180, point.longitude + lon), Math.min(90, point.latitude + lat)].join(',');
}
