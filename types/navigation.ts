export type Coordinate = { latitude: number; longitude: number };
export type RouteMode = 'fastest' | 'economical' | 'shortest';
export type AlertKind = 'police' | 'radar' | 'construction' | 'accident' | 'traffic';
export type RoadAlert = {
  id: string; kind: AlertKind; coordinate: Coordinate; createdAt: number; expiresAt: number;
  source: 'community' | 'mapbox' | 'waze' | 'demo';
};
export type Maneuver = {
  coordinate: Coordinate; type: string; modifier?: string; exit?: number;
  distance: number; geometry: Coordinate[];
};
export type Route = {
  id: string; distance: number; duration: number; geometry: Coordinate[]; steps: Maneuver[];
  tollFree: boolean; fuelLiters: number; trafficAvailable: boolean; alerts: RoadAlert[];
  fetchedAt: number;
};
export type RouteOption = { mode: RouteMode; route: Route | null; sameAs?: RouteMode; tollsPossible?: boolean };
export type Destination = { id: string; name: string; coordinate: Coordinate };
