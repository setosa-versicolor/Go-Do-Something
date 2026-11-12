// Downtown, campus and the isthmus: kinds of place the first list was thin on.
// Same rules as places.ts: hand-written, distinct, honest about trust.

import type { Option } from '../../core/types';
import { ALWAYS, PARK, place } from './place';

void ALWAYS;
void PARK;

export const PLACES_CENTRAL: Option[] = [
  // ------------------------------------------------ the properly nice ones
  place({
    id: 'letoile', name: "L'Etoile", what: 'The tasting-menu room on the Capitol Square',
    category: 'food', hood: 'Downtown', lat: 43.0753, lng: -89.3825, price: 3, setting: 'in', minutes: [100, 150], kids: 0,
    moods: 'date! eat! showoff', hours: 'we,th 17:00-20:15; fr,sa 17:00-20:45', gem: 0.85,
    story: "The restaurant that taught Madison to cook from its own farmers' market. Odessa Piper started it; Tory Miller bought it in 2005 and won a James Beard award here. It is a multi-course evening built on Wisconsin farms, and it is the city's answer to the question of where to go for an occasion.",
    nudge: "Book ahead; this is a reservation, not a walk-in. Ask for a table by the windows facing the Capitol, give it the whole evening, and let them choose the wine.",
  }),
  place({
    id: 'graze', name: 'Graze', what: 'A glass-walled gastropub looking at the Capitol',
    category: 'food', hood: 'Downtown', lat: 43.0752, lng: -89.3823, price: 2, setting: 'in', minutes: [60, 100], kids: 1,
    moods: 'eat! showoff! date', hours: 'tu 17:00-20:00; we,th 16:00-20:00; fr 16:00-21:00; sa 10:00-14:00,17:00-21:00; su 10:00-14:00',
    trust: 'solid', checked: '2026-11-12', url: 'https://www.grazemadison.com/', gem: 0.75,
    story: "L'Etoile's casual sibling shares the same building and the same farmers, at about a third of the price. The menu is comfort food by way of Tory Miller's Wisconsin and Korean background, and the dining room is a wall of windows with the Capitol filling it.",
    nudge: "Go for weekend brunch or an early dinner while there is still light on the dome. Ask for a window table. Happy hour runs 4 to 6, Wednesday through Friday.",
  }),
  place({
    id: 'harvey-house', name: 'The Harvey House', what: 'A dressed-up supper club by the old train depot',
    category: 'food', hood: 'Downtown', lat: 43.0683, lng: -89.3951, price: 3, setting: 'in', minutes: [90, 140], kids: 0,
    moods: 'date! eat! showoff', hours: 'mo-th 17:00-20:30; fr,sa 16:30-21:30; su 16:30-20:30',
    trust: 'solid', checked: '2026-11-12', url: 'https://www.theharveyhouse.com/contact', gem: 0.85,
    story: "The Wisconsin supper club, taken seriously and dressed for dinner, tucked in behind the old depot on West Washington. It is the room people in Madison now book for anniversaries, and it earns it.",
    nudge: "Reserve if you can. If you can't, walk in and take the bar: the full menu is served there every night. Start with a relish tray and an old fashioned and don't hurry.",
  }),
  place({
    id: 'osteria-papavero', name: 'Osteria Papavero', what: 'A Bolognese chef cooking rustic Italian downtown',
    category: 'food', hood: 'Downtown', lat: 43.0741, lng: -89.3794, price: 2, setting: 'in', minutes: [60, 100], kids: 1,
    moods: 'eat! date! cozy', hours: 'mo,tu 16:30-20:30; we,th 11:30-14:00,16:30-20:30; fr 11:30-14:00,16:30-21:00; sa 16:30-21:00',
    trust: 'solid', checked: '2026-11-12', url: 'https://www.osteriapapavero.com/', gem: 0.8,
    story: "Francesco Mangano is from Bologna and cooks like it: traditional dishes, a board of daily specials built on whatever local farmers brought in, and no fuss. It is a small, plain room a block off the Square, and one of the most reliably good dinners in town.",
    nudge: "Come at 4:30 for the cicchetti happy hour, Monday to Saturday, and stay for pasta. Read the specials board before the menu. Lunch runs Wednesday to Friday.",
  }),
  place({
    id: 'heritage-tavern', name: 'Heritage Tavern', what: 'A polished dinner room a block off the Square',
    category: 'food', hood: 'Downtown', lat: 43.0767, lng: -89.3832, price: 3, setting: 'in', minutes: [75, 120], kids: 0,
    moods: 'date! eat! drink', hours: 'tu-th 16:00-21:00; fr 16:00-22:00; sa 09:00-14:00,16:00-22:00; su 09:00-14:00',
    trust: 'solid', checked: '2026-11-12', url: 'https://www.heritagetavern.com/contact-us',
    story: "A grown-up restaurant with a long bar, on the quiet corner of Mifflin and Webster. It is where you go when the occasion wants a real dinner but not a tasting menu, and the weekend brunch is better than most people know.",
    nudge: "Happy hour is 4 to 6, Tuesday through Saturday, and the bar is the best seat for it. For brunch, go Saturday or Sunday at 9, before the Square fills up.",
  }),
  place({
    id: 'cento', name: 'Cento', what: 'Wood-fired Italian across from Overture',
    category: 'food', hood: 'Downtown', lat: 43.0743, lng: -89.3874, price: 3, setting: 'in', minutes: [70, 110], kids: 1,
    moods: 'date! eat! showoff', hours: 'mo-fr 16:00-22:00; sa 10:00-14:00,16:00-22:00; su 10:00-14:00,16:00-21:00',
    trust: 'solid', checked: '2026-11-12', url: 'https://www.centomadison.com/location/cento/',
    story: "Handmade pasta, slow-roasted meats and pizza out of a wood-burning oven, in a big handsome room with the kitchen open to it. It sits across the street from the Overture Center, which makes it the dinner half of a great many nights out.",
    nudge: "Sit where you can watch the kitchen work. If you have a show to make, tell them the curtain time when you sit down. Happy hour is 4 to 6 every day.",
  }),
  place({
    id: 'ahan', name: 'Ahan', what: 'Lao and Thai cooking on Willy Street',
    category: 'food', hood: 'Willy Street', lat: 43.0781, lng: -89.3721, price: 2, setting: 'in', minutes: [45, 80], kids: 1,
    moods: 'eat! date lively', hours: 'tu 16:00-22:00; we-sa 12:00-15:00,16:00-22:00; su 12:00-15:00,16:00-20:00',
    trust: 'solid', checked: '2026-11-12', url: 'https://www.ahanmadison608.com/', gem: 0.8,
    story: "Lao and Thai-inspired food cooked with Wisconsin farm produce, in the old candy company building at the foot of Willy Street. The lemongrass fried chicken sandwich is the thing people talk about, and it keeps turning up in new versions.",
    nudge: "Get the lemongrass fried chicken sandwich and one of the Lao dishes to share. Leave room: the ice cream is made in house, and there is a fried coconut cake.",
  }),

  // ------------------------------------- breakfast, cheap eats, late night
  place({
    id: 'marigold-kitchen', name: 'Marigold Kitchen', what: 'The downtown breakfast, a block off the Square',
    category: 'food', hood: 'Downtown', lat: 43.0744, lng: -89.3817, price: 2, setting: 'in', minutes: [35, 60], kids: 1,
    moods: 'eat! cozy lively', hours: 'mo-fr 07:00-15:00; sa 07:00-14:00; su 08:00-14:00', best: ['morning'],
    trust: 'solid', checked: '2026-11-12', url: 'https://www.marigoldkitchen.com/', gem: 0.75,
    story: "A bright counter-service cafe that has been downtown's default breakfast for years. The specials change constantly, a hash one week and a stuffed French toast the next, and the line on a Saturday morning moves faster than it looks.",
    nudge: "Order at the counter, then find a table. Read the specials board first. On weekdays, come before the noon rush from the Capitol offices.",
  }),
  place({
    id: 'teddywedgers', name: 'Teddywedgers', what: 'Cornish pasties from a wedge at the top of State',
    category: 'food', hood: 'Downtown', lat: 43.0746, lng: -89.3869, price: 1, setting: 'in', minutes: [10, 25], kids: 1,
    moods: 'eat! odd', hours: 'mo,tu 07:00-14:00; we-sa 07:00-21:00; su 09:00-15:00',
    trust: 'solid', checked: '2026-11-12', url: 'https://www.teddywedgers.com/',
    story: "A sliver of a shop where State Street meets the Square, selling pasties: the hand-held meat and potato pies Cornish miners brought to southwest Wisconsin. One is a full meal for a few dollars, and it stays hot for a long walk.",
    nudge: "Get a pasty to go, cross the street, and eat it on the Capitol lawn. A half is a lunch. A whole is a commitment.",
  }),
  place({
    id: 'pauls-pelmeni', name: "Paul's Pel'meni", what: 'Russian dumplings, one dish, open late',
    category: 'food', hood: 'State Street', lat: 43.0746, lng: -89.3941, price: 1, setting: 'in', minutes: [20, 40], kids: 1,
    moods: 'eat! odd lively', hours: 'mo-we 11:00-22:00; th-sa 11:00-02:00; su 11:00-20:00', best: ['night'],
    trust: 'solid', checked: '2026-11-12', url: 'https://paulspelmeni.com/', gem: 0.8,
    story: "A menu of essentially one thing: small Russian dumplings, potato or beef, buried under butter, curry powder, cilantro, sweet chili sauce and sour cream. It sounds wrong and it is exactly right, and half of campus has ended a night here.",
    nudge: "Order a half-and-half with everything on it. Don't negotiate the toppings the first time. It's open until 2 am Thursday through Saturday.",
  }),
  place({
    id: 'ians-pizza', name: "Ian's Pizza", what: 'Mac and cheese pizza by the slice, until 2:30',
    category: 'food', hood: 'State Street', lat: 43.0749, lng: -89.387, price: 1, setting: 'in', minutes: [15, 35], kids: 2,
    moods: 'eat! lively kids', hours: 'su-we 11:00-22:00; th 11:00-02:00; fr,sa 11:00-02:30', best: ['night'],
    trust: 'solid', checked: '2026-11-12', url: 'https://www.ianspizza.com/locations/state-street/',
    story: "The slice shop that put macaroni and cheese on a pizza and made it a Madison rite. Big slices, odd rotating toppings, and a late-night line at the top of State Street that is part of the experience.",
    nudge: "Get one slice of the mac and cheese, because you have to, and one of whatever looks strangest in the case. Go after 11 on a Friday to see it at full volume.",
  }),
  place({
    id: 'dotty-dumplings', name: "Dotty Dumpling's Dowry", what: 'A burger bar hung with model airplanes',
    category: 'food', hood: 'Campus', lat: 43.0728, lng: -89.3957, price: 2, setting: 'in', minutes: [40, 70], kids: 1,
    moods: 'eat! lively drink', hours: 'tu-sa 11:00-22:00; su 11:00-16:00',
    trust: 'solid', checked: '2026-11-12', url: 'https://www.dottydumplingsdowry.com/',
    story: "Madison has been arguing over its best burger for fifty years, and Dotty's has been in the argument the whole time. A dark wooden bar by the Kohl Center, with a ceiling full of model aircraft and a good tap list.",
    nudge: "Burger, fried cheese curds, a Wisconsin beer. Check the Kohl Center schedule first: on game nights there is a long wait.",
  }),
  place({
    id: 'lucille', name: 'Lucille', what: 'Three floors of pizza and cocktails on King Street',
    category: 'food', hood: 'Downtown', lat: 43.0744, lng: -89.3814, price: 2, setting: 'in', minutes: [50, 90], kids: 1,
    moods: 'eat! drink lively date', hours: 'mo-we 15:00-23:00; th,su 11:00-23:00; fr,sa 11:00-01:00',
    trust: 'solid', checked: '2026-11-12', url: 'https://www.lucillemadison.com/',
    story: "An old flatiron building at King and Pinckney, opened up into three floors of bar. Two kinds of pizza, wood-fired and a cheddar-crusted Detroit-style pan pie they call Wisco-Detroit, with a cocktail list that takes itself seriously enough.",
    nudge: "Order the pan pizza; the caramelized cheese edge is the point. The kitchen closes at 10 even when the bar doesn't. Climb to the upper floors before you settle on a table.",
  }),

  // ---------------------------------------------------------------- treats
  place({
    id: 'batch-bakehouse', name: 'Batch Bakehouse', what: 'A small Willy Street bakery, serious about butter',
    category: 'treat', hood: 'Willy Street', lat: 43.086, lng: -89.3607, price: 1, setting: 'in', minutes: [10, 25], kids: 2,
    moods: 'eat! cozy kids', hours: 'tu-fr 07:00-17:00; sa,su 08:00-17:00', best: ['morning'],
    trust: 'solid', checked: '2026-11-12', url: 'https://www.batchbakehouse.com/', gem: 0.8,
    story: "Croissants, scones, coffee cakes, pies, cookies and bread from a little storefront at the east end of Willy Street. It is a bakery and only a bakery: a case, a counter, and a short line of neighbors who know what sells out.",
    nudge: "Go early; the case thins out through the day. Get a croissant for now and a loaf for later, then walk it down to the lake at the end of the street.",
  }),
  place({
    id: 'chocolate-shoppe', name: 'Chocolate Shoppe Ice Cream', what: "Madison's own ice cream, on State Street",
    category: 'treat', hood: 'State Street', lat: 43.0749, lng: -89.3931, price: 1, setting: 'in', minutes: [10, 30], kids: 2,
    moods: 'eat! kids! date', hours: 'mo-th 14:00-22:00; fr-su 12:00-22:00', best: ['hot'],
    trust: 'solid', checked: '2026-11-12', url: 'https://www.chocolateshoppeicecream.com/madison-shoppes/',
    story: "Made in Madison since 1962 and proud of how rich it is. Dozens of flavors, a State Street shop open until ten, and the right companion for a walk down to the lake.",
    nudge: "Ask for a taste of anything; they expect it. Take the cone down State Street toward the Union and finish it by the water.",
  }),

  // ------------------------------------------------------------------ bars
  place({
    id: 'public-parking', name: 'Public Parking', what: 'A nationally noticed cocktail bar on East Johnson',
    category: 'bar', hood: 'Tenney-Lapham', lat: 43.0821, lng: -89.3793, price: 2, setting: 'in', minutes: [45, 90], kids: 0,
    moods: 'drink! date! cozy', hours: 'daily 16:00-02:00', best: ['night'],
    trust: 'solid', checked: '2026-11-12', url: 'https://www.publicparkingbar.com/', gem: 0.85,
    story: "A neighborhood cocktail bar that opened in 2024 and was promptly named one of Bon Appetit's best new bars in the country. It still behaves like a neighborhood bar, open every day until two, with a name nobody can search for.",
    nudge: "Sit at the bar and tell them what you usually drink; let them take it from there. Early in the week is the easiest time to get a seat.",
  }),
  place({
    id: 'state-line-distillery', name: 'State Line Distillery', what: 'A cocktail lounge inside a working distillery',
    category: 'bar', hood: 'Capitol East', lat: 43.0876, lng: -89.3622, price: 2, setting: 'in', minutes: [45, 90], kids: 0,
    moods: 'drink! date! cozy', hours: 'mo-th 17:00-22:00; fr,sa 15:00-24:00; su 15:00-21:00',
    trust: 'solid', checked: '2026-11-12', url: 'https://www.statelinedistillery.com/', gem: 0.75,
    story: "Everything in your glass was mashed, fermented and distilled in the next room, from organic grain grown in the Driftless. The lounge is dim and comfortable, the cocktail menu changes, and there is an espresso martini on a nitro tap.",
    nudge: "Start with a cocktail built on their gin, then try the coffee liqueur on its own. It's on a back street by the bike path, so walk or ride over.",
  }),
  place({
    id: 'old-sugar-distillery', name: 'Old Sugar Distillery', what: 'A small distillery tasting room on East Main',
    category: 'bar', hood: 'Capitol East', lat: 43.0821, lng: -89.3706, price: 2, setting: 'in', minutes: [40, 80], kids: 0,
    moods: 'drink! learn cozy', hours: 'th 16:00-21:00; fr 16:00-22:00; sa 13:00-22:00',
    trust: 'solid', checked: '2026-11-12', url: 'https://www.oldsugardistillery.com/',
    story: "A small distillery in an industrial building east of the Capitol, with the stills and barrels in the same room as the bar. It is open only three days a week, and it feels like drinking in somebody's workshop, which it is.",
    nudge: "Ask for an old fashioned made with their own brandy. On Saturdays there is a tour at 1:30 that you can book online.",
  }),
  place({
    id: 'young-blood', name: 'Young Blood Beer Company', what: 'A brewery taproom on King Street',
    category: 'bar', hood: 'Downtown', lat: 43.0748, lng: -89.3811, price: 2, setting: 'in', minutes: [40, 80], kids: 0,
    moods: 'drink! lively', hours: 'mo-th 15:00-22:00; fr,sa 11:30-24:00; su 11:30-19:00',
    trust: 'solid', checked: '2026-11-12', url: 'https://www.youngbloodbeerco.com/',
    story: "The downtown brewery, a block off the Square, with a long list of its own beer that changes often and leans toward the hazy, the sour and the strange. Loud in a good way on weekends.",
    nudge: "Order small pours and work across the board; the names tell you nothing, so ask. Friday and Saturday it opens at 11:30, which makes it a fine lunch beer.",
  }),

  // ------------------------------------------------------------------ play
  place({
    id: 'sett-recreation', name: 'Sett Recreation', what: 'Bowling and pool in the basement of Union South',
    category: 'play', hood: 'Campus', lat: 43.0718, lng: -89.4081, price: 2, setting: 'in', minutes: [60, 120], kids: 2,
    moods: 'move! kids lively date', hours: 'mo-sa 12:00-22:00; su 12:00-21:00',
    url: 'https://union.wisc.edu/events-and-activities/games-and-bowling',
    story: "The only bowling lanes anywhere near downtown are under a student union. Lanes rent by the hour for up to six people, there are pool tables beside them, and the board games and video games are free to use.",
    nudge: "Go on a weekday before 5, when bowling, pool and shoes are half price. Pool is cheaper again on Tuesdays. Bring socks.",
  }),

  // ------------------------------------------------- museums and galleries
  place({
    id: 'physics-museum', name: 'Ingersoll Physics Museum', what: 'A free room of hands-on physics, since 1918',
    category: 'museum', hood: 'Campus', lat: 43.0736, lng: -89.4054, price: 0, setting: 'in', minutes: [25, 50], kids: 2,
    moods: 'learn! kids! odd think', hours: 'mo-fr 08:30-16:00',
    trust: 'solid', checked: '2026-11-12', url: 'https://www.physics.wisc.edu/ingersollmuseum/', gem: 0.7,
    story: "One room on the second floor of Chamberlin Hall, with more than sixty exhibits you are meant to touch, many of them built in the physics department's own shops. It was conceived in 1917, which makes it one of the first museums of its kind in the country. Free, and no one hovers.",
    nudge: "Walk in; you don't need a reservation. Try everything with a crank or a handle, then look for the display on the department's Nobel winners in the hallway. Weekdays only.",
  }),
  place({
    id: 'arts-lit-lab', name: 'Arts + Literature Laboratory', what: 'Free galleries in an artist-run arts center',
    category: 'museum', hood: 'Capitol East', lat: 43.08, lng: -89.3731, price: 0, setting: 'in', minutes: [20, 45], kids: 1,
    moods: 'think! learn date odd', hours: 'tu-fr 10:00-17:00; sa 12:00-17:00',
    trust: 'solid', checked: '2026-11-12', url: 'https://artlitlab.org/',
    story: "A community arts center on the ground floor of a parking ramp, which is less grim than it sounds. Free exhibitions that turn over regularly, a library of small-press books, and a calendar of readings and concerts most evenings.",
    nudge: "See the current show, then find the small press library and pull something off the shelf. Check their calendar before you go; there is often a reading or a concert that night.",
  }),
];
