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
  // The skyline, as seen from across Lake Monona: broad slabs of nearly even
  // height in cream, brick and grey stone, none taller than the dome's base.
  // Positions are from each building's street address; sizes and colors are by
  // eye from photographs.
  buildings: [
    { name: 'State Office Building', east: 0.118, north: -0.197, w: 0.13, d: 0.07, h: 0.17, color: '#b9b6ad', style: 'stepped' },
    { name: 'Hilton Monona Terrace', east: 0.153, north: -0.144, w: 0.1, d: 0.05, h: 0.165, color: '#e3ddd0' },
    { name: 'City-County Building', east: 0.081, north: -0.159, w: 0.12, d: 0.07, h: 0.11, color: '#c2bdb1' },
    { name: 'Anchor Bank Building', east: 0.028, north: -0.124, w: 0.09, d: 0.07, h: 0.15, color: '#d39a78', style: 'glass' },
    { name: 'Block 100', east: 0.108, north: -0.032, w: 0.09, d: 0.07, h: 0.13, color: '#7d3f33' },
    { name: 'US Bank Plaza', east: 0.081, north: 0.044, w: 0.1, d: 0.09, h: 0.14, color: '#7fb0b8', style: 'glass' },
    { name: 'GEF state offices', east: 0.152, north: 0.091, w: 0.12, d: 0.08, h: 0.13, color: '#c9b48f' },
    { name: 'Capitol Point', east: 0.018, north: 0.163, w: 0.08, d: 0.06, h: 0.16, color: '#d9cbb0' },
    { name: 'Lake Terrace', east: -0.081, north: 0.15, w: 0.08, d: 0.06, h: 0.15, color: '#8f4a3a' },
    { name: 'Madison Concourse Hotel', east: -0.119, north: 0.063, w: 0.11, d: 0.07, h: 0.15, color: '#cfc6b8' },
    { name: '100 Wisconsin Avenue', east: -0.081, north: 0.063, w: 0.08, d: 0.07, h: 0.14, color: '#8fa3b3', style: 'glass' },
    { name: 'Overture Center', east: -0.211, north: -0.039, w: 0.14, d: 0.1, h: 0.07, color: '#e3ddd0', style: 'dome' },
    { name: 'Verex Plaza', east: -0.126, north: 0.382, w: 0.1, d: 0.06, h: 0.13, color: '#d9cbb0' },
    { name: 'The Edgewater', east: -0.283, north: 0.311, w: 0.11, d: 0.05, h: 0.13, color: '#e3ddd0' },
    { name: 'Blount Street power plant', east: 0.442, north: 0.306, w: 0.12, d: 0.08, h: 0.08, color: '#8f4a3a', style: 'stacks' },
    { name: 'The Constellation', east: 0.404, north: 0.451, w: 0.08, d: 0.07, h: 0.16, color: '#5f6f7d', style: 'glass' },
    { name: 'The Galaxie', east: 0.489, north: 0.512, w: 0.09, d: 0.07, h: 0.165, color: '#b9b6ad', style: 'glass' },
    { name: 'The Hub', east: -0.559, north: -0.025, w: 0.11, d: 0.08, h: 0.15, color: '#5a5552' },
    { name: 'The James', east: -0.493, north: -0.074, w: 0.09, d: 0.07, h: 0.15, color: '#b7a58c' },
    { name: 'Witte Hall', east: -0.654, north: -0.226, w: 0.1, d: 0.045, h: 0.14, color: '#c9b48f' },
    { name: 'Sellery Hall', east: -0.812, north: -0.214, w: 0.1, d: 0.045, h: 0.14, color: '#c9b48f' },
    { name: 'Ogg Hall', east: -0.801, north: -0.285, w: 0.1, d: 0.05, h: 0.12, color: '#a8553f' },
    { name: 'Van Hise Hall', east: -1.168, north: 0.055, w: 0.07, d: 0.06, h: 0.27, color: '#b9ab98' },
    { name: 'Engineering Hall', east: -1.323, north: -0.203, w: 0.14, d: 0.08, h: 0.07, color: '#a8553f' },
    { name: 'WARF Building', east: -2.121, north: 0.111, w: 0.07, d: 0.07, h: 0.2, color: '#c2bdb1' },
    { name: 'UW Hospital', east: -2.421, north: 0.116, w: 0.26, d: 0.2, h: 0.09, color: '#e3ddd0', style: 'stepped' },
    { name: 'Hilldale', east: -3.566, north: -0.212, w: 0.3, d: 0.16, h: 0.035, color: '#d9cbb0' },
  ],
  landmarks: [
    at('Camp Randall Stadium', 'stadium', 43.0699, -89.4127),
    at('Kohl Center', 'arena', 43.0694, -89.3969),
    at('Alliant Energy Center', 'arena', 43.0455, -89.3806),
    at('Monona Terrace', 'terrace', 43.0714, -89.3797, { turn: -Math.PI / 4 }),
    at('Memorial Union Terrace', 'union', 43.0764, -89.3998, { turn: Math.PI / 2 }),
    at('Bascom Hill', 'hall', 43.0753, -89.4041),
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
