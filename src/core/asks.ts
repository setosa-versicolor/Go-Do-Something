// What a person can ask for by tapping: the tiles, who's coming, and (in
// vibes.ts) the feel. Each is just canned words for the one parser. They live
// here, not in the page, so the tagging report can ask the same things the
// page does.

/** [label, sub-line, the words it says]. A tile names a kind of outing, never a taste. */
export const TILES: [label: string, line: string, say: string][] = [
  ['Food', 'a snack to a real dinner', 'food'],
  ['Drinks', 'dives to cocktail bars', 'drinks'],
  ['Coffee', 'and somewhere to sit', 'coffee'],
  ['Outside', 'a walk, a view, water', 'outside'],
  ['Art & ideas', 'museums, books, talks', 'art museum books'],
  ['Music & shows', "whatever's on a stage", 'music show'],
  ['Play', 'games and climbing', 'play games'],
  ['Something odd', 'off the usual list', 'odd'],
  // The one tile that is a wall, not a lean: only dated events and markets (intent.today).
  ['Local today', "markets and what's on", 'local today'],
];

export const COMPANY: [label: string, say: string][] = [['Just me', ''], ['A date', 'date'], ['Friends', 'friends'], ['Kids', 'kids'], ['A visitor', 'visiting']];
