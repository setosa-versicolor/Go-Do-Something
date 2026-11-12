// North and east: the north side, Maple Bluff, East Washington past the river, Cottage Grove Road, Monona, Sun Prairie.
// Same rules as places.ts: hand-written, distinct, honest about trust.

import type { Option } from '../../core/types';
import { ALWAYS, PARK, place } from './place';

void ALWAYS;

export const PLACES_NORTH_EAST: Option[] = [
  // ------------------------------------------------------------- north side
  place({
    id: 'smoky-jons', name: "Smoky Jon's #1 BBQ", what: 'Ribs from a north side smokehouse',
    category: 'food', hood: 'North Side', lat: 43.1232, lng: -89.3552, price: 2, setting: 'in', minutes: [30, 60], kids: 1,
    moods: 'eat! odd', hours: 'we,th,su 11:00-20:00; fr,sa 11:00-21:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.smokyjons.com/', gem: 0.7,
    story: "A family barbecue place on Packers Avenue that has been at it since 1970 and has a wall's worth of competition awards to show for it. The ribs are the reason people drive across town, and the brick-red sauce is sweet first and spicy after.",
    nudge: "Get ribs, and get there well before closing: the dining room shuts half an hour ahead of the posted time. Closed Monday and Tuesday, so don't plan a start-of-week craving around it.",
  }),
  place({
    id: 'beef-butter-bbq', name: 'Beef Butter BBQ', what: 'Texas-style smoked brisket on North Sherman',
    category: 'food', hood: 'North Side', lat: 43.1297, lng: -89.3627, price: 2, setting: 'in', minutes: [25, 50], kids: 1,
    moods: 'eat!', hours: 'daily 10:00-20:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.beefbutterbbq.com/', gem: 0.65,
    story: "A counter-service smokehouse on North Sherman Avenue built around Texas-style prime brisket, which is not a thing Wisconsin usually does well. Here it's the point of the place, with ribs, wings and pulled pork backing it up.",
    nudge: "Order the brisket first and decide about everything else second. It's open every day from mid-morning, so it works as an early lunch before a walk around Warner Park up the street.",
  }),
  place({
    id: 'warner-park', name: 'Warner Park', what: 'The north side\'s big park, lagoon and ballpark',
    category: 'park', hood: 'North Side', lat: 43.1287, lng: -89.3719, price: 0, setting: 'out', minutes: [30, 70], kids: 2,
    moods: 'nature! move kids think', hours: PARK, trust: 'solid', needs: ['daylight'], gem: 0.6,
    story: "The north side's main park: a lagoon and marsh that are good for birds, a lot of open lawn, and the ballpark where the Mallards play in summer. Half of it is ballfields and half of it is left alone, and the left-alone half is the better one.",
    nudge: "Skip the parking lot by the stadium and walk the paths around the lagoon toward the wilder back side. Bring binoculars if you own a pair. It's a ten minute walk from here to the lake.",
  }),
  place({
    id: 'lake-view-hill', name: 'Lake View Hill Park', what: 'A wooded hilltop above the north side',
    category: 'view', hood: 'North Side', lat: 43.1381, lng: -89.3746, price: 0, setting: 'out', minutes: [20, 45], kids: 1,
    moods: 'think! nature odd', hours: 'daily 05:00-22:00', trust: 'solid', needs: ['daylight'], best: ['sunset'], gem: 0.65,
    story: "A county park on the grounds of the old tuberculosis sanatorium on Northport Drive. The big building still stands at the top of the hill, with woods behind it and a long look south across the north side toward Lake Mendota.",
    nudge: "Park at the top, stand on the lawn in front of the old building for the view, then take the trail loop through the woods behind it. Go late in the day when the light is coming in low.",
  }),
  place({
    id: 'burrows-park', name: 'Burrows Park', what: 'A small lakeshore park with an effigy mound',
    category: 'park', hood: 'Maple Bluff', lat: 43.1019, lng: -89.3671, price: 0, setting: 'out', minutes: [15, 40], kids: 1,
    moods: 'think! nature', hours: PARK, trust: 'solid', needs: ['daylight'], best: ['sunset'], gem: 0.6,
    story: "A quiet strip of Lake Mendota shoreline off Sherman Avenue, just before Maple Bluff. On the rise above the water is a bird effigy mound, built about a thousand years ago and easy to miss if nobody tells you it's there.",
    nudge: "Find the mound first and walk around it, not over it. Then go down to the water and look west across the lake. It is rarely busy, so bring a thermos and stay a while.",
  }),
  place({
    id: 'karben4', name: 'Karben4 Brewing', what: 'A brewery taproom out by the airport',
    category: 'bar', hood: 'North Side', lat: 43.1262, lng: -89.3257, price: 2, setting: 'in', minutes: [40, 90], kids: 1,
    moods: 'drink! eat lively', hours: 'mo-we 14:00-20:00; th 14:00-21:00; fr,sa 12:00-21:00; su 12:00-18:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.karben4.com/', gem: 0.65,
    story: "One of Madison's better known breweries, in an industrial park off Kinsman Boulevard where you would not otherwise have a reason to be. The taproom pours the full range and has a food menu, so it holds up as a dinner plan and not only a pint.",
    nudge: "Start with a flight if you don't know the beers, then commit to a pint of the one you liked. It closes early by bar standards, so treat it as the first stop of the night.",
  }),

  // ------------------------------------------------------------- eken park
  place({
    id: 'tip-top-tavern', name: 'Tip Top Tavern', what: 'A corner tavern that takes its food seriously',
    category: 'food', hood: 'Eken Park', lat: 43.107, lng: -89.351, price: 2, setting: 'in', minutes: [45, 90], kids: 1,
    moods: 'eat! drink cozy date', hours: 'mo-th 11:00-24:00; fr 11:00-01:00; sa 09:00-01:00; su 09:00-22:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.thetiptoptavern.com/', gem: 0.75,
    story: "An old neighborhood bar on North Street that looks like every other corner tavern in Wisconsin and cooks a good deal better than most of them. It is where Eken Park eats, and the Friday fish fry is a real one.",
    nudge: "Go on a Friday for the fish fry and expect to wait at the bar for a table. On Saturday and Sunday it opens at nine, which makes it a good slow breakfast.",
  }),
  place({
    id: 'dexters-pub', name: "Dexter's Pub", what: 'Fish fry and two dozen taps at North and Johnson',
    category: 'food', hood: 'Eken Park', lat: 43.1034, lng: -89.3502, price: 2, setting: 'in', minutes: [45, 90], kids: 1,
    moods: 'eat! drink! lively', hours: 'tu-th 11:00-22:00; fr,sa 11:00-23:00; su 11:00-18:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.dexterspubmadison.com/locations', gem: 0.75,
    story: "An east side pub with 24 lines of beer and cider and a kitchen that grinds its own burgers and buys from local butchers and bakers. Its Friday fish fry regularly gets named the best in town, in a town with strong opinions about that.",
    nudge: "Friday means fish, and a wait. Any other night, read the tap list on the screen before you sit down and get a burger. Closed Mondays, and it shuts early on Sunday.",
  }),

  // ------------------------------------------------------------- east side
  place({
    id: 'la-taguara', name: 'La Taguara', what: 'Venezuelan arepas and cachapas on East Wash',
    category: 'food', hood: 'East Washington', lat: 43.1145, lng: -89.3285, price: 2, setting: 'in', minutes: [35, 70], kids: 1,
    moods: 'eat! odd', hours: 'mo-th 11:00-20:00; fr 11:00-21:00; sa 09:00-21:00; su 09:00-15:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.lataguara-madison.com/', gem: 0.75,
    story: "A small Venezuelan restaurant in an unpromising stretch of East Washington Avenue. Arepas stuffed to order, cachapas (sweet corn pancakes folded over cheese), tequeños, and pabellón, the national plate of shredded beef, black beans, rice and plantain.",
    nudge: "Start with tequeños for the table, then a pabellón arepa or the cachapa with cheese. Finish with the quesillo. It closes mid-afternoon on Sunday, so make that one a lunch.",
  }),
  place({
    id: 'dairyland-family', name: 'Dairyland Family Restaurant', what: 'An all-day diner on Cottage Grove Road',
    category: 'food', hood: 'Cottage Grove Road', lat: 43.0843, lng: -89.3136, price: 1, setting: 'in', minutes: [35, 60], kids: 2,
    moods: 'eat! cozy kids', hours: 'daily 06:00-21:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.dairylandfamilyrestaurant.net/', gem: 0.55,
    story: "The east side's plain, dependable family restaurant: booths, a long menu, daily specials on a board, and breakfast whenever you want it. Nothing here is trying to impress you, which is the appeal.",
    nudge: "Ask what the daily special is before you open the menu. It opens at six every morning, so this is the answer when you're up early on the east side and nothing else is.",
  }),
  place({
    id: 'java-cat', name: 'Java Cat', what: 'A neighborhood coffee house on the far east side',
    category: 'cafe', hood: 'Far East Side', lat: 43.1207, lng: -89.3101, price: 1, setting: 'in', minutes: [20, 60], kids: 1,
    moods: 'cozy! think eat', hours: 'daily 07:00-17:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.javacatmadison.com/', gem: 0.45,
    story: "An independent coffee and tea shop on Lien Road, in a part of town that is otherwise drive-throughs and chains. Espresso, a long tea list, sandwiches and salads, and people who are plainly regulars.",
    nudge: "Order at the counter, add a sandwich if it's near lunch, and take a table with a book. It's open every day but done by five, so think of it as a morning or afternoon stop.",
  }),

  // ------------------------------------------------------------- atwood
  place({
    id: 'bar-corallini', name: 'Bar Corallini', what: 'Southern Italian with house-made pasta, on Atwood',
    category: 'food', hood: 'Atwood', lat: 43.0923, lng: -89.3545, price: 3, setting: 'in', minutes: [60, 110], kids: 1,
    moods: 'date! eat! showoff', hours: 'mo-th 16:00-21:00; fr 16:00-22:00; sa 11:00-22:00; su 11:00-21:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.barcorallini.com/', gem: 0.8,
    story: "The chef comes from Torre del Greco, near Naples, and the restaurant is named for what people from there are called. Pasta and pizza dough are made in house and so are the mozzarella and burrata, daily. It's the nice dinner on Atwood.",
    nudge: "Book a table for the weekend. Order the cacio e pepe or the ravioli, and something with the house mozzarella to start. Sunday to Thursday there's a happy hour from four to six.",
  }),
  place({
    id: 'starkweather-brewing', name: 'Starkweather Brewing', what: 'A neighborhood brewpub with a patio',
    category: 'bar', hood: 'Atwood', lat: 43.0937, lng: -89.3457, price: 2, setting: 'both', minutes: [40, 90], kids: 1,
    moods: 'drink! eat lively', hours: 'tu-th 16:00-22:00; fr 14:00-22:00; sa 12:00-22:00; su 12:00-20:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.starkweatherbrewing.com/', gem: 0.6,
    story: "A small brewpub at the east end of Atwood Avenue that pours only its own beer, with seasonal and rotating taps all year. The food is wings, tenders and cheese curds, and there's a euchre league, which tells you who drinks here.",
    nudge: "Get a pint and a basket of curds and take them out to the patio if the weather allows. Closed Mondays. It's a short walk from here to Olbrich Park and the lake.",
  }),
  place({
    id: 'table-wine', name: 'Table Wine', what: 'A wine shop with a small bar in the window',
    category: 'bar', hood: 'Atwood', lat: 43.0933, lng: -89.3483, price: 2, setting: 'in', minutes: [30, 75], kids: 0,
    moods: 'date! drink cozy think', hours: 'mo,tu 12:00-20:00; we-sa 12:00-21:00; su 12:00-18:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.tablewinemadison.com/', gem: 0.7,
    story: "A neighborhood wine shop in an old Schenk's Corners building, with a few seats where you can drink a glass of what they sell. The staff talk about wine like people, and nothing about it is intimidating.",
    nudge: "Ask for a glass of whatever they're excited about this week and take the seat in the front window to watch Atwood go by. Buy the bottle on your way out if you liked it.",
  }),
  place({
    id: 'chocolate-shoppe-atwood', name: 'Chocolate Shoppe Ice Cream', what: "Madison's own ice cream, the Atwood shop",
    category: 'treat', hood: 'Atwood', lat: 43.0938, lng: -89.3476, price: 1, setting: 'in', minutes: [15, 35], kids: 2,
    moods: 'eat! kids date', hours: 'mo-th 14:00-21:00; fr-su 12:00-21:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.chocolateshoppeicecream.com/madison-shoppes/', best: ['hot'], gem: 0.65,
    story: "Chocolate Shoppe is the ice cream Madison grew up on, made on the east side and scooped all over Wisconsin. The Atwood Avenue shop is the neighborhood one: a long case of flavors and a line out the door on warm nights.",
    nudge: "Ask for a taste of two flavors you've never heard of before you settle. Get it in a cone and walk Atwood with it. Note it doesn't open until two on weekdays.",
  }),
  place({
    id: 'gail-ambrosius', name: 'Gail Ambrosius Chocolatier', what: 'Handmade chocolates from a small Atwood shop',
    category: 'treat', hood: 'Atwood', lat: 43.0925, lng: -89.3523, price: 2, setting: 'in', minutes: [10, 25], kids: 1,
    moods: 'eat! date showoff', hours: 'mo-fr 10:00-18:00; sa 11:00-15:00', trust: 'solid', checked: '2026-11-12', url: 'https://gailambrosius.com/', gem: 0.75,
    story: "A chocolate maker's shop on Atwood Avenue with a case of small, careful, handmade pieces. It has been here for around twenty years and is the box Madison people bring when they need to bring something good.",
    nudge: "Don't buy a pre-packed box. Stand at the case and pick six pieces one by one, and ask about anything you don't recognize. Eat one on the sidewalk. Closed Sundays, and Saturday is short.",
  }),

  // ------------------------------------------------------------- monona
  place({
    id: 'frabonis-monona', name: "Fraboni's Italian Specialties", what: 'An old-school Italian deli and grocery',
    category: 'food', hood: 'Monona', lat: 43.0569, lng: -89.3259, price: 1, setting: 'in', minutes: [15, 35], kids: 1,
    moods: 'eat! odd', hours: 'mo-fr 10:00-19:00; sa 10:00-18:00; su 10:00-17:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.frabonisdeli.com/', gem: 0.7,
    story: "An Italian deli and grocery that has been feeding Madison since 1971: a deli counter, shelves of imported pasta and tins, and a schedule of specials people plan around. Lasagna dinner on Fridays, fresh cannoli on Saturdays, chicken dinner on Sundays.",
    nudge: "Get a sandwich made at the deli counter and take it to a picnic table at a Monona park. On a Saturday, add a cannoli. Walk the grocery shelves before you leave.",
  }),
  place({
    id: 'buck-and-honeys-monona', name: "Buck & Honey's", what: 'A big, polished supper spot on the Yahara',
    category: 'food', hood: 'Monona', lat: 43.0478, lng: -89.3376, price: 3, setting: 'in', minutes: [60, 100], kids: 1,
    moods: 'eat! date showoff lively', hours: 'su-th 11:00-21:00; fr,sa 11:00-22:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.buckandhoneys.com/visit-us-monona', gem: 0.6,
    story: "A local restaurant group that started in Sun Prairie, named for the couple who farmed the land under the first one. The Monona room is the dressed-up one, where the east side goes for birthdays, with a wide menu that runs as far as sushi.",
    nudge: "Reserve for a weekend evening. If you only want a taste of it, come for the Saturday or Sunday brunch specials, which run from eleven to two.",
  }),
  place({
    id: 'aldo-leopold-nature-center', name: 'Aldo Leopold Nature Center', what: 'Free trails through prairie, pond and woods',
    category: 'trail', hood: 'Monona', lat: 43.0545, lng: -89.3209, price: 0, setting: 'out', minutes: [30, 75], kids: 2,
    moods: 'nature! kids! learn think', hours: 'daily 07:00-17:00', needs: ['daylight'], gem: 0.7,
    story: "A nature center named for the Wisconsin conservationist, on Femrite Drive in Monona. The trails are free and open every day from dawn until dusk, through prairie, woods and around ponds, and they run straight on into Edna Taylor Conservation Park next door.",
    nudge: "Walk the trails first and let the kids set the pace. The building, with its exhibits, is open 9 to 4 on weekdays and only 10 to 2 on weekends, so go inside before you wander off if it's a Saturday.",
  }),
  place({
    id: 'edna-taylor', name: 'Edna Taylor Conservation Park', what: 'Ponds, oak savanna and effigy mounds',
    category: 'trail', hood: 'Monona', lat: 43.0543, lng: -89.3168, price: 0, setting: 'out', minutes: [30, 70], kids: 1,
    moods: 'nature! think! move', hours: 'daily 07:00-17:00', needs: ['daylight'], best: ['morning'], gem: 0.7,
    story: "A city conservation park on the Monona border: a chain of ponds and marsh full of birds, with a glacial ridge above them that carries a group of effigy mounds. No playground, no ballfield, no dogs. Just the paths.",
    nudge: "Do the loop around the ponds, then climb to the ridge for the mounds. Go early when the birds are busy. Leave the dog at home; conservation parks don't allow them.",
  }),

  // ------------------------------------------------------------- sun prairie
  place({
    id: 'salvatores-sun-prairie', name: "Salvatore's Tomato Pies", what: 'Jersey-style tomato pies on Main Street',
    category: 'food', hood: 'Sun Prairie', lat: 43.183, lng: -89.2129, price: 2, setting: 'in', minutes: [50, 90], kids: 1,
    moods: 'eat! date lively', hours: 'tu-th 16:00-21:00; fr-su 11:00-21:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.salvatorestomatopies.com/sun-prairie', gem: 0.8,
    story: "Jersey-style tomato pie, where the sauce goes on top of the cheese and the crust is thin and crisp. It has spread to Madison and Monona since, but this is downtown Sun Prairie's pizza place and many people's favorite pie in the county.",
    nudge: "Reserve on a weekend. Order one plain tomato pie so you understand the idea, and one with whatever the seasonal toppings are. Closed Mondays, dinner only Tuesday to Thursday.",
  }),
  place({
    id: 'full-mile', name: 'Full Mile Beer Company & Kitchen', what: 'A brewery with a wood-fired oven, downtown',
    category: 'food', hood: 'Sun Prairie', lat: 43.1819, lng: -89.2114, price: 2, setting: 'both', minutes: [50, 90], kids: 1,
    moods: 'eat! drink! lively', hours: 'tu-th 11:00-21:00; fr 11:00-22:00; sa 10:00-22:00; su 10:00-20:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.fullmilebeercompany.com/', gem: 0.7,
    story: "Sun Prairie's own brewery, open since 2018 a block off Main Street. The beer is made in the building, and the kitchen works out of a wood-fired oven: pizzas, sandwiches and comfort food done a notch better than a brewery needs to.",
    nudge: "They don't take reservations or call-aheads, so show up and put your name in. Get a pizza from the wood oven and whatever is newest on tap. Weekend brunch runs until two.",
  }),
];
