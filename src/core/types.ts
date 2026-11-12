import type { LatLng } from './geo';

/** What a person might be after. Deliberately few: every one must be curatable by hand. */
export const MOODS = [
  'think', // quiet, alone with your head
  'date', // two people, room to talk
  'kids', // somewhere children are genuinely happy
  'showoff', // the city you want a visitor to remember
  'move', // legs, lungs, a little effort
  'eat',
  'drink',
  'learn', // leave knowing something
  'nature',
  'cozy', // shelter: warm, dry, unhurried
  'lively', // other people, noise, something happening
  'odd', // you wouldn't have thought of it
] as const;
export type Mood = (typeof MOODS)[number];

export const CATEGORIES = [
  'park', 'trail', 'water', 'garden', 'view',
  'cafe', 'bar', 'food', 'treat',
  'museum', 'bookstore', 'library', 'talk', 'oddity',
  'music', 'show', 'market', 'play',
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Coarse families used to keep three picks from being three flavours of one thing. */
export const GROUP: Record<Category, 'outdoors' | 'consume' | 'mind' | 'lively'> = {
  park: 'outdoors', trail: 'outdoors', water: 'outdoors', garden: 'outdoors', view: 'outdoors',
  cafe: 'consume', bar: 'consume', food: 'consume', treat: 'consume',
  museum: 'mind', bookstore: 'mind', library: 'mind', talk: 'mind', oddity: 'mind',
  music: 'lively', show: 'lively', market: 'lively', play: 'lively',
};

/** Conditions an option cannot do without. */
export type Need = 'daylight' | 'mild' | 'warm' | 'snow';
/** Conditions under which an option is at its best. */
export type Best = 'sunset' | 'sunrise' | 'morning' | 'night' | 'snow' | 'hot';

/** One availability rule. The first rule whose season contains the date applies. */
export interface Rule {
  /** "MM-DD..MM-DD", inclusive, may wrap the new year. Omitted = all year. */
  season?: string;
  /** e.g. "mo-fr 07:00-18:00; sa,su 08:00-14:00". Close may pass midnight. */
  hours: string;
}

export interface Option extends LatLng {
  id: string;
  kind: 'place' | 'event';
  name: string;
  /** What it is, in a few words. */
  what: string;
  category: Category;
  hood: string;
  /** Why it's special. */
  story: string;
  /** Exactly what to do there. Optional only for feed events. */
  nudge?: string;
  /** 0 free, 1 a few dollars, 2 a meal, 3 an occasion. */
  price: 0 | 1 | 2 | 3;
  setting: 'in' | 'out' | 'both';
  /** [least worth going for, ideal] minutes on site. */
  minutes: [number, number];
  /** 0 not for kids, 1 fine with kids, 2 kids will love it. */
  kids: 0 | 1 | 2;
  /** Mood → strength (1 = this is what it's for, 0.6 = also good for). */
  moods: Partial<Record<Mood, number>>;
  needs?: Need[];
  best?: Best[];
  /** Editorial weight 0..1: how strongly we'd vouch for it. Default 0.5. */
  gem?: number;
  /** Short seasonal windows worth going out of your way for. */
  moments?: { season: string; line: string }[];

  /** Recurring availability (places, weekly markets). */
  rules?: Rule[];
  /** One dated occurrence (events). Epoch ms. */
  when?: { start: number; end: number };
  /** Can you turn up any time it's on? False = be there at the start. */
  dropIn: boolean;
  /**
   * 'solid' only when the hours come from a rule we can stand behind (e.g. a
   * city ordinance) or were checked by hand on `checked`. Everything else is
   * presented to the user as "usually", never as fact.
   */
  hoursTrust: 'solid' | 'unverified';
  checked?: string;
  url?: string;
  source?: string;
  /** Feed events: where it is, and the curated place it's held at, if we know one. */
  venue?: string;
  placeId?: string;
}

export interface City {
  id: string;
  name: string;
  /** Appended to place names for map searches, e.g. "Madison, WI". */
  label: string;
  tz: string;
  center: LatLng;
  centerName: string;
  /** Other places to measure travel from, for people who'd rather not share a location. */
  starts: { name: string; lat: number; lng: number }[];
}

/** A landmark the model knows how to build. Positions are miles east and north of the center. */
export interface Landmark {
  name: string;
  kind: 'stadium' | 'arena' | 'terrace' | 'union' | 'tower' | 'hall' | 'glasshouse' | 'airport' | 'woods';
  east: number;
  north: number;
  /** Radians, counter-clockwise from east, for things with a front. */
  turn?: number;
  /** Miles, for woods and anything else with an extent. */
  radius?: number;
}

/**
 * The lay of the land, for the 3D model. Everything is in miles east and
 * north of the city center, as flat [east, north, east, north, …] lists.
 */
export interface CityShape {
  /** What the building at the center is called when tapped. */
  centerLabel: string;
  lakes: { name: string; outline: number[] }[];
  rivers: number[][];
  /** Each road is [weight, east, north, east, north, …]; weight 2 is a highway. */
  roads: number[][];
  landmarks: Landmark[];
  /**
   * Buildings worth recognising, placed by hand. Sizes are in model units
   * (miles across, and a stylised height), not surveyed.
   */
  buildings?: { name: string; east: number; north: number; turn?: number; w: number; d: number; h: number; color: string; style?: 'slab' | 'stepped' | 'glass' | 'stacks' | 'dome' }[];
  /** The airport's real layout, if the city has one worth drawing. Outlines are closed rings. */
  airfield?: { runways: { ref: string; line: number[] }[]; taxiways: number[][]; aprons: number[][]; terminals: number[][] };
  /** The street grid's angle downtown, radians. */
  gridTurn: number;
  /** Roughly how far out the houses go. */
  urbanRadius: number;
}
