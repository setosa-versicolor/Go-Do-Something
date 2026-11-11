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
