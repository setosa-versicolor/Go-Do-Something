export type Mode = 'walk' | 'bike' | 'drive';

export interface LatLng {
  lat: number;
  lng: number;
}

/** Great-circle distance in miles. */
export function miles(a: LatLng, b: LatLng): number {
  const R = 3958.8;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Streets aren't straight lines; 1.3 is a fair detour factor for a city on an isthmus.
const DETOUR = 1.3;
const MPH: Record<Mode, number> = { walk: 3, bike: 9.5, drive: 22 };
const OVERHEAD: Record<Mode, number> = { walk: 0, bike: 2, drive: 5 }; // unlock / park

/** Estimated one-way travel time in whole minutes. An estimate, and labelled as one. */
export function travelMinutes(from: LatLng, to: LatLng, mode: Mode): number {
  return Math.max(1, Math.round(((miles(from, to) * DETOUR) / MPH[mode]) * 60 + OVERHEAD[mode]));
}

export function travelLabel(minutes: number, mode: Mode): string {
  return `about ${minutes} min ${mode === 'walk' ? 'on foot' : mode === 'bike' ? 'by bike' : 'by car'}`;
}

export function directionsUrl(name: string, cityLabel: string, mode: Mode, origin?: LatLng): string {
  const travelmode = mode === 'walk' ? 'walking' : mode === 'bike' ? 'bicycling' : 'driving';
  const q = new URLSearchParams({ api: '1', destination: `${name}, ${cityLabel}`, travelmode });
  if (origin) q.set('origin', `${origin.lat},${origin.lng}`);
  return `https://www.google.com/maps/dir/?${q}`;
}

/** Where a point sits on a flat local map: miles east and north of a center. Good to a few yards at city scale. */
export function offsetMiles(center: LatLng, p: LatLng): { east: number; north: number } {
  return {
    east: (p.lng - center.lng) * 69.17 * Math.cos((center.lat * Math.PI) / 180),
    north: (p.lat - center.lat) * 69.05,
  };
}

/**
 * How far a point is from the edge of a closed outline given as a flat
 * [east, north, east, north, …] list: negative inside, positive outside.
 */
export function edgeDistance(outline: number[], east: number, north: number): number {
  let inside = false;
  let best = Infinity;
  const n = outline.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const ax = outline[i * 2]!;
    const ay = outline[i * 2 + 1]!;
    const bx = outline[j * 2]!;
    const by = outline[j * 2 + 1]!;
    if (ay > north !== by > north && east < ((bx - ax) * (north - ay)) / (by - ay) + ax) inside = !inside;
    const dx = bx - ax;
    const dy = by - ay;
    const len = dx * dx + dy * dy;
    const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((east - ax) * dx + (north - ay) * dy) / len));
    best = Math.min(best, Math.hypot(east - ax - t * dx, north - ay - t * dy));
  }
  return inside ? -best : best;
}
