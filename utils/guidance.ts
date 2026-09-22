import type { Coordinate, RoadAlert, Route } from '../types/navigation';
import { distance, projectOnRoute } from './geo';

export function needsRouteRefresh(route: Route, origin: Coordinate, now = Date.now()) {
  return now - route.fetchedAt > 30_000 || !route.geometry[0] || distance(origin, route.geometry[0]) > 60;
}

export function guidanceAt(route: Route, point: Coordinate) {
  const projection = projectOnRoute(point, route.geometry);
  // Step geometry follows driving order, unlike nearest maneuver-point lookup.
  let offset = 0;
  const starts = route.steps.map(step => {
    const start = offset;
    offset += step.geometry.slice(1).reduce((sum, p, i) => sum + distance(step.geometry[i]!, p), 0);
    return start;
  });
  // Keep the imminent turn until the vehicle has passed it; never skip it on approach.
  const nextIndex = starts.findIndex((start, index) => index > 0 && start >= projection.along - 8);
  const index = nextIndex < 0 ? Math.max(0, route.steps.length - 1) : nextIndex;
  const end = route.geometry[route.geometry.length - 1]!;
  return {
    ...projection, index, step: route.steps[index],
    metersToStep: Math.max(0, (starts[index] ?? projection.total) - projection.along),
    remaining: Math.max(0, projection.total - projection.along),
    arrived: projection.total - projection.along < 90 && distance(point, end) < 45,
  };
}
export function alertsAhead(route: Route, point: Coordinate, alerts: RoadAlert[], now = Date.now()) {
  const here = projectOnRoute(point, route.geometry);
  if (here.distance > 80) return [];
  return alerts.filter(alert => {
    if (alert.expiresAt <= now) return false;
    const position = projectOnRoute(alert.coordinate, route.geometry);
    const gap = position.along - here.along;
    return position.distance < 65 && gap >= 0 && gap <= 550;
  });
}
