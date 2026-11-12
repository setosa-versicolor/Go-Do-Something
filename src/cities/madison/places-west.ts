// Near west, west and far west: Monroe Street, Regent, Hilldale, Shorewood Hills, Odana, Middleton, Verona.
// Same rules as places.ts: hand-written, distinct, honest about trust.

import type { Option } from '../../core/types';
import { ALWAYS, PARK, place } from './place';

void ALWAYS;
void PARK;

export const PLACES_WEST: Option[] = [
  // ------------------------------------------------- Monroe Street, Regent
  place({
    id: 'pizza-brutta', name: 'Pizza Brutta', what: 'Neapolitan pizza from a brick oven on Monroe Street',
    category: 'food', hood: 'Monroe Street', lat: 43.0652, lng: -89.4164, price: 2, setting: 'in', minutes: [35, 60], kids: 2,
    moods: 'eat! kids lively date', hours: 'daily 11:00-21:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.pizzabrutta.com', gem: 0.75,
    story: "Neapolitan-style pizza out of a brick oven, ordered at the counter and on your table a few minutes later. It is quick, it is not expensive, and it is the pizza the near west side argues in favor of.",
    nudge: "Order a margherita at the counter and one other pie to split, and take a table where you can watch the oven. Personal-size pizzas mean nobody has to compromise.",
  }),
  place({
    id: 'fairchild', name: 'Fairchild', what: 'A small, serious dinner room with handmade pasta',
    category: 'food', hood: 'Monroe Street', lat: 43.0575, lng: -89.4281, price: 3, setting: 'in', minutes: [75, 120], kids: 0,
    moods: 'date! eat! showoff cozy', hours: 'we-su 16:30-20:30', gem: 0.9,
    story: "Two chefs and a wine person who all came up through Madison's best kitchens, cooking simple things very carefully in a small room on Monroe Street. The menu changes nightly and always has a pasta section worth ordering from twice.",
    nudge: "Book ahead on Resy; tables open 35 days out. If you didn't, walk in early and ask for the bar, which takes walk-ins. Order at least one pasta and let them pick the wine.",
  }),
  place({
    id: 'alimentari', name: 'Alimentari', what: 'Italian deli, fresh pasta and very large sandwiches',
    category: 'food', hood: 'Monroe Street', lat: 43.057, lng: -89.4281, price: 2, setting: 'in', minutes: [20, 40], kids: 1,
    moods: 'eat! cozy', hours: 'tu-sa 09:00-19:00; su 10:00-17:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.alimentarimadison.com/contact', gem: 0.7,
    story: "An Italian deli and market that makes its own pasta daily, slices meats to order, and builds sandwiches behind the counter. The shelves are oils, vinegars, tinned things and wine, so you rarely leave with only lunch.",
    nudge: "Sandwiches start at 9:30 and stop when they run out, so go at lunch, not late afternoon. Pick up fresh pasta and a jar of sauce for tomorrow while you wait.",
  }),
  place({
    id: 'indie-coffee', name: 'Indie Coffee', what: 'A neighborhood cafe known for its waffles',
    category: 'cafe', hood: 'Regent Street', lat: 43.0676, lng: -89.4066, price: 1, setting: 'in', minutes: [30, 75], kids: 1,
    moods: 'cozy! eat think', hours: 'daily 07:00-18:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.indiecoffee.net', best: ['morning'],
    story: "A small coffeehouse near Camp Randall where the waffles get as much attention as the espresso. It is a room for sitting a while, which is rarer on Regent Street than it should be.",
    nudge: "Order a waffle and a latte and take your time over both. Avoid football Saturdays unless a crowd in red is what you came for.",
  }),

  // ------------------------------------------- University Avenue, west side
  place({
    id: 'lombardinos', name: "Lombardino's", what: 'Seasonal Italian with an all-Italian wine list',
    category: 'food', hood: 'University Avenue', lat: 43.0723, lng: -89.4289, price: 3, setting: 'in', minutes: [70, 110], kids: 1,
    moods: 'date! eat! cozy showoff', hours: 'th-su 16:30-20:30', url: 'https://www.lombardinos.com', gem: 0.85,
    story: "A neighborhood Italian restaurant whose menu follows the seasons and the local farms, with a wine list that is Italian from top to bottom. It feels like an old-school red-sauce room and cooks well above that.",
    nudge: "Seating is first come, first served, so arrive near opening or expect a wait at the bar. Ask what's new on the menu this week and order a bottle from a region you don't know.",
  }),
  place({
    id: 'pasture-and-plenty', name: 'Pasture and Plenty', what: 'Farm-to-table deli, breakfast and lunch counter',
    category: 'food', hood: 'University Avenue', lat: 43.0719, lng: -89.4284, price: 2, setting: 'in', minutes: [25, 50], kids: 1,
    moods: 'eat! cozy', hours: 'tu-fr 09:00-19:00; sa 09:00-14:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.pastureandplenty.com', best: ['morning'],
    story: "A deli, kitchen and small market built around local farms, with a meal-kit subscription on the side and a counter where you can simply eat. The freezer case of ready meals is the fallback plan half the neighborhood relies on.",
    nudge: "The kitchen runs 9 to 2, so come for breakfast or lunch; after that it's the deli case only. Take a frozen dinner home for the night you won't want to cook.",
  }),
  place({
    id: 'bagels-forever', name: 'Bagels Forever', what: 'Bagels sold straight from the bakery since 1973',
    category: 'treat', hood: 'University Avenue', lat: 43.0749, lng: -89.4406, price: 1, setting: 'in', minutes: [10, 20], kids: 1,
    moods: 'eat! odd', hours: 'mo-fr 06:30-20:00; sa,su 06:30-18:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.bagelsforever.com',
    story: "A working bagel bakery with a retail store attached, so what you buy has not travelled far. It has been baking since 1973 and has not bothered to become fashionable.",
    nudge: "Buy a bag of whatever is warm and a tub of cream cheese, and eat one in the car. It's a shop, not a cafe, so plan to take them somewhere.",
  }),
  place({
    id: 'taigu', name: 'Taigu', what: 'Hand-cut Shanxi noodles on Old Middleton Road',
    category: 'food', hood: 'West Side', lat: 43.0744, lng: -89.4726, price: 2, setting: 'in', minutes: [35, 60], kids: 1,
    moods: 'eat! cozy',
    hours: 'tu-th 11:00-14:00,16:00-20:30; fr,sa 11:00-14:00,16:00-21:00; su 11:00-14:00,16:00-20:00',
    trust: 'solid', checked: '2026-11-12', url: 'https://www.taigunoodles.com', gem: 0.75,
    story: "Fresh noodles cut by hand, in the style of Shanxi province in northern China, in a plain storefront you would drive past. The texture is the point: thick, chewy, uneven in the way machine noodles never are.",
    nudge: "Order the cat ear noodles, named for their shape, and the pork dan dan. Note the gap between lunch and dinner; nothing happens here from 2 to 4.",
  }),
  place({
    id: 'geeks-mania', name: 'Geeks Mania', what: 'Pay once, play every arcade game all day',
    category: 'play', hood: 'Odana Road', lat: 43.0554, lng: -89.4919, price: 2, setting: 'in', minutes: [60, 150], kids: 2,
    moods: 'kids! lively! odd', hours: 'mo-th,su 10:00-22:00; fr,sa 10:00-24:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.geeksmania.com', gem: 0.7,
    story: "An arcade where you pay one price at the door and every machine is set to free play, so nobody is rationing quarters. It is the rare place where a ten-year-old and a forty-year-old want to stay exactly as long as each other.",
    nudge: "It's $15 a person for unlimited play, or $8 if you come in the last two hours before close. Pick a game you were bad at as a kid and stay on it until you aren't.",
  }),
  // ---------------------------------------------------- far west, Middleton
  place({
    id: 'pope-farm', name: 'Pope Farm Conservancy', what: 'A hilltop of prairie, oak savanna and old stone fence',
    category: 'park', hood: 'Town of Middleton', lat: 43.0784, lng: -89.5703, price: 0, setting: 'out', minutes: [30, 70], kids: 1,
    moods: 'nature! think move date', hours: 'daily 07:00-17:00', needs: ['daylight'], gem: 0.75,
    story: "A former farm on high ground west of the Beltline, now prairie and oak savanna with a long stone fence running through it. It is open sunrise to sunset all year and is far quieter than anything this close to West Towne should be.",
    nudge: "Park off Old Sauk Road and walk uphill along the stone fence until you reach the top. Go in the last hour before sunset, and bring a jacket outside of summer.",
  }),
  place({
    id: 'hubbard-avenue-diner', name: 'Hubbard Avenue Diner', what: 'A proper diner that is mostly about the pie',
    category: 'food', hood: 'Middleton', lat: 43.0952, lng: -89.5107, price: 2, setting: 'in', minutes: [40, 70], kids: 2,
    moods: 'eat! kids cozy', hours: 'daily 07:30-20:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.hubbardavenuediner.com/location/hubbardavediner/', gem: 0.75,
    story: "A diner in downtown Middleton that says outright it is famous for pie, and is. The usual diner plates, and a bakery that takes pie more seriously than the rest of the menu put together.",
    nudge: "Look at the pie list on the way in and decide on your slice before you order anything else. If the dining room is full, buy a whole pie from the bakery counter and leave happy anyway.",
  }),
  place({
    id: 'clasens-bakery', name: "Clasen's European Bakery", what: 'Old-world breads, tortes and morning buns',
    category: 'treat', hood: 'Middleton', lat: 43.1062, lng: -89.5119, price: 1, setting: 'in', minutes: [10, 25], kids: 2,
    moods: 'eat! kids', hours: 'mo-sa 07:00-17:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.clasensbakery.com', best: ['morning'], gem: 0.8,
    story: "A family bakery on a side street in Middleton that makes everything from scratch the slow European way: pretzels, coffee cakes, tortes, and slabs of chocolate bark. It smells like a reason to move to Middleton.",
    nudge: "Get a morning bun and a Bavarian pretzel for now and a loaf for later. Closed Sundays, and the best of the case goes early on Saturdays.",
  }),
  place({
    id: 'mustard-museum', name: 'National Mustard Museum', what: 'Over 6,000 mustards, free, entirely sincere',
    category: 'oddity', hood: 'Middleton', lat: 43.0953, lng: -89.5112, price: 0, setting: 'in', minutes: [25, 50], kids: 1,
    moods: 'odd! learn showoff kids', hours: 'daily 10:00-17:00', trust: 'solid', checked: '2026-11-12', url: 'https://mustardmuseum.com', gem: 0.8,
    story: "More than 6,000 jars, bottles and tins of mustard from all 50 states and over 70 countries, displayed with a straight face in downtown Middleton. Admission is free, and the joke stops being a joke about ten minutes in, when you start having opinions.",
    nudge: "Do the museum first, then find the tasting bar in the shop and try mustards until you find one you didn't know you needed. Take visitors here; it never fails.",
  }),
  place({
    id: 'capital-brewery', name: 'Capital Brewery', what: 'A beer garden behind a Middleton brewery',
    category: 'bar', hood: 'Middleton', lat: 43.0949, lng: -89.5166, price: 1, setting: 'both', minutes: [40, 90], kids: 1,
    moods: 'drink! lively',
    hours: 'tu-th 16:00-21:00; fr 15:00-22:00; sa 12:00-21:00; su 12:00-18:00',
    trust: 'solid', checked: '2026-11-12', url: 'https://www.capitalbrewery.com',
    story: "A Middleton brewery with a bier garten that fills up on warm evenings. The garden runs May through October; in the cold months everyone moves into the bier stube indoors.",
    nudge: "In summer, come on a Friday after work, get a beer and find a table in the garden. In winter, go inside to the stube. Hours bend around private events, so glance at their page first.",
  }),
  place({
    id: 'longtable-beer-cafe', name: 'Longtable Beer Cafe', what: 'Communal tables, 300 bottles, Belgian-style frites',
    category: 'bar', hood: 'Middleton', lat: 43.0954, lng: -89.5122, price: 2, setting: 'in', minutes: [45, 100], kids: 1,
    moods: 'drink! eat date lively', hours: 'su,mo 15:00-22:00; tu-sa 11:00-22:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.longtablebeercafe.com', gem: 0.75,
    story: "A beer cafe built around long shared tables, twelve rotating taps and an open cooler of about 300 bottles you pull yourself. The food is made for passing around: boards, sandwiches, and Belgian-style frites.",
    nudge: "Walk the cooler before you sit and pick a bottle you've never heard of to split. Order the frites. The kitchen closes at 9, an hour before the bar.",
  }),
  place({
    id: 'villa-dolce', name: 'Villa Dolce', what: 'Pizza, pasta and house-made gelato',
    category: 'food', hood: 'Middleton', lat: 43.0957, lng: -89.5118, price: 2, setting: 'in', minutes: [50, 90], kids: 1,
    moods: 'eat! date cozy', hours: 'mo-sa 17:00-20:30', trust: 'solid', checked: '2026-11-12', url: 'https://www.villadolcecafe.com',
    story: "An Italian place in downtown Middleton that does pizza and pasta for dinner and keeps a case of fresh gelato for afterward. It is dinner only and closes early, which suits the pace of the room.",
    nudge: "Split a pizza and a pasta, and do not fill up, because the gelato is the reason to come. Closed Sundays, and the doors shut at 8:30.",
  }),
  place({
    id: 'stamm-house', name: '1847 at the Stamm House', what: 'Supper club dinners in a very old roadhouse',
    category: 'food', hood: 'Middleton', lat: 43.1045, lng: -89.4946, price: 3, setting: 'in', minutes: [70, 110], kids: 1,
    moods: 'eat! date showoff cozy',
    hours: 'mo-th 16:30-20:30; fr,sa 16:30-21:30; su 16:30-20:00',
    trust: 'solid', checked: '2026-11-12', url: 'https://www.1847stammhouse.com',
    story: "The Stamm House on Century Avenue wears its founding year in its name and is run today as a Wisconsin supper club: fish fry every Friday, prime rib every Saturday. The portions assume you skipped lunch.",
    nudge: "Go on a Friday for the fish fry or a Saturday for the prime rib, and start with an old fashioned at the bar. Before 5:30 there are $6 appetizers.",
  }),

  // ------------------------------------------------------------------ Verona
  place({
    id: 'hop-haus-verona', name: 'Hop Haus Brewing', what: "Verona's small Main Street brewery",
    category: 'bar', hood: 'Verona', lat: 42.9881, lng: -89.5331, price: 1, setting: 'in', minutes: [40, 80], kids: 1,
    moods: 'drink! lively cozy',
    hours: 'mo-th 16:00-21:00; fr 15:00-22:00; sa 12:00-22:00; su 12:00-20:00',
    trust: 'solid', checked: '2026-11-12', url: 'https://www.hophausbrewing.com',
    story: "The original Hop Haus taproom, a small-town brewery on Verona's main street where the people at the next table probably know each other. They have a bigger place in Fitchburg now; this is the one with the character.",
    nudge: "Order a flight so you can try what's new before you commit to a pint. It pairs well with an afternoon at Epic's campus down the road.",
  }),
  place({
    id: 'epic-campus', name: 'Epic Campus Tour', what: 'A software company built like a theme park',
    category: 'oddity', hood: 'Verona', lat: 43.0002, lng: -89.5699, price: 0, setting: 'both', minutes: [60, 100], kids: 2,
    moods: 'odd! showoff! kids move', hours: 'mo-fr 14:00-17:00; sa,su 10:00-15:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.epic.com/visiting', gem: 0.85,
    story: "The company behind a great deal of the country's medical records software works in buildings themed as a wizard school, a storybook village and a farm with real animals. The public is allowed in for self-guided tours, which is hard to believe until you are standing in it.",
    nudge: "Reserve a time slot on Epic's visiting page first; walk-ins only get in if a slot is open. Park in the visitor lot under the solar panels, pick up a map at reception, and head for the Wizards Academy and Storybook campuses.",
  }),
];
