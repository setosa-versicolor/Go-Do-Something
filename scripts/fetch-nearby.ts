// The map tier. Pulls restaurants, cafés, bars, bakeries and ice cream shops
// from OpenStreetMap for the area around the city and writes public/nearby.json.
// Kept: independent places with a name and opening hours we can represent
// exactly. Dropped: chains, anything without hours, and anything already on
// the hand-written list. Run with `npm run nearby` (add --dry to only report).
//
// Map data © OpenStreetMap contributors, Open Database License.

import { writeFileSync } from 'node:fs';
import { city, places } from '../src/cities/madison';
import { miles } from '../src/core/geo';
import { nearbyRow, type NearbyFile, type NearbyRow } from '../src/core/nearby';

const RADIUS = 11.5;
const dLat = RADIUS / 69.05;
const dLng = RADIUS / (69.17 * Math.cos((city.center.lat * Math.PI) / 180));
const box = [city.center.lat - dLat, city.center.lng - dLng, city.center.lat + dLat, city.center.lng + dLng].map((n) => n.toFixed(4)).join(',');
const query = `[out:json][timeout:90];(nwr["amenity"~"^(restaurant|cafe|bar|pub|ice_cream)$"]["name"]["opening_hours"](${box});nwr["shop"="bakery"]["name"]["opening_hours"](${box}););out center tags;`;

async function overpass(): Promise<{ elements: Parameters<typeof nearbyRow>[0][] }> {
  let last: unknown;
  for (const host of ['overpass-api.de', 'overpass.kumi.systems', 'overpass.private.coffee']) {
    try {
      const res = await fetch(`https://${host}/api/interpreter?data=${encodeURIComponent(query)}`, { headers: { 'user-agent': 'go-do-something nearby fetcher' }, signal: AbortSignal.timeout(120_000) });
      if (!res.ok) throw new Error(`${res.status} from ${host}`);
      return (await res.json()) as { elements: Parameters<typeof nearbyRow>[0][] };
    } catch (err) {
      last = err;
      console.error(`${host}: ${(err as Error).message}`);
    }
  }
  throw last;
}

const plain = (s: string) => s.toLowerCase().replace(/^the /, '').replace(/[^a-z0-9]/g, '');
const areas = [{ name: 'Downtown', ...city.center }, ...city.starts.map((s) => ({ ...s, name: s.name.replace(/^the /, '').replace(/\b\w/g, (c) => c.toUpperCase()) }))];

const { elements } = await overpass();
const seen = new Set<string>();
const rows: NearbyRow[] = [];
let chainsOrNoHours = 0;
let known = 0;
for (const el of elements) {
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat === undefined || lng === undefined || miles({ lat, lng }, city.center) > RADIUS) continue;
  const town = el.tags?.['addr:city'];
  const hood = town && town !== city.name ? town : areas.map((a) => ({ a, d: miles(a, { lat, lng }) })).sort((x, y) => x.d - y.d)[0]!.a.name;
  const row = nearbyRow(el, hood);
  if (!row) {
    chainsOrNoHours++;
    continue;
  }
  // Already on the hand-written list: same name within a few blocks.
  const name = plain(row.n);
  const first = (s: string) => s.toLowerCase().replace(/^the /, '').split(/[^a-z0-9']+/)[0] ?? '';
  if (places.some((p) => (miles(p, row) < 0.25 && (plain(p.name).includes(name) || name.includes(plain(p.name)))) || (miles(p, row) < 0.06 && first(p.name) === first(row.n)))) {
    known++;
    continue;
  }
  const key = `${name}@${row.lat.toFixed(3)},${row.lng.toFixed(3)}`;
  if (seen.has(key)) continue;
  seen.add(key);
  rows.push(row);
}
rows.sort((a, b) => a.id.localeCompare(b.id));
const byKind = rows.reduce<Record<string, number>>((m, r) => ({ ...m, [r.c]: (m[r.c] ?? 0) + 1 }), {});
console.log(`OpenStreetMap: ${elements.length} with a name and hours, ${rows.length} kept (${Object.entries(byKind).map(([k, n]) => `${n} ${k}`).join(', ')}); dropped ${chainsOrNoHours} chains or hours we can't represent, ${known} already on the list`);
if (rows.length < 50) {
  console.error('Suspiciously few places; leaving the existing nearby.json untouched.');
  process.exit(1);
}
if (!process.argv.includes('--dry')) {
  const file: NearbyFile = { generatedAt: Date.now(), places: rows };
  writeFileSync(new URL('../public/nearby.json', import.meta.url), JSON.stringify(file) + '\n');
}
