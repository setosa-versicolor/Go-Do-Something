// The lay of the land for the 3D model. Shorelines, the river and the main
// roads come from OpenStreetMap (© OpenStreetMap contributors, ODbL),
// simplified to a few hundred points and stored in shape.json as miles from
// the Capitol. The landmarks are placed by hand and are approximate.

import { offsetMiles } from '../../core/geo';
import type { CityShape, Landmark } from '../../core/types';
import data from './shape.json';

const CENTER = { lat: 43.0747, lng: -89.3841 };

const at = (name: string, kind: Landmark['kind'], lat: number, lng: number, extra: Partial<Landmark> = {}): Landmark => {
  const { east, north } = offsetMiles(CENTER, { lat, lng });
  return { name, kind, east: Math.round(east * 100) / 100, north: Math.round(north * 100) / 100, ...extra };
};

export const shape: CityShape = {
  centerLabel: 'Wisconsin State Capitol',
  lakes: data.lakes,
  rivers: data.rivers,
  roads: data.roads,
  airfield: data.airfield,
  gridTurn: Math.PI / 4,
  urbanRadius: 5.2,
  landmarks: [
    at('Camp Randall Stadium', 'stadium', 43.0699, -89.4127),
    at('Kohl Center', 'arena', 43.0694, -89.3969),
    at('Alliant Energy Center', 'arena', 43.0455, -89.3806),
    at('Monona Terrace', 'terrace', 43.0714, -89.3797, { turn: -Math.PI / 4 }),
    at('Memorial Union Terrace', 'union', 43.0764, -89.3998, { turn: Math.PI / 2 }),
    at('Bascom Hill', 'hall', 43.0753, -89.4041),
    at('Van Hise Hall', 'tower', 43.0755, -89.4072),
    at('Olbrich Gardens', 'glasshouse', 43.0926, -89.3353),
    at('Dane County Regional Airport', 'airport', 43.1399, -89.3375, { turn: 0.6 }),
    at('UW Arboretum', 'woods', 43.0413, -89.429, { radius: 0.85 }),
    at('Picnic Point', 'woods', 43.0868, -89.4215, { radius: 0.2 }),
    at('Picnic Point', 'woods', 43.0843, -89.4275, { radius: 0.22 }),
    at('Lakeshore Preserve', 'woods', 43.0815, -89.435, { radius: 0.3 }),
    at('Tenney Park', 'woods', 43.0925, -89.369, { radius: 0.18 }),
    at('Olin Park', 'woods', 43.053, -89.378, { radius: 0.2 }),
    at('Owen Conservation Park', 'woods', 43.0735, -89.487, { radius: 0.35 }),
    at('Cherokee Marsh', 'woods', 43.153, -89.365, { radius: 0.8 }),
    at('Warner Park', 'woods', 43.129, -89.372, { radius: 0.3 }),
    at('Hoyt Park', 'woods', 43.0712, -89.444, { radius: 0.22 }),
    at('Edna Taylor Conservation Park', 'woods', 43.053, -89.32, { radius: 0.3 }),
  ],
};
