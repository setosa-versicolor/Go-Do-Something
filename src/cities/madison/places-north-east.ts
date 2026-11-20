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
    why: { eat: "Ribs people drive across town for, in a sauce that's sweet first and spicy after." },
    story: "A family barbecue place on Packers Avenue that has been at it since 1970 and has a wall's worth of competition awards to show for it. The ribs are the reason people drive across town, and the brick-red sauce is sweet first and spicy after.",
    nudge: "Get ribs, and get there well before closing: the dining room shuts half an hour ahead of the posted time. Closed Monday and Tuesday, so don't plan a start-of-week craving around it.",
  }),
  place({
    id: 'beef-butter-bbq', name: 'Beef Butter BBQ', what: 'Texas-style smoked brisket on North Sherman',
    category: 'food', hood: 'North Side', lat: 43.1297, lng: -89.3627, price: 2, setting: 'in', minutes: [25, 50], kids: 1,
    moods: 'eat!', hours: 'daily 10:00-20:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.beefbutterbbq.com/', gem: 0.65,
    why: { eat: "Texas-style brisket, which Wisconsin doesn't usually do well. Here it's the point." },
    story: "A counter-service smokehouse on North Sherman Avenue built around Texas-style prime brisket, which is not a thing Wisconsin usually does well. Here it's the point of the place, with ribs, wings and pulled pork backing it up.",
    nudge: "Order the brisket first and decide about everything else second. It's open every day from mid-morning, so it works as an early lunch before a walk around Warner Park up the street.",
  }),
  place({
    id: 'warner-park', name: 'Warner Park', what: 'The north side\'s big park, lagoon and ballpark',
    category: 'park', hood: 'North Side', lat: 43.1287, lng: -89.3719, price: 0, setting: 'out', minutes: [30, 70], kids: 2,
    moods: 'nature! move kids think', hours: PARK, trust: 'solid', needs: ['daylight'], gem: 0.6,
    why: { nature: 'A lagoon and marsh that are good for birds, and half the park left alone.' },
    story: "The north side's main park: a lagoon and marsh that are good for birds, a lot of open lawn, and the ballpark where the Mallards play in summer. Half of it is ballfields and half of it is left alone, and the left-alone half is the better one.",
    nudge: "Skip the parking lot by the stadium and walk the paths around the lagoon toward the wilder back side. Bring binoculars if you own a pair. It's a ten minute walk from here to the lake.",
  }),
  place({
    id: 'lake-view-hill', name: 'Lake View Hill Park', what: 'A wooded hilltop above the north side',
    category: 'view', hood: 'North Side', lat: 43.1381, lng: -89.3746, price: 0, setting: 'out', minutes: [20, 45], kids: 1,
    moods: 'think! nature odd', hours: 'daily 05:00-22:00', trust: 'solid', needs: ['daylight'], best: ['sunset'], gem: 0.65,
    why: { think: 'A wooded hilltop with a long look south toward Lake Mendota.' },
    story: "A county park on the grounds of the old tuberculosis sanatorium on Northport Drive. The big building still stands at the top of the hill, with woods behind it and a long look south across the north side toward Lake Mendota.",
    nudge: "Park at the top, stand on the lawn in front of the old building for the view, then take the trail loop through the woods behind it. Go late in the day when the light is coming in low.",
  }),
  place({
    id: 'burrows-park', name: 'Burrows Park', what: 'A small lakeshore park with an effigy mound',
    category: 'park', hood: 'Maple Bluff', lat: 43.1019, lng: -89.3671, price: 0, setting: 'out', minutes: [15, 40], kids: 1,
    moods: 'think! nature', hours: PARK, trust: 'solid', needs: ['daylight'], best: ['sunset'], gem: 0.6,
    why: { think: 'A strip of lakeshore that is rarely busy, with a thousand-year-old bird mound above it.' },
    story: "A quiet strip of Lake Mendota shoreline off Sherman Avenue, just before Maple Bluff. On the rise above the water is a bird effigy mound, built about a thousand years ago and easy to miss if nobody tells you it's there.",
    nudge: "Find the mound first and walk around it, not over it. Then go down to the water and look west across the lake. It is rarely busy, so bring a thermos and stay a while.",
  }),
  place({
    id: 'karben4', name: 'Karben4 Brewing', what: 'A brewery taproom out by the airport',
    category: 'bar', hood: 'North Side', lat: 43.1262, lng: -89.3257, price: 2, setting: 'in', minutes: [40, 90], kids: 1,
    moods: 'drink! eat lively', hours: 'mo-we 14:00-20:00; th 14:00-21:00; fr,sa 12:00-21:00; su 12:00-18:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.karben4.com/', gem: 0.65,
    why: { drink: "The full range of one of Madison's better known breweries, with food enough to make it dinner." },
    story: "One of Madison's better known breweries, in an industrial park off Kinsman Boulevard where you would not otherwise have a reason to be. The taproom pours the full range and has a food menu, so it holds up as a dinner plan and not only a pint.",
    nudge: "Start with a flight if you don't know the beers, then commit to a pint of the one you liked. It closes early by bar standards, so treat it as the first stop of the night.",
  }),

  // ------------------------------------------------------------- eken park
  place({
    id: 'tip-top-tavern', name: 'Tip Top Tavern', what: 'A corner tavern that takes its food seriously',
    category: 'food', hood: 'Eken Park', lat: 43.107, lng: -89.351, price: 2, setting: 'in', minutes: [45, 90], kids: 1,
    moods: 'eat! drink cozy date', hours: 'mo-th 11:00-24:00; fr 11:00-01:00; sa 09:00-01:00; su 09:00-22:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.thetiptoptavern.com/', gem: 0.75,
    why: { eat: 'It looks like every corner tavern in Wisconsin and cooks a good deal better than most.' },
    story: "An old neighborhood bar on North Street that looks like every other corner tavern in Wisconsin and cooks a good deal better than most of them. It is where Eken Park eats, and the Friday fish fry is a real one.",
    nudge: "Go on a Friday for the fish fry and expect to wait at the bar for a table. On Saturday and Sunday it opens at nine, which makes it a good slow breakfast.",
  }),
  place({
    id: 'dexters-pub', name: "Dexter's Pub", what: 'Fish fry and two dozen taps at North and Johnson',
    category: 'food', hood: 'Eken Park', lat: 43.1034, lng: -89.3502, price: 2, setting: 'in', minutes: [45, 90], kids: 1,
    moods: 'eat! drink! lively', hours: 'tu-th 11:00-22:00; fr,sa 11:00-23:00; su 11:00-18:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.dexterspubmadison.com/locations', gem: 0.75,
    why: { eat: 'Burgers ground in house, and a Friday fish fry that keeps getting named the best in town.', drink: 'Twenty-four lines of beer and cider. Read the list before you sit down.' },
    story: "An east side pub with 24 lines of beer and cider and a kitchen that grinds its own burgers and buys from local butchers and bakers. Its Friday fish fry regularly gets named the best in town, in a town with strong opinions about that.",
    nudge: "Friday means fish, and a wait. Any other night, read the tap list on the screen before you sit down and get a burger. Closed Mondays, and it shuts early on Sunday.",
  }),

  // ------------------------------------------------------------- east side
  place({
    id: 'la-taguara', name: 'La Taguara', what: 'Venezuelan arepas and cachapas on East Wash',
    category: 'food', hood: 'East Washington', lat: 43.1145, lng: -89.3285, price: 2, setting: 'in', minutes: [35, 70], kids: 1,
    moods: 'eat! odd', hours: 'mo-th 11:00-20:00; fr 11:00-21:00; sa 09:00-21:00; su 09:00-15:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.lataguara-madison.com/', gem: 0.75,
    why: { eat: 'Arepas stuffed to order, and sweet corn pancakes folded over cheese.' },
    story: "A small Venezuelan restaurant in an unpromising stretch of East Washington Avenue. Arepas stuffed to order, cachapas (sweet corn pancakes folded over cheese), tequeños, and pabellón, the national plate of shredded beef, black beans, rice and plantain.",
    nudge: "Start with tequeños for the table, then a pabellón arepa or the cachapa with cheese. Finish with the quesillo. It closes mid-afternoon on Sunday, so make that one a lunch.",
  }),
  place({
    id: 'dairyland-family', name: 'Dairyland Family Restaurant', what: 'An all-day diner on Cottage Grove Road',
    category: 'food', hood: 'Cottage Grove Road', lat: 43.0843, lng: -89.3136, price: 1, setting: 'in', minutes: [35, 60], kids: 2,
    moods: 'eat! cozy kids', hours: 'daily 06:00-21:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.dairylandfamilyrestaurant.net/', gem: 0.55,
    why: { eat: 'Booths, a long menu, and breakfast whenever you want it.' },
    story: "The east side's plain, dependable family restaurant: booths, a long menu, daily specials on a board, and breakfast whenever you want it. Nothing here is trying to impress you, which is the appeal.",
    nudge: "Ask what the daily special is before you open the menu. It opens at six every morning, so this is the answer when you're up early on the east side and nothing else is.",
  }),
  place({
    id: 'java-cat', name: 'Java Cat', what: 'A neighborhood coffee house on the far east side',
    category: 'cafe', hood: 'Far East Side', lat: 43.1207, lng: -89.3101, price: 1, setting: 'in', minutes: [20, 60], kids: 1,
    moods: 'cozy! think eat', hours: 'daily 07:00-17:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.javacatmadison.com/', gem: 0.45,
    why: { cozy: 'A long tea list, a table, and a room of people who are plainly regulars.' },
    story: "An independent coffee and tea shop on Lien Road, in a part of town that is otherwise drive-throughs and chains. Espresso, a long tea list, sandwiches and salads, and people who are plainly regulars.",
    nudge: "Order at the counter, add a sandwich if it's near lunch, and take a table with a book. It's open every day but done by five, so think of it as a morning or afternoon stop.",
  }),

  // ------------------------------------------------------------- atwood
  place({
    id: 'bar-corallini', name: 'Bar Corallini', what: 'Southern Italian with house-made pasta, on Atwood',
    category: 'food', hood: 'Atwood', lat: 43.0923, lng: -89.3545, price: 3, setting: 'in', minutes: [60, 110], kids: 1,
    moods: 'date! eat! showoff', hours: 'mo-th 16:00-21:00; fr 16:00-22:00; sa 11:00-22:00; su 11:00-21:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.barcorallini.com/', gem: 0.8,
    why: { date: 'The nice dinner on Atwood, with pasta made in house.', eat: 'The mozzarella and burrata are made in house every day. Start there.' },
    story: "The chef comes from Torre del Greco, near Naples, and the restaurant is named for what people from there are called. Pasta and pizza dough are made in house and so are the mozzarella and burrata, daily. It's the nice dinner on Atwood.",
    nudge: "Book a table for the weekend. Order the cacio e pepe or the ravioli, and something with the house mozzarella to start. Sunday to Thursday there's a happy hour from four to six.",
  }),
  place({
    id: 'starkweather-brewing', name: 'Starkweather Brewing', what: 'A neighborhood brewpub with a patio',
    category: 'bar', hood: 'Atwood', lat: 43.0937, lng: -89.3457, price: 2, setting: 'both', minutes: [40, 90], kids: 1,
    moods: 'drink! eat lively', hours: 'tu-th 16:00-22:00; fr 14:00-22:00; sa 12:00-22:00; su 12:00-20:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.starkweatherbrewing.com/', gem: 0.6,
    why: { drink: 'A brewpub that pours only its own beer and runs a euchre league.' },
    story: "A small brewpub at the east end of Atwood Avenue that pours only its own beer, with seasonal and rotating taps all year. The food is wings, tenders and cheese curds, and there's a euchre league, which tells you who drinks here.",
    nudge: "Get a pint and a basket of curds and take them out to the patio if the weather allows. Closed Mondays. It's a short walk from here to Olbrich Park and the lake.",
  }),
  place({
    id: 'table-wine', name: 'Table Wine', what: 'A wine shop with a small bar in the window',
    category: 'bar', hood: 'Atwood', lat: 43.0933, lng: -89.3483, price: 2, setting: 'in', minutes: [30, 75], kids: 0,
    moods: 'date! drink cozy think', hours: 'mo,tu 12:00-20:00; we-sa 12:00-21:00; su 12:00-18:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.tablewinemadison.com/', gem: 0.7,
    why: { date: 'A glass in the front window of a wine shop, and nothing about it is intimidating.' },
    story: "A neighborhood wine shop in an old Schenk's Corners building, with a few seats where you can drink a glass of what they sell. The staff talk about wine like people, and nothing about it is intimidating.",
    nudge: "Ask for a glass of whatever they're excited about this week and take the seat in the front window to watch Atwood go by. Buy the bottle on your way out if you liked it.",
  }),
  place({
    id: 'chocolate-shoppe-atwood', name: 'Chocolate Shoppe Ice Cream', what: "Madison's own ice cream, the Atwood shop",
    category: 'treat', hood: 'Atwood', lat: 43.0938, lng: -89.3476, price: 1, setting: 'in', minutes: [15, 35], kids: 2,
    moods: 'eat! kids date', hours: 'mo-th 14:00-21:00; fr-su 12:00-21:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.chocolateshoppeicecream.com/madison-shoppes/', best: ['hot'], gem: 0.65,
    why: { eat: 'The ice cream Madison grew up on, from a long case of flavors.' },
    story: "Chocolate Shoppe is the ice cream Madison grew up on, made on the east side and scooped all over Wisconsin. The Atwood Avenue shop is the neighborhood one: a long case of flavors and a line out the door on warm nights.",
    nudge: "Ask for a taste of two flavors you've never heard of before you settle. Get it in a cone and walk Atwood with it. Note it doesn't open until two on weekdays.",
  }),
  place({
    id: 'gail-ambrosius', name: 'Gail Ambrosius Chocolatier', what: 'Handmade chocolates from a small Atwood shop',
    category: 'treat', hood: 'Atwood', lat: 43.0925, lng: -89.3523, price: 2, setting: 'in', minutes: [10, 25], kids: 1,
    moods: 'eat! date showoff', hours: 'mo-fr 10:00-18:00; sa 11:00-15:00', trust: 'solid', checked: '2026-11-12', url: 'https://gailambrosius.com/', gem: 0.75,
    why: { eat: 'Small, careful, handmade chocolates. Pick six from the case, one by one.' },
    story: "A chocolate maker's shop on Atwood Avenue with a case of small, careful, handmade pieces. It has been here for around twenty years and is the box Madison people bring when they need to bring something good.",
    nudge: "Don't buy a pre-packed box. Stand at the case and pick six pieces one by one, and ask about anything you don't recognize. Eat one on the sidewalk. Closed Sundays, and Saturday is short.",
  }),

  // ------------------------------------------------------------- monona
  place({
    id: 'frabonis-monona', name: "Fraboni's Italian Specialties", what: 'An old-school Italian deli and grocery',
    category: 'food', hood: 'Monona', lat: 43.0569, lng: -89.3259, price: 1, setting: 'in', minutes: [15, 35], kids: 1,
    moods: 'eat! odd', hours: 'mo-fr 10:00-19:00; sa 10:00-18:00; su 10:00-17:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.frabonisdeli.com/', gem: 0.7,
    why: { eat: 'An Italian deli that has been at it since 1971. Get a sandwich made at the counter.' },
    story: "An Italian deli and grocery that has been feeding Madison since 1971: a deli counter, shelves of imported pasta and tins, and a schedule of specials people plan around. Lasagna dinner on Fridays, fresh cannoli on Saturdays, chicken dinner on Sundays.",
    nudge: "Get a sandwich made at the deli counter and take it to a picnic table at a Monona park. On a Saturday, add a cannoli. Walk the grocery shelves before you leave.",
  }),
  place({
    id: 'buck-and-honeys-monona', name: "Buck & Honey's", what: 'A big, polished supper spot on the Yahara',
    category: 'food', hood: 'Monona', lat: 43.0478, lng: -89.3376, price: 3, setting: 'in', minutes: [60, 100], kids: 1,
    moods: 'eat! date showoff lively', hours: 'su-th 11:00-21:00; fr,sa 11:00-22:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.buckandhoneys.com/visit-us-monona', gem: 0.6,
    why: { eat: 'Where the east side goes for birthdays, with a menu that runs as far as sushi.' },
    story: "A local restaurant group that started in Sun Prairie, named for the couple who farmed the land under the first one. The Monona room is the dressed-up one, where the east side goes for birthdays, with a wide menu that runs as far as sushi.",
    nudge: "Reserve for a weekend evening. If you only want a taste of it, come for the Saturday or Sunday brunch specials, which run from eleven to two.",
  }),
  place({
    id: 'aldo-leopold-nature-center', name: 'Aldo Leopold Nature Center', what: 'Free trails through prairie, pond and woods',
    category: 'trail', hood: 'Monona', lat: 43.0545, lng: -89.3209, price: 0, setting: 'out', minutes: [30, 75], kids: 2,
    moods: 'nature! kids! learn think', hours: 'daily 07:00-17:00', needs: ['daylight'], gem: 0.7,
    why: { nature: 'Free trails through prairie and woods and around ponds, open dawn until dusk.', kids: 'Trails where the kids can set the pace, and exhibits indoors.' },
    story: "A nature center named for the Wisconsin conservationist, on Femrite Drive in Monona. The trails are free and open every day from dawn until dusk, through prairie, woods and around ponds, and they run straight on into Edna Taylor Conservation Park next door.",
    nudge: "Walk the trails first and let the kids set the pace. The building, with its exhibits, is open 9 to 4 on weekdays and only 10 to 2 on weekends, so go inside before you wander off if it's a Saturday.",
  }),
  place({
    id: 'edna-taylor', name: 'Edna Taylor Conservation Park', what: 'Ponds, oak savanna and effigy mounds',
    category: 'trail', hood: 'Monona', lat: 43.0543, lng: -89.3168, price: 0, setting: 'out', minutes: [30, 70], kids: 1,
    moods: 'nature! think! move', hours: 'daily 07:00-17:00', needs: ['daylight'], best: ['morning'], gem: 0.7,
    why: { nature: 'A chain of ponds full of birds, below a ridge of effigy mounds.', think: 'No playground, no ballfield, no dogs. Just the paths.' },
    story: "A city conservation park on the Monona border: a chain of ponds and marsh full of birds, with a glacial ridge above them that carries a group of effigy mounds. No playground, no ballfield, no dogs. Just the paths.",
    nudge: "Do the loop around the ponds, then climb to the ridge for the mounds. Go early when the birds are busy. Leave the dog at home; conservation parks don't allow them.",
  }),
  place({
    id: 'san-damiano', name: 'San Damiano', what: 'A former friary lawn on a bluff over Lake Monona',
    category: 'view', hood: 'Monona', lat: 43.0775, lng: -89.3267, price: 0, setting: 'out', minutes: [30, 90], kids: 1,
    moods: 'nature! date! think cozy', hours: 'daily 06:00-22:00', best: ['sunset'], gem: 0.85,
    url: 'https://www.mymonona.com/1580/Frequently-Asked-Questions',
    why: { nature: 'Ten acres of lawn and old trees above a thousand feet of Lake Monona shore.', date: 'A limestone bluff that looks straight across the lake at the Capitol as the sun goes down.' },
    story: "Ten acres on a limestone bluff above Lake Monona, with a thousand feet of shoreline and a straight view across the water to the Capitol. Ho-Chunk ancestors gathered here and a burial mound remains; Norbertine priests studied in the 1890s Frank Allis house for decades. Monona bought it in 2021 and keeps it open as a park.",
    nudge: "Come an hour before sunset, take a picnic table facing the Capitol, and stay until the dome lights up. Parking is a handful of spaces by the house, so bike or walk in if you can. Dogs on leash, and well clear of the mound.",
  }),

  // ------------------------------------------------------------- sun prairie
  place({
    id: 'salvatores-sun-prairie', name: "Salvatore's Tomato Pies", what: 'Jersey-style tomato pies on Main Street',
    category: 'food', hood: 'Sun Prairie', lat: 43.183, lng: -89.2129, price: 2, setting: 'in', minutes: [50, 90], kids: 1,
    moods: 'eat! date lively', hours: 'tu-th 16:00-21:00; fr-su 11:00-21:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.salvatorestomatopies.com/sun-prairie', gem: 0.8,
    why: { eat: 'Tomato pie: the sauce on top of the cheese, the crust thin and crisp.' },
    story: "Jersey-style tomato pie, where the sauce goes on top of the cheese and the crust is thin and crisp. It has spread to Madison and Monona since, but this is downtown Sun Prairie's pizza place and many people's favorite pie in the county.",
    nudge: "Reserve on a weekend. Order one plain tomato pie so you understand the idea, and one with whatever the seasonal toppings are. Closed Mondays, dinner only Tuesday to Thursday.",
  }),
  place({
    id: 'full-mile', name: 'Full Mile Beer Company & Kitchen', what: 'A brewery with a wood-fired oven, downtown',
    category: 'food', hood: 'Sun Prairie', lat: 43.1819, lng: -89.2114, price: 2, setting: 'both', minutes: [50, 90], kids: 1,
    moods: 'eat! drink! lively', hours: 'tu-th 11:00-21:00; fr 11:00-22:00; sa 10:00-22:00; su 10:00-20:00', trust: 'solid', checked: '2026-11-12', url: 'https://www.fullmilebeercompany.com/', gem: 0.7,
    why: { eat: 'Pizza from a wood-fired oven, a notch better than a brewery needs it to be.', drink: 'Beer made in the building. Ask for whatever is newest on tap.' },
    story: "Sun Prairie's own brewery, open since 2018 a block off Main Street. The beer is made in the building, and the kitchen works out of a wood-fired oven: pizzas, sandwiches and comfort food done a notch better than a brewery needs to.",
    nudge: "They don't take reservations or call-aheads, so show up and put your name in. Get a pizza from the wood oven and whatever is newest on tap. Weekend brunch runs until two.",
  }),
  // ---------------- Willy Street & Monona (Reddit-guided pass, 2026-11-18)
  // sources: https://www.visitmadison.com/listings/sardine/175509/, https://www.travelwisconsin.com/food-drink/restaurants/sardine, https://isthmus.com/locations/sardine/, https://www.yelp.com/biz/sardine-madison, https://badgerherald.com/?p=57325
  place({
    id: 'sardine', name: 'Sardine', what: 'A French-American bistro on the Lake Monona shore',
    category: 'food', hood: 'Willy Street', lat: 43.0760, lng: -89.3745, price: 3, setting: 'in', minutes: [60, 100], kids: 1,
    moods: 'eat! date! lively', hours: 'mo-th 16:00-21:00; fr 16:00-22:00; sa 09:00-14:00,16:30-22:00; su 09:00-14:00,16:30-21:00', url: 'https://www.sardinemadison.com/', gem: 0.8,
    why: { eat: 'Steak frites, mussels and a croque monsieur, cooked like a Paris bistro by the lake.', date: 'A busy, warm room with Lake Monona out the windows and a reason to linger.' },
    story: "John Gadau and Phillip Hurley, who started Marigold Kitchen, opened Sardine in 2006 in Machinery Row, a former tobacco warehouse and ice house at the foot of Williamson Street, with Lake Monona out the windows. The menu is French and American bistro: mussels and frites, steak frites, duck confit salad, salmon with lentils, a good cheese plate.",
    nudge: "Reserve, and ask for a table by the lake windows. At dinner get the mussels with frites to share, then steak frites or the duck confit salad. Weekend brunch runs until about two, and the croque monsieur with ham and Gruyere is a regulars' order.",
  }),
  // sources: https://upnorthnewswi.com/food-guide/madison/best-new-restaurants-2025/, https://www.dailycardinal.com/article/2026/01/that-was-grandmas-table-an-ode-to-himal-chuli-madisons-slice-of-nepal, https://restaurantguru.com/Ama-Madison, https://ibmadison.com/nepali-restaurant-coming-to-willy-street/
  place({
    id: 'ama-kitchen', name: 'Ama Kitchen', what: 'Nepali dinners and weekend brunch on Willy Street',
    category: 'food', hood: 'Willy Street', lat: 43.0782, lng: -89.3708, price: 2, setting: 'in', minutes: [45, 90], kids: 1,
    moods: 'eat! date cozy', hours: 'we-fr 17:00-21:30; sa,su 09:30-14:00,17:00-21:30', url: 'https://amakitchenmadison.com', gem: 0.8,
    why: { eat: 'Momos, dal and dosas from the family that ran Himal Chuli, cooked in their mother\'s name.', date: 'A small loft dining room hung with Himalayan and Buddhist art, good for a long dinner.' },
    story: "Ama means mother in Nepali, and this is Rajan Pradhan's tribute to his: his parents founded Himal Chuli, Madison's longtime Nepali kitchen, and his mother died in 2022. Nepali cooking at dinner, American brunch on weekends, in a multi-level house with a cozy loft. The first painting ever hung at Himal Chuli, porters in the mountains, hangs here now.",
    nudge: "Come for dinner Wednesday through Sunday and share momos, dal and a dosa, with an ama lassi on the side. Ask for a table in the loft. Closed Monday and Tuesday; weekend mornings are eggs Benedict and brunch, not the Nepali menu.",
  }),
  // sources: https://fratellistrattoriawi.com/, https://madison.citycast.fm/food-drink/best-italian-restaurants-madison, https://www.wetheitalians.com/news/restaurant-review-fratellis-trattoria-has-great-pizza-and-whole-lot-more, https://ibmadison.com/brothers-to-open-fratellis-trattoria-in-monona/
  place({
    id: 'fratellis-trattoria', name: "Fratelli's Trattoria", what: 'Two brothers\' Italian place in an old house in Monona',
    category: 'food', hood: 'Monona', lat: 43.0569, lng: -89.3258, price: 2, setting: 'in', minutes: [50, 90], kids: 1,
    moods: 'eat! date! cozy', hours: 'su-th 15:30-21:00; fr,sa 15:30-21:30', trust: 'solid', checked: '2026-11-18', url: 'https://fratellistrattoriawi.com/', gem: 0.75,
    why: { eat: 'Pizza on handmade dough and pasta made from scratch, by two brothers who cooked Italian for years.', date: 'An elegant old house on Monona Drive, set up for a slow dinner for two.' },
    story: "Brothers Joaquin and Sergio Lopez opened Fratelli's (it means brothers) in the Monona Drive house where Angelo's ran for thirty years. Joaquin was head chef and co-owner of Nonno's before this. Pizza on handmade dough, pasta made in house, and a local review that put the pizza among the best in the Madison area.",
    nudge: "Call ahead for a table; reservations are by phone. Split a pizza con fico and a pasta, or get the clams in broth. Dinner only, from 3:30. Tell them if it's your birthday: there's a free profiterole in it.",
  }),
  // sources: https://isthmus.com/food-drink/reviews/monona-bakery-eatery-honduran-hideaway/, https://startpage.mapquest.com/us/wisconsin/monona-bakery-and-eatery-375231374, https://page-service.doordash.com/store/monona-bakery-and-eatery-289147
  place({
    id: 'monona-bakery-eatery', name: 'Monona Bakery & Eatery', what: 'A bakery cafe with Honduran baleadas off the menu',
    category: 'food', hood: 'East Side', lat: 43.0706, lng: -89.3255, price: 1, setting: 'in', minutes: [20, 45], kids: 1,
    moods: 'eat! cozy odd', hours: 'mo,we-su 08:00-20:00', gem: 0.7,
    why: { eat: 'Baleadas with red beans, salty cheese and Honduran sour cream, if you know to ask.', odd: 'A sandwich-and-pastry shop that is quietly a Honduran restaurant too.' },
    story: "From the street it's a bakery and sandwich shop: conchas and danishes in the case, crepes and a Philly-style cheesesteak called The Monona on the board. But the owners are from Honduras and Mexico, and the best things here are Honduran: baleadas, banana-leaf tamales, tostones, and a full Honduran breakfast.",
    nudge: "Order a baleada with egg and avocado added and ask for the Honduran hot sauce. If it's not on the board, ask anyway. Take a concha or a guava and cheese danish for later. Closed Tuesdays.",
  }),
  // sources: https://ibmadison.com/hot-n-spicy-moves-into-former-mishqui-peruvian-bistro-location-on-monona-drive/, https://startpage.mapquest.com/us/wisconsin/hot-n-spicy-401131267, https://isthmus.com/food-drink/reviews/noodling-around/, https://madison.citycast.fm/neighborhood-guides/how-to-spice-up-your-grocery-trips-while-shopping-locally
  place({
    id: 'hot-n-spicy', name: "Hot 'n Spicy", what: 'Lao and Thai cooking next to the Viet Hoa market',
    category: 'food', hood: 'East Side', lat: 43.0699, lng: -89.3260, price: 1, setting: 'in', minutes: [25, 50], kids: 1,
    moods: 'eat! odd', hours: 'tu 16:00-20:00; we-su 11:00-14:00,16:00-20:00', gem: 0.75,
    why: { eat: 'Mother-and-son Lao cooking that outgrew a ten-seat counter in the back of a grocery.' },
    story: "A mother-and-son Lao kitchen that started in 2019 as a counter in the back of the Viet Hoa market on Monona Drive, cooking everything to order for about ten seats. It became popular enough to take over the former Mishqui space a few doors down, with room for 48.",
    nudge: "Get the fresh summer rolls and a bowl of pho or the crispy lad na, and ask how hot they mean it. Lunch closes at 2 and dinner runs 4 to 8, so don't come late. Closed Mondays.",
  }),
  // sources: https://spinach.guide/venues/swad-152508/, https://thenorsestar.com/2850/features/singing-praise-for-swad, https://www.foodboss.com/madison-wi/swad-6007-monona-dr-monona-delivery
  place({
    id: 'swad', name: 'Swad', what: 'A family Indian restaurant on Monona Drive',
    category: 'food', hood: 'Monona', lat: 43.0545, lng: -89.3255, price: 2, setting: 'in', minutes: [35, 70], kids: 1,
    moods: 'eat! cozy', hours: 'tu-th,su 11:00-14:30,17:00-21:00; fr,sa 11:00-14:30,17:00-21:30', gem: 0.6,
    why: { eat: 'A long Indian menu, papadam and three chutneys to start, and every dish at the heat you choose.' },
    story: "A family-run Indian restaurant in a strip of small shops on Monona Drive, warmly lit and with a long menu: a page of naan, curries sorted by chicken, lamb, goat and seafood, and plenty for vegetarians. Papadam and three chutneys arrive before you order.",
    nudge: "Start with gobi manchurian, then a biryani or kadai paneer with garlic naan, and say how hot you want it. Lunch ends at 2:30 and dinner starts at 5. Closed Mondays.",
  }),
  // sources: https://waypointonthewater.com/, https://isthmus.com/locations/waypoint-public-house/, https://www.restaurantji.com/wi/monona/waypoint-public-house-/
  place({
    id: 'waypoint-public-house', name: 'Waypoint Public House', what: 'A pub on Yahara Bay with a waterside patio',
    category: 'bar', hood: 'Monona', lat: 43.0473, lng: -89.3301, price: 2, setting: 'both', minutes: [45, 100], kids: 1,
    moods: 'drink! eat lively', hours: 'mo-th 11:00-24:00; fr,sa 11:00-02:00; su 10:00-21:00', trust: 'solid', checked: '2026-11-18', url: 'https://waypointonthewater.com/', best: ['sunset', 'hot'], gem: 0.65,
    why: { drink: 'Thirty taps and a patio over the water at Yahara Bay in Monona.', eat: 'Burgers made with Knoche\'s beef, and a pimento cheese starter that people come back for.' },
    story: "A pub on Broadway in Monona, right on the water at Yahara Bay, with a long beer list on about thirty taps, cocktails, and pub food from smash burgers to a bluegill sandwich. The patio over the river is the reason to pick it in warm weather; Sunday is brunch.",
    nudge: "Get a Knoche's beef burger and the pimento cheese, and sit on the patio if it's open. Sunday brunch runs 10 to 2, with no food from 2 to 3. They don't take reservations, so on a summer evening come early.",
  }),
  // sources: https://www.offbroadwaydrafthouse.com, https://www.mononaeastside.com/?p=17932, https://www.travelwisconsin.com/food-drink/bars-taverns/off-broadway-drafthouse
  place({
    id: 'off-broadway-drafthouse', name: 'Off Broadway Drafthouse', what: 'A 1920s tavern turned craft beer bar by Monona',
    category: 'bar', hood: 'Monona', lat: 43.0471, lng: -89.3546, price: 2, setting: 'both', minutes: [45, 90], kids: 1,
    moods: 'drink! eat cozy', hours: 'tu-su 11:00-21:30', trust: 'solid', checked: '2026-11-18', url: 'https://www.offbroadwaydrafthouse.com', gem: 0.65,
    why: { drink: 'Twenty-four rotating craft taps in a building that has been a speakeasy and a jazz bar.', eat: 'A Friday fish fry and weekend ribs at a neighborhood bar on Raywood Road.' },
    story: "The building on Raywood Road has been around since the 1920s and has been a speakeasy, a jazz bar and a dive. Joe and Rita Klinzing, who have owned it since 1999, reopened it as Off Broadway in 2015, with 24 rotating craft taps, a four-season porch and garden seating.",
    nudge: "Come on a Friday for the fish fry or on a weekend for ribs, and ask what's new on tap. Sit on the four-season porch in cold weather and the garden in warm. The kitchen hours are what's listed here; closed Mondays.",
  }),
  // sources: https://isthmus.com/locations/el-sabor-de-puebla/, https://isthmus.com/food-drink/reviews/happy-affordable-mexican/, https://wanderlog.com/place/details/3976886/el-sabor-de-puebla
  place({
    id: 'el-sabor-de-puebla', name: 'El Sabor de Puebla', what: 'Puebla-style Mexican near East High, known for mole',
    category: 'food', hood: 'East Washington', lat: 43.0985, lng: -89.3572, price: 1, setting: 'in', minutes: [25, 50], kids: 1,
    moods: 'eat! cozy', hours: 'mo-sa 11:00-21:00; su 11:00-20:00', gem: 0.75,
    why: { eat: 'House-made mole poblano and picaditas, cheap, in a small room by East High.' },
    story: "A small Mexican restaurant that started in a converted house on Williamson Street and now sits on North Fourth Street, near East High. The house-made mole poblano is the thing to know it by, along with picaditas, tamales and grilled nopales, and the prices are still low.",
    nudge: "Order something with the mole, a burrito or enchiladas, and add a tamale. Seating is tight, so go off-peak or take it home. Tuesdays are tacos and Thursdays are tamales.",
  }),

  // sources: https://isthmus.com/food-drink/one-dish-lotza-motza-burger-at-players-sports-bar-grill/, https://www.eatdrinkmadison.com/details.php?b=621, https://playerssportsbar2.netwaiter.com/
  // The Monday smash burger deal (about $5 or $6) is from a local's report; no listing online confirms it or its price.
  place({
    id: 'players-sports-bar', name: 'Players Sports Bar & Grill', what: "A cash-only sports bar at Schenk's Corners, for burgers",
    category: 'bar', hood: 'Atwood', lat: 43.0906, lng: -89.3544, price: 1, setting: 'in', minutes: [30, 75], kids: 0,
    moods: 'eat! drink lively', hours: 'daily 11:00-02:00', url: 'https://www.eatdrinkmadison.com/details.php?b=621', gem: 0.6,
    why: { eat: 'Half-pound burgers on Jenifer Street Market beef, and a cheap smash burger deal on Mondays.', drink: "A cash-only corner bar on Winnebago with pool, darts and the game on." },
    story: "A sports bar on Winnebago Street at Schenk's Corners that has become an east side burger institution. The patties are about half a pound of beef from Jenifer Street Market, the weekly Burger of the Week can get outrageous, and the Lotza Motza comes with garlic sauce, pepperoni, mozzarella and fried mozzarella sticks on top. Pool, darts, and nightly drink specials.",
    nudge: "Come on a Monday for the smash burger deal, around $5 or $6 (ask, since it isn't posted online). Any other day, ask what the Burger of the Week is or get the Lotza Motza. Bring cash: they don't take cards.",
  }),

  // ---------------- north side (2026-11-18)
  // sources: https://www.banzomadison.com, https://lauerrealtygroup.com/spotlight-banzo-sherman, https://www.travelwisconsin.com/food-drink/restaurants/banzo
  place({
    id: 'banzo', name: 'Banzo', what: 'Falafel and hummus in a house on Sherman Avenue',
    category: 'food', hood: 'North Side', lat: 43.1016, lng: -89.3649, price: 1, setting: 'in', minutes: [20, 45], kids: 1,
    moods: 'eat! cozy', hours: 'tu-sa 11:00-21:00', trust: 'solid', checked: '2026-11-18', url: 'https://www.banzomadison.com', gem: 0.75,
    why: { eat: 'Falafel from a former Library Mall cart, and the easiest vegetarian dinner in town.' },
    story: "Banzo started in 2011 as a falafel cart on Library Mall and moved into a converted house on Sherman Avenue, by Maple Bluff, the next year. The menu is made from scratch and mostly vegetarian: falafel, sweet potato falafel, hummus, baba ghanoush, fried eggplant, with shawarma for the meat eaters.",
    nudge: "Get a falafel sandwich or platter with hummus and fried eggplant, and finish with baklava and Turkish coffee. Closed Sunday and Monday, and it sometimes closes for a break, so check the site.",
  }),
  // sources: https://wsobirds.org/haunts/haunts-dane/807-governor-s-island, https://wisconsin-explorer.blogspot.com/2018/08/walking-governors-island-in-madison-wi.html, https://madisonmom.com/go-see-explore-governors-island, https://isthmus.com/archive/zzzisthmus-annual-manual/annual-manual-nature-crawl/
  place({
    id: 'governors-island', name: "Governor's Island", what: 'A wooded loop on a peninsula out into Lake Mendota',
    category: 'trail', hood: 'North Side', lat: 43.1242, lng: -89.4015, price: 0, setting: 'out', minutes: [30, 60], kids: 1,
    moods: 'nature! think! move kids', hours: 'daily 04:00-22:00', needs: ['daylight'], best: ['sunset'], gem: 0.75,
    why: { nature: 'Oak woods and rocky bluffs on a peninsula, and a reliable stop for spring warblers.', think: 'A flat, easy loop with open water on three sides and the whole lake to look across.' },
    story: "A sixty-acre knob of land poking into the north shore of Lake Mendota, joined to the mainland by a causeway since the 1860s, so it's an island in name only. It belongs to the grounds of the Mendota Mental Health Institute. A loop of about a mile circles it through oak woods and along rocky bluffs, looking across the lake to the Maple Bluff mansions and the UW campus.",
    nudge: "Drive to the end of Troy Drive, follow Governor's Island Parkway and leave the car in the gravel lot. Walk the loop and stop at the bluffs, where people fish the deep water below, and at the shallow beach about halfway around. In spring bring binoculars for the migrants.",
  }),
  // sources: https://www.northsidenews.org/?p=2470, https://www.travelwisconsin.com/article/museums-history/effigy-mounds-of-southern-wisconsin, https://bigfootsplace.blogspot.com/2014/06/mounds-at-mental-hospital.html
  place({
    id: 'mendota-mounds', name: 'Mendota Hospital Mound Group', what: 'A 624-foot bird effigy on hospital grounds',
    category: 'oddity', hood: 'North Side', lat: 43.13, lng: -89.401, price: 0, setting: 'out', minutes: [30, 60], kids: 1,
    moods: 'learn! odd! think nature', hours: 'mo-fr 07:00-16:30', needs: ['daylight'], gem: 0.7,
    why: { learn: 'A thousand-year-old bird mound with a 624-foot wingspan, plus bears, a deer and a water spirit.', odd: 'A remarkable set of effigy mounds, on the lawn of a working psychiatric hospital.' },
    story: "The grounds of the Mendota Mental Health Institute hold a remarkable group of effigy mounds: a bird with a wingspan of 624 feet, bears, a four-legged deer, a curve-tailed water spirit on the slope along Cinder Lane, and conical and linear mounds. It's a working hospital, so visitors sign in first and are given a map.",
    nudge: "Go to the administration building, the first one on your right as you come in off Troy Drive, register, and ask for the mound map. Walk around the mounds, never on them; they are sacred to the Ho-Chunk. Pair it with the loop on Governor's Island at the bottom of the grounds.",
  }),
  // sources: https://www.visitmadison.com/blog/stories/post/gameday-guide-madison-mallards/, https://www.oursportscentral.com/services/releases/mallards-announce-2026-schedule/n-6307373, https://en.wikipedia.org/wiki/Madison_Mallards
  place({
    id: 'madison-mallards', name: 'Madison Mallards', what: 'Summer college baseball at the Duck Pond in Warner Park',
    category: 'show', hood: 'North Side', lat: 43.1302, lng: -89.3663, price: 1, setting: 'out', minutes: [90, 180], kids: 2,
    moods: 'lively! kids! eat drink showoff', hours: [{ season: '05-25..08-08', hours: 'daily 18:00-21:30' }], needs: ['warm'], best: ['sunset'], url: 'https://northwoodsleague.com/madison-mallards/', gem: 0.8,
    why: { lively: 'Thousands of people in the stands on a summer night, for college kids with wooden bats.', kids: 'A six-foot duck mascot, a kid zone with a bounce house, and a hot dog for every foul ball caught.' },
    story: "The Northwoods League team that has played at Warner Park since 2001, college players spending the summer swinging wooden bats in front of crowds that routinely lead the nation for summer collegiate ball. The park is the Duck Pond. Maynard the six-foot mallard runs the field before the game, the announcer yells \"Wiener!\" on foul balls, and the Duck Blind in right field is all-you-can-eat-and-drink.",
    nudge: "Check the schedule first: the season runs late May to early August, most home games start around 6:05, and there are road trips in between. Gates open an hour early. Bring a blanket for the grass Backyard in center field, get cheese curds, and if you catch a foul ball, trade it at the stand for a hot dog.",
  }),
  // sources: https://northsidefarmersmarket.org/, https://madisonmom.com/greater-madison-area-farmers-markets/
  place({
    id: 'northside-farmers-market', name: "Northside Farmers' Market", what: 'A Sunday morning producers\' market across from Warner Park',
    category: 'market', hood: 'North Side', lat: 43.1289, lng: -89.36, price: 1, setting: 'out', minutes: [20, 45], kids: 1,
    moods: 'eat! kids', hours: [{ season: '05-03..10-25', hours: 'su 08:30-12:30' }], trust: 'solid', checked: '2026-11-18', best: ['morning'], url: 'https://northsidefarmersmarket.org/', gem: 0.55,
    why: { eat: 'A small Sunday market where the people selling the vegetables are the ones who grew them.' },
    story: "A producers' market in the parking lot of the Northside TownCenter, at Northport and Sherman. It started in 2005, after the north side was declared a food desert, as the produce section of a co-op that never got built; the market is all that's left of it. It's a neighborhood market, not a tourist one, and Quest cards are welcome.",
    nudge: "Come on a Sunday between May and late October, early for the best of the produce. Parking is free and right there. Pick up whatever is in season rather than coming with a list.",
  }),
  // sources: https://web.cvent.com/event/0ed1653f-21a4-4acb-8768-00c99e643b34, https://en.wikipedia.org/wiki/Wisconsin_Governor%27s_Mansion, https://doa.wi.gov/Pages/AboutDOA/Governors-Executive-Residence.aspx
  place({
    id: 'executive-residence', name: 'Wisconsin Executive Residence', what: "Free summer tours of the governor's lakeside house",
    category: 'museum', hood: 'Maple Bluff', lat: 43.1088, lng: -89.3696, price: 0, setting: 'in', minutes: [45, 60], kids: 1,
    moods: 'learn! showoff', hours: [{ season: '05-28..08-27', hours: 'th 10:00-12:00' }], trust: 'solid', checked: '2026-11-18', url: 'https://doa.wi.gov/Pages/AboutDOA/Governors-Executive-Residence.aspx', gem: 0.6,
    why: { learn: 'A free look inside the house where Wisconsin governors live, room by room.', showoff: "A tour most locals have never taken, of a 34-room house on Lake Mendota's eastern shore." },
    story: "The governor's house in Maple Bluff, built in the 1920s for industrialist Carl A. Johnson in a southern Classical Revival style and bought by the state in 1949. It has 34 rooms on 3.7 acres of Lake Mendota shoreline. The wrought-iron fence along the street once stood around the old State Capitol.",
    nudge: "Tours run Thursday mornings in summer, free, in groups of up to twenty. You must register online at least 72 hours ahead or you'll be turned away, and adults need a photo ID. Photos are allowed, so bring a phone. Park on Cambridge Road or Lakewood Boulevard.",
  }),

  // ---------------- far east side & Sun Prairie (2026-11-18)
  // sources: https://madisonpubliclibrary.org/locations/reindahl, https://www.cityofmadison.com/news/2026-07-21/opening-date-set-for-imagination-center-at-reindahl-park, https://isthmus.com/arts/arts-beat/at-last-the-imagination-center-is-opening/
  place({
    id: 'imagination-center-reindahl', name: 'Imagination Center at Reindahl Park', what: "Madison's newest library, built into a park",
    category: 'library', hood: 'Far East Side', lat: 43.124, lng: -89.3169, price: 0, setting: 'both', minutes: [30, 90], kids: 2,
    moods: 'kids! learn! think cozy', hours: 'mo-fr 10:00-20:00; sa 09:00-17:00', trust: 'solid', checked: '2026-11-18', url: 'https://madisonpubliclibrary.org/locations/reindahl', gem: 0.65,
    why: { kids: 'A brand-new library with a story walk outside and a park full of fields and a splash pad.', learn: "Madison's first new branch library in more than 25 years, opened in September 2026.", think: 'A quiet reading room behind two-story windows that look out on the park.' },
    story: "Madison's tenth library, opened in September 2026 after more than a decade of east-side asking. It is a library and a year-round park pavilion in one building, designed around the theme of a walk in the park: two-story windows onto Reindahl Park, natural wood, cloud-shaped sound baffles overhead, and a solar tree on the back patio that throws shade and charges phones.",
    nudge: "Come on a weekday afternoon or a Saturday morning; it's closed Sundays. Let the kids pick books, then follow the story walk outside and turn them loose in the park. Grown-ups who want quiet should head for the reading room.",
  }),
  // sources: https://www.cityofmadison.com/parks/find-a-park/hiestand, https://www.cityofmadison.com/parks/find-a-park/hiestand/history
  place({
    id: 'hiestand-park', name: 'Hiestand Park', what: 'Disc golf and a famous sledding hill on the far east side',
    category: 'park', hood: 'Far East Side', lat: 43.0987, lng: -89.3101, price: 0, setting: 'out', minutes: [30, 90], kids: 2,
    moods: 'move! kids odd nature', hours: 'daily 04:00-22:00', trust: 'solid', checked: '2026-11-18', url: 'https://www.cityofmadison.com/parks/find-a-park/hiestand', gem: 0.6, best: ['snow'],
    why: { move: 'A disc golf course from spring through fall, and a sledding hill sledders talk about all winter.', kids: 'A sledding hill with a real local reputation, plus a playground for the rest of the year.', odd: 'The hill held an Air Force communications annex, so locals still call it Radar Hill.' },
    story: "Forty-odd acres on Milwaukee Street, named for a farm family whose Jacob Hiestand was the first to grow tobacco as a cash crop in Wisconsin. The big hill was a Truax communications annex used by the Air Force until the city bought the surplus site in 1972, which is why people call it Radar Hill. Now it's a disc golf course in the warm months and one of Madison's best-known sledding hills in the cold ones, with Hiestand Woods next door.",
    nudge: "In winter, wait for real snow cover and bring a sled; nobody monitors the hill, so look before you send the kids. Spring through fall, bring discs and buy the city's disc golf permit if you're 16 or older ($7 a day in 2026). There's only a portable toilet, by the course.",
  }),
  // sources: https://viettownmadison.com, https://isthmus.com/food-drink/reviews/viet-town-east-towne-thrives-on-classic-flavor-pairings/
  place({
    id: 'viet-town', name: 'Viet Town', what: 'Vietnamese, with banh mi bread baked in house',
    category: 'food', hood: 'Far East Side', lat: 43.1291, lng: -89.3038, price: 2, setting: 'in', minutes: [35, 60], kids: 1,
    moods: 'eat! cozy', hours: 'tu-su 11:00-19:30', trust: 'solid', checked: '2026-11-18', url: 'https://viettownmadison.com', gem: 0.65,
    why: { eat: 'Banh mi on bread baked in house every day, with house-made mayo and pate.', cozy: 'A calm, good-looking room in a strip mall, with light jazz instead of a TV.' },
    story: "A locally owned Vietnamese restaurant in a strip mall on Zeier Road, a few minutes from East Towne, and the best Vietnamese the east side has had in a long time by Isthmus's reckoning. The bread for the banh mi is baked in house daily. The room is calm and good-looking enough for an occasion, but nobody minds if you just pop in.",
    nudge: "Get the grilled pork banh mi and an order of the crispy egg rolls, or the shaking beef over rice if you're hungry. An iced egg coffee to finish. Closed Mondays, and done by 7:30, so go early. Vegetarians will find slim pickings.",
  }),
  // sources: https://danecountyparks.com/park/TokenCreek, https://www.danecountyparks.com/Event/Detail/2847, https://www.danecountyparks.com/documents/pdfs/Dane-County-Parks-brochure-inside-panels-small.pdf
  place({
    id: 'token-creek-park', name: 'Token Creek County Park', what: 'Prairie, woods, a marsh boardwalk and 27 holes of disc golf',
    category: 'park', hood: 'Token Creek', lat: 43.1794, lng: -89.3153, price: 0, setting: 'out', minutes: [40, 120], kids: 2,
    moods: 'nature! move! kids', hours: 'daily 05:00-22:00', url: 'https://danecountyparks.com/park/TokenCreek', gem: 0.6,
    why: { nature: 'Four hundred acres of prairie, woods and wetland, with a boardwalk across a sedge meadow marsh.', move: 'Miles of hiking and ski trails, and a 27-hole disc golf course, at the north edge of town.', kids: 'Two playgrounds, a fishing pier and a boardwalk over the marsh, with room to run in between.' },
    story: "A 418-acre county park off Highway 51, just north of Madison, made of prairie, woodland and wetland. It holds a lot: hiking and cross-country ski trails, a boardwalk through a sedge meadow marsh, an accessible fishing pier and a canoe launch, the 27-hole Vallarta-Ast disc golf course, a 33-acre dog park, and a campground. A historical marker recalls the Ho-Chunk effigy mounds that were once here and the Token Creek Tavern, which burned in 1881.",
    nudge: "Walk the boardwalk through the marsh first, then pick a trail through the prairie. Bringing a dog or discs means buying a county permit before you go. In winter, the trails are open to cross-country skiers and snowshoers.",
  }),
  // sources: https://cityofsunprairie.com/1334/Museum-Exhibits, https://theclio.com/entry/178757
  place({
    id: 'sun-prairie-historical-museum', name: 'Sun Prairie Historical Library & Museum', what: "A free town museum with a room for Georgia O'Keeffe",
    category: 'museum', hood: 'Sun Prairie', lat: 43.183, lng: -89.2131, price: 0, setting: 'in', minutes: [20, 50], kids: 1,
    moods: 'learn! think odd', hours: 'tu 10:00-14:00; we,th 14:00-18:00; sa 10:00-14:00', trust: 'solid', checked: '2026-11-18', url: 'https://cityofsunprairie.com/1334/Museum-Exhibits', gem: 0.55,
    why: { learn: "Georgia O'Keeffe was born on a farm outside town, and this museum keeps a room for her.", odd: "Its 'O'Keeffe original' turns out to be by her sister Ida, who painted too." },
    story: "A small, free museum in the 1924 building that was Sun Prairie's first standalone public library. Its best room belongs to Georgia O'Keeffe, born in 1887 on a farm about three miles southeast of downtown, where she spent her first fourteen years: her birth announcement from the Sun Prairie Countryman, photos, prints, a reading nook, and a painting by her sister Ida. Elsewhere are Ho-Chunk stone points studied by UW students in 2025.",
    nudge: "Check the hours before you drive out; it's open only four short stretches a week, and closed for holidays. Start in the O'Keeffe room and know that it's the first stop on a self-guided driving tour of her childhood places. The front door has stairs; a lift is on the west side.",
  }),
  // sources: https://www.mezemediterranean.com/, https://spinach.guide/venues/meze-171425/, https://www.travelwisconsin.com/food-drink/restaurants/meze-mediterranean-grill-sun-prairie
  place({
    id: 'meze-sun-prairie', name: 'Meze Mediterranean Grill', what: 'A family-run Mediterranean grill on Main Street',
    category: 'food', hood: 'Sun Prairie', lat: 43.1829, lng: -89.2203, price: 2, setting: 'in', minutes: [30, 60], kids: 1,
    moods: 'eat! cozy', hours: 'mo 15:00-20:00; tu-th 11:00-20:00; fr,sa 11:00-21:00', url: 'https://www.mezemediterranean.com/', gem: 0.55,
    why: { eat: 'Lentil soup and stuffed grape leaves, the pairing regulars keep recommending.' },
    story: "A family-owned grill on West Main Street in Sun Prairie, cooking from across the Mediterranean: Greek, Turkish, a little Italian. It's casual and unhurried, and the vegan and gluten-free dishes are clearly marked, which makes it an easy table for a mixed group.",
    nudge: "Start with the lentil soup and the stuffed grape leaves, then get the falafel platter, and ask for extra heat if you like it spicy. Closed Sundays, and Mondays it opens at three. Call ahead to confirm, since listed hours vary.",
  }),
  // sources: https://en.wikipedia.org/wiki/Angell_Park_Speedway, https://app.myracepass.com/series/1201/info, https://www.imca.com/?p=52843, https://www.floracing.com/articles/16153541-weekend-preview-usac-national-midget-series-labor-day-double-is-up-next
  place({
    id: 'angell-park-speedway', name: 'Angell Park Speedway', what: 'Sunday-night midget car racing on a clay oval',
    category: 'show', hood: 'Sun Prairie', lat: 43.1778, lng: -89.2113, price: 1, setting: 'out', minutes: [90, 180], kids: 1,
    moods: 'lively! odd! showoff', hours: [{ season: '05-15..09-07', hours: 'su 16:00-22:00' }], url: 'https://app.myracepass.com/series/1201/info', gem: 0.7, best: ['night'],
    why: { lively: 'Small, loud open-wheel cars sliding around a clay oval under the lights on a summer Sunday.', odd: 'A racetrack on land given to the town volunteer fire department in 1903, which still owns it.' },
    story: "A one-third-mile clay oval on land Col. William Angell gave the Sun Prairie Volunteer Fire Department in 1903, and the department still owns it. Badger midget cars have raced here on Sunday nights since 1946, under lights since 1948; Jeff Gordon and Tony Stewart came through the same series. The season peaks with the Firemen's Nationals on Labor Day weekend.",
    nudge: "Check the schedule first: race nights run Sundays from late spring to Labor Day, but not every Sunday. The grandstand usually opens around four, with hot laps around five. Bring ear protection for small kids, and sit high enough to see the whole oval.",
  }),
  // sources: https://isthmus.com/food-drink/mad-faves-Wings-2019, https://www.travelwisconsin.com/food-drink/restaurants/chicken-licks-sun-prairie, https://www.madtownlife.com/dive-bars-and-tiny-taverns/chicken-licks/, https://www.iheart.com/content/2024-03-14-wisconsin-restaurant-has-the-best-chicken-wings-in-the-state, https://roadtrippers.com/us/sun-prairie-wi/food-drink/chicken-lips
  place({
    id: 'chicken-licks', name: 'Chicken Licks', what: 'A country tavern on Highway N that lives on its wings',
    category: 'food', hood: 'Sun Prairie', lat: 43.1495, lng: -89.2066, price: 2, setting: 'in', minutes: [40, 75], kids: 1,
    moods: 'eat! lively drink', hours: 'daily 11:00-24:00', gem: 0.8,
    why: { eat: 'The wings Madison readers voted best in town, devilishly hot and still tasting of something.' },
    story: "A plain wing tavern on County Highway N outside Sun Prairie, called Chicken Lips until 2019. Isthmus readers have voted its wings the best around, and a national roundup called them the best in Wisconsin. Inside there is a jukebox and a pool table; outside, a patio where dogs are welcome.",
    nudge: "Order the original wings, which are plenty hot, or the dry rub if you want crunch over sauce; buffalo and nude are there for anyone timid. Ask for extra-sexy, off the menu, only if you mean it. Add curds or waffle fries, and expect a wait when it's busy.",
  }),
];
