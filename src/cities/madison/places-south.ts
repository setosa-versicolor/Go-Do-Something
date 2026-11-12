// South: Park Street, Bay Creek, the south side, Fitchburg.
// Same rules as places.ts: hand-written, distinct, honest about trust.

import type { Option } from '../../core/types';
import { ALWAYS, PARK, place } from './place';

void ALWAYS;

export const PLACES_SOUTH: Option[] = [
  // ------------------------------------------------- Park Street & Bay Creek
  place({
    id: 'ichiban-sichuan', name: 'Ichiban Sichuan', what: 'Serious Sichuan cooking on Park Street',
    category: 'food', hood: 'Park Street', lat: 43.0606, lng: -89.4011, price: 2, setting: 'in', minutes: [45, 80], kids: 1,
    moods: 'eat! lively showoff', hours: 'daily 11:00-22:00', trust: 'solid', checked: '2026-11-12', url: 'https://orderichibansichuan.com/', gem: 0.75,
    story: "The menu runs long and goes well past the usual: mao xue wang, sauteed pork kidney, fish boiled in chili oil, lamb with three peppers. It is the place on Park Street to bring people who say they like spicy food and find out.",
    nudge: "Go with at least three people so you can order across the menu. Get the spicy and crispy chicken and the eggplant with chili garlic sauce, then one thing you have never heard of.",
  }),
  place({
    id: 'taj-park-street', name: 'Taj Indian Cuisine & Bar', what: 'A Park Street Indian standby, back with a cocktail bar',
    category: 'food', hood: 'Park Street', lat: 43.0622, lng: -89.401, price: 2, setting: 'in', minutes: [50, 90], kids: 1,
    moods: 'eat! date drink', hours: 'daily 11:30-21:45', gem: 0.6,
    story: "Taj fed Park Street for years, lost its building to redevelopment, and reopened up the street at the end of 2025 in the old Borough Beer space. The North Indian cooking came along, and this time there is a proper cocktail list to go with it.",
    nudge: "Sit down for dinner instead of carrying out; the new room is the point. Order a curry, bread for the table, and one of the house cocktails while you wait.",
  }),
  place({
    id: 'mason-lounge', name: 'The Mason Lounge', what: 'A small, serious beer bar on Park Street',
    category: 'bar', hood: 'Park Street', lat: 43.0624, lng: -89.4006, price: 1, setting: 'both', minutes: [40, 90], kids: 0,
    moods: 'drink! cozy think date', hours: 'su 17:30-22:00; tu-th 15:00-24:00; fr,sa 15:00-01:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.themasonlounge.com/', gem: 0.7,
    story: "A neighborhood bar that has been pouring a well-chosen list of craft beer since 2010, with cocktails for the people who came along. It is small and unhurried, there is a patio out back, and now and then there is live music.",
    nudge: "Ask what just went on tap and take it to the patio if the weather allows. If you get hungry, they will sort you out with a Falbo Bros. pizza without you leaving your seat.",
  }),
  place({
    id: 'friends-applaud', name: 'Friends Applaud', what: 'A 28-seat cafe and tavern in Bay Creek',
    category: 'bar', hood: 'Bay Creek', lat: 43.05, lng: -89.3921, price: 2, setting: 'in', minutes: [40, 90], kids: 0,
    moods: 'date! cozy! drink eat think', hours: 'we-fr 15:30-22:00; sa 11:00-22:00; su 11:00-15:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.friendsapplaud.com/', gem: 0.75,
    story: "A tiny room on a residential corner of Gilson Street that is a coffee shop, a wine bar and a tavern depending on the hour. The menu is short and a bit particular: raclette sandwiches, tins of fish, Loire wines, absinthe. Thursdays there is chess and live music.",
    nudge: "Go on a weeknight, get a raclette sandwich and a glass of whatever Loire white is open, and stay for a second. Saturday and Sunday it opens at 11 if you would rather have coffee and a pastry.",
  }),
  place({
    id: 'king-of-falafel', name: 'King of Falafel', what: 'Falafel and shawarma from a Park Street gas station',
    category: 'food', hood: 'Park Street', lat: 43.0549, lng: -89.3973, price: 1, setting: 'in', minutes: [20, 40], kids: 1,
    moods: 'eat! odd', hours: 'mo-fr 10:00-21:00; sa 11:00-21:00', gem: 0.6,
    story: "It used to be near State Street; now it is a counter attached to a gas station on South Park, which has not hurt the cooking at all. Readers of the local food newsletter keep naming it when asked where the good cheap meals are.",
    nudge: "Order the falafel, obviously, and eat it right away while it is hot. It is a quick stop, so pair it with a walk along Monona Bay a few blocks east.",
  }),
  place({
    id: 'bernies-beach', name: "Bernie's Beach", what: 'A small neighborhood beach on Monona Bay',
    category: 'park', hood: 'Bay Creek', lat: 43.0571, lng: -89.3893, price: 0, setting: 'out', minutes: [20, 50], kids: 2,
    moods: 'nature think kids', hours: PARK, trust: 'solid', needs: ['mild', 'daylight'], best: ['sunset'],
    story: "A pocket of sand on the south shore of Monona Bay, at the edge of the Bay Creek neighborhood. The bay is calm and the view runs back across the water toward downtown. Mostly it is neighbors, kids and a few people fishing.",
    nudge: "Bring something from Park Street and eat it at the water. Afterward follow the shore path west around the bay toward Brittingham Park for as long as you feel like walking.",
  }),

  // ------------------------------------------------------ Regent & Greenbush
  place({
    id: 'fabiolas', name: "Fabiola's Spaghetti House & Deli", what: 'Red-sauce Italian, back in the old Greenbush',
    category: 'food', hood: 'Greenbush', lat: 43.0674, lng: -89.4076, price: 2, setting: 'in', minutes: [60, 100], kids: 1,
    moods: 'eat! date showoff lively', hours: 'we-su 16:30-21:00', gem: 0.75,
    story: "Regent Street near Park was once called Spaghetti Corners for all its Italian restaurants, in a neighborhood the city later bulldozed. Fabiola's set out to put red sauce back: Sunday gravy, chicken Vesuvio, spaghetti and meatballs, in what used to be a Rocky Rococo.",
    nudge: "Reserve ahead and check for Badger home games, when dinner service can be off. Order the Sunday gravy or the spaghetti and meatballs and do not try to be clever about it.",
  }),
  place({
    id: 'stellas-regent', name: "Stella's Bakery & Cafe", what: 'Home of the hot and spicy cheese bread',
    category: 'treat', hood: 'Regent Street', lat: 43.0676, lng: -89.4064, price: 1, setting: 'in', minutes: [15, 40], kids: 1,
    moods: 'eat! showoff', hours: 'tu-sa 07:00-18:00', gem: 0.7,
    story: "Stella's hot and spicy cheese bread is the thing people carry around the Saturday farmers' market, tearing pieces off a warm loaf. In 2025 the bakery moved its storefront to Regent Street, so you no longer have to wait for Saturday, and they build sandwiches on a cheese bread bun.",
    nudge: "Ask for a warm loaf of the hot and spicy cheese bread and pull it apart with your hands. If you want lunch, get a sandwich on the cheese bread bun.",
  }),

  // --------------------------------------------------------------- south side
  place({
    id: 'delta-beer-lab', name: 'Delta Beer Lab', what: 'A taproom that gives to local nonprofits',
    category: 'bar', hood: 'South Side', lat: 43.0374, lng: -89.3823, price: 1, setting: 'in', minutes: [40, 90], kids: 1,
    moods: 'drink! lively think', hours: 'mo,tu 14:00-20:00; we-fr 14:00-21:30; sa 12:00-21:30; su 12:00-18:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.delta.beer/', gem: 0.65,
    story: "A brewery just off the Beltline that calls its taproom a social laboratory and means it. Each stretch of the calendar has a nonprofit partner, and the brewery has passed along more than $220,000 to local groups that way. The beer is clean and well made.",
    nudge: "Look at the board to see which nonprofit is this round's partner, then order a flight so you can find your beer. It is a big open room, easy with a group.",
  }),
  place({
    id: 'lake-farm-park', name: 'Lake Farm County Park', what: 'A long boardwalk bridge out over Lake Waubesa',
    category: 'trail', hood: 'South Side', lat: 43.0312, lng: -89.3376, price: 0, setting: 'out', minutes: [40, 90], kids: 1,
    moods: 'move! nature! think date', hours: PARK, trust: 'solid', needs: ['daylight'], best: ['sunset'], gem: 0.75,
    story: "From this county park the Lower Yahara River Trail heads out over the water on a long boardwalk bridge, crossing the top of Lake Waubesa toward McFarland. You are in the middle of a lake, on foot or on a bike, with marsh on one side.",
    nudge: "Park by the Lussier Family Heritage Center and follow the trail east until you are over open water. Stop partway across and watch the water for a while. Bring a jacket; it is windier out there than on shore.",
  }),

  // ---------------------------------------------------------------- Fitchburg
  place({
    id: 'quiveys-grove', name: "Quivey's Grove", what: 'Wisconsin cooking in an 1855 stone house and stable',
    category: 'food', hood: 'Fitchburg', lat: 43.0082, lng: -89.4825, price: 2, setting: 'in', minutes: [60, 110], kids: 1,
    moods: 'eat! showoff! date cozy', hours: 'tu-th 11:00-20:00; fr,sa 11:00-21:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.quiveysgrove.com/', gem: 0.85,
    story: "A fieldstone house and stable built in 1855, turned into a restaurant in 1980 with the stated aim of serving all the goodness of Wisconsin. The Stone House is the sit-up-straight dining room among the antiques; the Stable Grill next door is the casual one, with beams and a bar.",
    nudge: "For a relaxed night go to the Stable Grill, which is open from lunch on. Book the Stone House for dinner if it is an occasion; it only opens in the evening. Either way, walk the grounds first.",
  }),
  place({
    id: 'bavaria-sausage', name: 'Bavaria Sausage', what: 'A German sausage kitchen and import shop',
    category: 'market', hood: 'Fitchburg', lat: 43.0072, lng: -89.4838, price: 1, setting: 'in', minutes: [15, 35], kids: 1,
    moods: 'eat! odd learn', hours: 'mo,tu 09:00-18:00; we-fr 09:00-19:00; sa 09:00-15:30', trust: 'solid', checked: '2026-11-12', url: 'https://www.bavariasausage.com/', gem: 0.7,
    story: "A family has been making sausage here for more than sixty years from recipes brought over from Schweinfurt, still mixed by hand. The shop around the meat counter is a small German grocery: mustards, breads, landjaegers, Haribo and Milka by the shelf.",
    nudge: "Get brats or weisswurst for later and a couple of landjaegers for the car. Then walk the shelves slowly; the mustard aisle alone is worth ten minutes.",
  }),
  place({
    id: 'ten-pin-alley', name: 'Ten Pin Alley', what: 'Thirty-two lanes of ordinary, good bowling',
    category: 'play', hood: 'Fitchburg', lat: 43.0083, lng: -89.4824, price: 1, setting: 'in', minutes: [45, 100], kids: 2,
    moods: 'move! kids! lively drink', hours: 'mo 09:00-24:00; tu,we 11:00-24:00; th-sa 09:00-24:00; su 10:00-22:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.tenpinalleys.com/bowling', gem: 0.55,
    story: "A straightforward bowling center with 32 lanes, a bar and grill, and bumpers that pop up automatically for the kids' turns and drop for yours. No black lights required. Games are still priced by the game, a few dollars each.",
    nudge: "Monday is the cheap day, all day. League nights fill the lanes, so call ahead on weekday evenings. Ask for the automatic bumpers if you have small kids along.",
  }),
  place({
    id: 'hop-haus-fitchburg', name: 'Hop Haus Brewing', what: 'A Fitchburg brewpub with a lawn and a patio',
    category: 'bar', hood: 'Fitchburg', lat: 43.005, lng: -89.4588, price: 2, setting: 'both', minutes: [45, 100], kids: 1,
    moods: 'drink! eat lively', hours: 'mo 16:00-22:00; tu-th 11:00-22:00; fr,sa 11:00-23:00; su 11:00-21:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.hophausbrewing.com/', gem: 0.6,
    story: "Hop Haus started as a small taproom in Verona and built this much larger brewpub out in Fitchburg, with a full kitchen, a patio and a lawn. It is the easy answer on the south end of town when you want a good beer and room to spread out.",
    nudge: "On a warm evening get a table outside by the lawn. Order a flight first, then a pint of the one you liked, and eat here; the kitchen is part of the reason to come.",
  }),
  place({
    id: 'great-dane-fitchburg', name: 'Great Dane Pub, Fitchburg', what: "The south-side outpost of Madison's own brewpub",
    category: 'bar', hood: 'Fitchburg', lat: 43.0178, lng: -89.4232, price: 2, setting: 'in', minutes: [50, 100], kids: 1,
    moods: 'drink eat! lively', hours: 'su 10:00-22:00; mo-th 11:00-22:00; fr 11:00-24:00; sa 10:00-24:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.greatdanepub.com/locations/fitchburg', gem: 0.5,
    story: "The Great Dane is Madison's homegrown brewpub, and this is its Fitchburg house, just off Fish Hatchery Road. It is dependable in the best sense: house-brewed beer, a big pub menu, and room for a group that did not plan ahead.",
    nudge: "Ask which house beers are on and start there. It opens at 10 on weekends if brunch is the plan, and it is open late on Friday and Saturday.",
  }),
  place({
    id: 'oasis-cafe', name: 'Oasis Cafe', what: 'Breakfast, lunch and Russian dumplings in an office park',
    category: 'cafe', hood: 'Fitchburg', lat: 43.0007, lng: -89.4251, price: 1, setting: 'in', minutes: [30, 60], kids: 1,
    moods: 'eat! cozy think', hours: 'mo-fr 06:30-16:00; sa,su 07:00-14:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.oasiscafefitchburg.com/', gem: 0.6,
    story: "A scratch-baking cafe tucked into the Fitchburg technology campus, where you would not expect to find much. Alongside the breakfast sandwiches and frittata, the signature dish is pelmeni, Russian potato dumplings. Plenty of the menu is vegetarian.",
    nudge: "Order the pelmeni, even at breakfast, plus something from the bakery case. Weekends are quieter than weekdays, when the office crowd comes through at noon.",
  }),
  place({
    id: 'rolling-pin', name: 'Rolling Pin Bake Shop', what: 'A Russian and European bakery and cafe',
    category: 'treat', hood: 'Fitchburg', lat: 43.0142, lng: -89.4276, price: 1, setting: 'in', minutes: [20, 50], kids: 1,
    moods: 'eat! cozy', hours: 'mo-fr 07:00-18:00; sa 07:30-14:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.rollingpinbakeshop.com/', gem: 0.65,
    story: "A bakery in a Fish Hatchery Road strip mall whose case leans Russian and European: cakes, cheesecakes, pastries, scones and bread, all made here. The cafe side does breakfast, lunch and soup, in the same home-style spirit.",
    nudge: "Come before 1:45, when the kitchen stops, and have soup or lunch, then choose a slice of cake from the case to take home. It is closed Sundays.",
  }),

  // Asked for by name.
  place({
    id: 'greenbush-bar', name: 'Greenbush Bar', what: "Thin-crust pizza under the Italian Workmen's Club",
    category: 'food', hood: 'Greenbush', lat: 43.0678, lng: -89.4018, price: 2, setting: 'in', minutes: [50, 100], kids: 1,
    moods: 'eat! drink date cozy showoff', hours: 'mo-sa 16:30-24:00', best: ['night'], gem: 0.85,
    story: "Down a staircase into the basement of the Italian Workmen's Club, in what is left of Madison's old Italian neighborhood: low ceiling, Christmas lights all year, thin-crust pizza. It changed hands in 2024 and the new owner kept the pizza as it was and the doors open later.",
    nudge: "Start with the garlic bread, then split a thin-crust pizza; the New Haven, with shallots, roasted garlic and pecorino, is the one the owner points to. Go early on weekends and Badger game days, and call 608-257-2874 before a Sunday visit, since listings disagree about Sundays.",
  }),
];
