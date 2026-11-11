// The Madison list. Hand-written, on purpose. A place earns a spot by being
// distinct, not by existing. To add one: copy an entry, write the story and the
// nudge in the house voice (specific, opinionated, practical, never
// promotional), and be honest about `trust`.
//
// `trust: 'solid'` means the hours come from a rule we can stand behind (city
// parks are open 4 am–10 pm by ordinance) or were checked by hand — set
// `checked` to the date. Everything else is shown to people as "usually open".

import type { Mood, Option, Rule } from '../../core/types';

type Draft = Omit<Option, 'kind' | 'dropIn' | 'hoursTrust' | 'rules' | 'moods' | 'hood'> & {
  hood: string;
  /** "think! nature date" — `!` marks what the place is *for*. */
  moods: string;
  hours: string | Rule[];
  trust?: 'solid';
  kind?: 'event';
};

const PARK = 'daily 04:00-22:00';
const ALWAYS = 'daily 00:00-24:00';

function place(d: Draft): Option {
  const { moods, hours, trust, kind, ...rest } = d;
  const parsed: Partial<Record<Mood, number>> = {};
  for (const word of moods.split(/\s+/)) parsed[word.replace('!', '') as Mood] = word.endsWith('!') ? 1 : 0.6;
  return {
    ...rest,
    kind: kind ?? 'place',
    dropIn: true,
    moods: parsed,
    rules: typeof hours === 'string' ? [{ hours }] : hours,
    hoursTrust: trust ?? 'unverified',
  };
}

export const PLACES: Option[] = [
  // ------------------------------------------------------------- outdoors
  place({
    id: 'picnic-point', name: 'Picnic Point', what: 'A mile-long finger of woods out into Lake Mendota',
    category: 'trail', hood: 'UW Lakeshore', lat: 43.0843, lng: -89.429, price: 0, setting: 'out', minutes: [40, 80], kids: 1,
    moods: 'think! nature! move date showoff', hours: PARK, trust: 'solid', needs: ['daylight'], best: ['sunset'], gem: 0.95,
    story: "A narrow peninsula that walks you nearly a mile out into Lake Mendota, with the Capitol and campus stacked up across the water. People have been coming out here to think for thousands of years; the burial mounds along the path say so.",
    nudge: "Walk all the way to the tip. Don't stop at the first fire circle. Sit on the stone bench at the end and look back at the city. Give it ten minutes before you reach for your phone.",
  }),
  place({
    id: 'union-terrace', name: 'Memorial Union Terrace', what: 'Sunburst chairs on the edge of Lake Mendota',
    category: 'view', hood: 'Campus', lat: 43.0766, lng: -89.3998, price: 1, setting: 'out', minutes: [30, 90], kids: 1,
    moods: 'showoff! lively! date drink', hours: [{ season: '04-15..10-20', hours: 'daily 08:00-23:00' }], needs: ['mild'], best: ['sunset'], gem: 0.95,
    story: "Several hundred sunburst chairs facing Lake Mendota, a brat stand, and pitchers of beer on what is technically a university's back porch. It's the closest thing Madison has to a town square, and it's the right answer more often than locals like to admit.",
    nudge: "Get a pitcher or a scoop of Babcock ice cream inside first, then claim chairs near the water. Yellow, orange or green: pick one and defend it. Stay until the lake goes pink.",
  }),
  place({
    id: 'arboretum', name: 'UW Arboretum', what: 'Twelve hundred acres of restored prairie and woods',
    category: 'garden', hood: 'Near West', lat: 43.0413, lng: -89.429, price: 0, setting: 'out', minutes: [45, 100], kids: 1,
    moods: 'nature! think! move date', hours: 'daily 07:00-22:00', needs: ['daylight'], gem: 0.9,
    moments: [
      { season: '05-08..05-22', line: "The lilacs at Longenecker are peaking about now. You'll smell them from the parking lot." },
      { season: '10-05..10-25', line: 'Fall color in the Arboretum lasts about two weeks. This is one of them.' },
    ],
    story: "The place where ecological restoration was more or less invented: Aldo Leopold and company started replanting Curtis Prairie here in the 1930s, and it's now the oldest restored prairie anywhere. Twelve hundred acres of quiet, a few minutes from downtown.",
    nudge: "Park at the Visitor Center and walk out through Longenecker Gardens into Curtis Prairie. Once you're in the prairie, stop and turn a slow circle. No buildings in any direction.",
  }),
  place({
    id: 'olbrich-gardens', name: 'Olbrich Botanical Gardens', what: 'Sixteen acres of free gardens and a gilded Thai pavilion',
    category: 'garden', hood: 'East Side', lat: 43.0926, lng: -89.3353, price: 0, setting: 'out', minutes: [40, 80], kids: 1,
    moods: 'date! nature think showoff',
    hours: [{ season: '04-01..09-30', hours: 'daily 09:00-20:00' }, { hours: 'daily 09:00-16:00' }], needs: ['daylight'], gem: 0.85,
    story: "Sixteen acres of gardens near the east shore of Lake Monona, free, and far better than free things usually are. At the back is a gilded Thai pavilion, a gift from Thailand, put together without nails.",
    nudge: "Go straight to the back, cross the bridge over Starkweather Creek, and find the pavilion. Then wander back through the rose garden slowly. The tower is worth the stairs.",
  }),
  place({
    id: 'tenney-lock', name: 'Tenney Park Lock & Dam', what: 'Where the lake steps down into the river',
    category: 'park', hood: 'Tenney-Lapham', lat: 43.0925, lng: -89.369, price: 0, setting: 'out', minutes: [25, 50], kids: 2,
    moods: 'think nature! odd kids', hours: PARK, trust: 'solid', best: ['sunset'], gem: 0.8,
    story: "The lock lowers boats a few feet from Lake Mendota into the Yahara River, and you can stand right over it and watch. Most people walk past the lock and dam without stopping. Don't.",
    nudge: "Walk out on the breakwater until the city noise drops off. In summer, wait for a boat to lock through; it takes ten minutes and is oddly satisfying. Bring nothing. Watch the water.",
  }),
  place({
    id: 'olin-park', name: 'Olin Park', what: 'The skyline view, from across the bay',
    category: 'view', hood: 'South Side', lat: 43.053, lng: -89.378, price: 0, setting: 'out', minutes: [20, 45], kids: 1,
    moods: 'showoff think date nature', hours: PARK, trust: 'solid', best: ['sunset'], gem: 0.7,
    story: "The postcard view of Madison, the Capitol dome rising over Lake Monona, is taken from here. Frank Lloyd Wright's Monona Terrace sits at the waterline exactly as he drew it.",
    nudge: "Skip the parking-lot view. Walk the shoreline path toward Turville Point until the trees open up. Go in the last hour of light, when the dome turns gold.",
  }),
  place({
    id: 'monona-terrace', name: 'Monona Terrace Rooftop', what: "Frank Lloyd Wright's roof garden over the lake",
    category: 'view', hood: 'Downtown', lat: 43.0717, lng: -89.3802, price: 0, setting: 'out', minutes: [20, 40], kids: 1,
    moods: 'showoff! think date', hours: 'daily 08:00-22:00', best: ['sunrise'], gem: 0.7,
    story: "Wright designed this in 1938 and Madison argued about it for nearly sixty years before building it. The rooftop is a public park hanging over Lake Monona, and hardly anyone uses it.",
    nudge: "Walk down from the Capitol on Martin Luther King Jr. Boulevard so the lake opens up in front of you. Go to the railing at the far edge. Stay long enough to see a train go by underneath.",
  }),
  place({
    id: 'allen-garden', name: 'Allen Centennial Garden', what: 'A walled garden hidden in the middle of campus',
    category: 'garden', hood: 'Campus', lat: 43.0769, lng: -89.413, price: 0, setting: 'out', minutes: [20, 40], kids: 1,
    moods: 'think! date nature odd', hours: [{ season: '04-15..10-31', hours: 'daily 07:00-20:00' }], needs: ['daylight'], gem: 0.7,
    story: "Two and a half acres of gardens wrapped around a Victorian house, tucked between agriculture buildings where you'd never look for it. Students use it as an outdoor classroom. Everyone else walks past.",
    nudge: "Find the pond and the bench beside it. Sit. It's a small garden, so the point is not to cover ground. Read the plant labels the way you'd read spines in a bookstore.",
  }),
  place({
    id: 'bb-clarke', name: 'B.B. Clarke Beach', what: 'A pocket beach at the end of a neighborhood street',
    category: 'water', hood: 'Willy Street', lat: 43.0778, lng: -89.3684, price: 0, setting: 'out', minutes: [30, 75], kids: 2,
    moods: 'nature kids move think', hours: [{ season: '06-01..09-07', hours: PARK }], trust: 'solid', needs: ['warm', 'daylight'], best: ['hot'],
    story: "A small beach at the end of a residential street, with a swimming raft and a view straight across Lake Monona. It belongs to the neighborhood, and they'll share.",
    nudge: "Check the county's beach conditions before you go; blue-green algae closes it some days. Swim out to the raft. Walk up to Willy Street afterward with wet hair.",
  }),
  place({
    id: 'brittingham-boats', name: 'Brittingham Boats', what: 'Kayaks and paddleboards on Monona Bay',
    category: 'water', hood: 'Bassett', lat: 43.064, lng: -89.393, price: 2, setting: 'out', minutes: [60, 100], kids: 1,
    moods: 'move! nature date', hours: [{ season: '05-23..09-07', hours: 'daily 10:00-19:00' }], needs: ['warm', 'daylight'], best: ['hot'],
    story: "A boathouse on Monona Bay where you can be on the water ten minutes after thinking about it. The bay is sheltered and shallow, which makes it forgiving for a first try at a paddleboard.",
    nudge: "Rent a kayak, cross the bay, and go under the railroad trestle into Lake Monona proper for the skyline. Turn around when the wind picks up.",
  }),
  place({
    id: 'wingra-boats', name: 'Wingra Boats', what: 'Canoes on the quiet lake with no motors',
    category: 'water', hood: 'Dudgeon-Monroe', lat: 43.056, lng: -89.419, price: 2, setting: 'out', minutes: [60, 100], kids: 2,
    moods: 'move nature! kids date think', hours: [{ season: '05-15..09-20', hours: 'daily 10:00-19:00' }], needs: ['warm', 'daylight'],
    story: "Lake Wingra is the small, shallow lake with no motorboats and an arboretum for a shoreline. From a canoe in the middle of it, the city more or less disappears.",
    nudge: "Rent a canoe, not a pedal boat. Paddle toward the south shore, where springs feed in and the water turns clear. Look down.",
  }),
  place({
    id: 'owen-park', name: 'Owen Conservation Park', what: 'Prairie and oak savanna on a west-side hilltop',
    category: 'trail', hood: 'West Side', lat: 43.0745, lng: -89.487, price: 0, setting: 'out', minutes: [35, 70], kids: 1,
    moods: 'think! nature! move', hours: PARK, trust: 'solid', needs: ['daylight'], gem: 0.7,
    story: "A former summer estate turned back into prairie and oak savanna, on a hill with the city falling away below it. It's ten minutes from the mall, and most evenings the deer outnumber the people.",
    nudge: "Take the loop through the prairie first, then the woods. Leave the dog at home; it's a conservation park and they mean it. Go near dusk and walk quietly.",
  }),
  place({
    id: 'cherokee-marsh', name: 'Cherokee Marsh', what: 'Boardwalks through the biggest wetland in the county',
    category: 'trail', hood: 'North Side', lat: 43.161, lng: -89.364, price: 0, setting: 'out', minutes: [45, 90], kids: 1,
    moods: 'nature! think move odd', hours: PARK, trust: 'solid', needs: ['daylight'], best: ['morning'],
    story: "The top of Madison's chain of lakes: a huge marsh on the Yahara with boardwalks, observation decks, and sandhill cranes that sound like dinosaurs. It feels much farther from town than it is.",
    nudge: "Drive to the very end of North Sherman Avenue. Take the boardwalk to the observation deck and wait there, quietly, for ten minutes. Something will show up.",
  }),
  place({
    id: 'pheasant-branch', name: 'Pheasant Branch Conservancy', what: 'Springs that boil up through the sand',
    category: 'trail', hood: 'Middleton', lat: 43.119, lng: -89.485, price: 0, setting: 'out', minutes: [45, 90], kids: 1,
    moods: 'nature! move think odd', hours: 'daily 05:00-22:00', needs: ['daylight'],
    story: "A creek corridor in Middleton that leads to a set of springs where clear water pushes up through the sand hard enough to look like it's boiling. It runs all year and never freezes.",
    nudge: "Walk to the springs overlook first and watch the sand move. Then climb the hill behind it for the long view back toward the Capitol.",
  }),
  place({
    id: 'jmp', name: 'James Madison Park', what: 'A long lawn that slopes into Lake Mendota',
    category: 'park', hood: 'Mansion Hill', lat: 43.0815, lng: -89.383, price: 0, setting: 'out', minutes: [25, 60], kids: 2,
    moods: 'think nature lively kids', hours: PARK, trust: 'solid', best: ['sunset'], gem: 0.65,
    story: "Downtown's backyard: a lawn running down to Lake Mendota, with volleyball, slackliners, and a tiny sandstone synagogue from 1863 sitting in one corner. On a warm evening half the isthmus is here.",
    nudge: "Bring a blanket, not a chair. Sit near the water, away from the volleyball. Walk over and read the plaque on Gates of Heaven before you leave.",
  }),
  place({
    id: 'observatory-hill', name: 'Observatory Hill', what: 'A hilltop over the lake, with effigy mounds',
    category: 'view', hood: 'Campus', lat: 43.0763, lng: -89.409, price: 0, setting: 'out', minutes: [20, 40], kids: 1,
    moods: 'think! date nature showoff', hours: ALWAYS, trust: 'solid', needs: ['daylight'], best: ['sunset'],
    story: "The high point of campus, with an 1870s observatory, a long view over Lake Mendota, and two effigy mounds, a bird and a two-tailed water spirit, that were here a thousand years before the university.",
    nudge: "Sit on the grass slope facing the lake, just below the observatory. Find the mounds afterward; they're marked. Winter sunsets up here are short and worth it.",
  }),
  place({
    id: 'hoyt-park', name: 'Hoyt Park', what: 'Stone fireplaces in the woods',
    category: 'park', hood: 'Near West', lat: 43.07, lng: -89.447, price: 0, setting: 'out', minutes: [30, 70], kids: 2,
    moods: 'nature kids think move odd', hours: PARK, trust: 'solid', needs: ['daylight'],
    story: "A wooded hilltop where Depression-era crews built fireplaces, shelters, and stairways out of sandstone quarried on the spot. A good share of the city has never been.",
    nudge: "Bring firewood and something to cook; the stone fireplaces are first come, first served. Otherwise find the overlook and follow the old quarry trail down.",
  }),
  place({
    id: 'elver-sledding', name: 'Elver Park Sledding Hill', what: 'The biggest sledding hill in town',
    category: 'play', hood: 'Far West', lat: 43.038, lng: -89.51, price: 0, setting: 'out', minutes: [40, 90], kids: 2,
    moods: 'kids! move! lively', hours: [{ season: '12-01..03-15', hours: PARK }], trust: 'solid', needs: ['snow'], best: ['snow'],
    story: "The tallest, longest sledding hill in Madison, lit after dark. After a good snow it's the happiest hundred yards in the county.",
    nudge: "Bring a real sled; cardboard doesn't survive the second run. Start from halfway up to find your nerve, then take the top. A thermos of hot chocolate is not optional.",
  }),
  place({
    id: 'lakeshore-path', name: 'Lakeshore Path', what: 'A gravel path with the lake at your feet',
    category: 'trail', hood: 'Campus', lat: 43.0772, lng: -89.404, price: 0, setting: 'out', minutes: [30, 70], kids: 1,
    moods: 'move! think nature date', hours: ALWAYS, trust: 'solid', needs: ['daylight'],
    story: "A tree-lined path that hugs Lake Mendota from the Memorial Union out to Picnic Point, with the water a few feet from your shoes the whole way. Students commute on it. Everyone else forgets it's there.",
    nudge: "Start behind the Union and head west. Walk until you've stopped composing emails in your head, then turn around. No headphones.",
  }),
  place({
    id: 'monona-loop', name: 'Lake Monona Loop', what: 'A thirteen-mile bike ride around a lake',
    category: 'trail', hood: 'Downtown', lat: 43.0712, lng: -89.3795, price: 0, setting: 'out', minutes: [70, 100], kids: 1,
    moods: 'move! nature showoff', hours: ALWAYS, trust: 'solid', needs: ['daylight', 'mild'],
    story: "A signed bike route all the way around Lake Monona, about thirteen miles, mostly on paths and quiet streets. You get the skyline from every angle and one honest hill.",
    nudge: "Go counter-clockwise from Monona Terrace so the lake stays on your side of the road. No bike? Take a BCycle from a dock. Stop at Olbrich Park for the view back.",
  }),
  place({
    id: 'period-garden', name: 'Period Garden Park', what: 'A Victorian garden the size of a living room',
    category: 'oddity', hood: 'Mansion Hill', lat: 43.0788, lng: -89.3855, price: 0, setting: 'out', minutes: [10, 20], kids: 1,
    moods: 'odd! think date', hours: [{ season: '05-01..10-15', hours: PARK }], trust: 'solid', needs: ['daylight'],
    story: "A tiny formal garden on a street corner in Mansion Hill, planted and kept up by neighbors in the style of the 1870s houses around it. You could miss it from the sidewalk. Most people do.",
    nudge: "Go through the iron gate and sit on the bench for five minutes. Then walk a block in each direction and look at the sandstone mansions it was made to match.",
  }),
  place({
    id: 'forest-hill', name: 'Forest Hill Cemetery', what: 'A hilly old cemetery with older mounds',
    category: 'oddity', hood: 'Near West', lat: 43.066, lng: -89.432, price: 0, setting: 'out', minutes: [30, 60], kids: 1,
    moods: 'think! odd learn nature', hours: 'daily 07:00-19:00', needs: ['daylight'],
    story: "Madison's nineteenth-century cemetery: governors, rows of Union soldiers, a plot of Confederate prisoners who died at Camp Randall, and a group of effigy mounds older than all of them. Quiet in the way only cemeteries are.",
    nudge: "Walk uphill from the gate toward the oldest stones. Read the names and do the arithmetic on the dates. Find the mounds; one is a goose that lost its head to the railroad.",
  }),

  // ------------------------------------------------------------- indoors, for the mind
  place({
    id: 'bolz', name: 'Bolz Conservatory', what: 'A glass pyramid full of tropics',
    category: 'garden', hood: 'East Side', lat: 43.0928, lng: -89.3349, price: 1, setting: 'in', minutes: [30, 50], kids: 2,
    moods: 'cozy! kids date nature odd', hours: 'daily 10:00-16:00', gem: 0.8,
    story: "A fifty-foot glass pyramid of palms, orchids, a waterfall, and free-flying birds. It's warm and humid in there in January, which in Wisconsin counts as medicine.",
    nudge: "Pay the few dollars. Walk the loop once fast, then once slowly, looking up for the birds and down for the quail. Take your coat off before you go in.",
  }),
  place({
    id: 'capitol', name: 'Wisconsin State Capitol', what: 'A granite dome you can just walk into',
    category: 'museum', hood: 'Downtown', lat: 43.0747, lng: -89.3841, price: 0, setting: 'in', minutes: [25, 50], kids: 1,
    moods: 'showoff! learn odd cozy', hours: 'mo-fr 08:00-18:00; sa,su 08:00-16:00', gem: 0.85,
    moments: [{ season: '05-25..09-07', line: 'The observation deck is open for the summer. Keep climbing past the fourth floor.' }],
    story: "A granite dome built a few feet shorter than the one in Washington, on a hill in the middle of an isthmus. There's no ticket and no line. You walk in and it's yours.",
    nudge: "Stand dead center in the rotunda and look straight up. Then hunt for fossils in the stone: there's a starfish in one of the stairs off the north hallway. Ask a guard if you give up.",
  }),
  place({
    id: 'chazen', name: 'Chazen Museum of Art', what: 'A serious art museum that happens to be free',
    category: 'museum', hood: 'Campus', lat: 43.0739, lng: -89.399, price: 0, setting: 'in', minutes: [40, 90], kids: 1,
    moods: 'learn! think cozy date', hours: 'mo-fr 10:00-19:00; sa,su 11:00-17:00', gem: 0.8,
    story: "One of the largest art collections in Wisconsin, free every day, and usually close to empty. Two buildings joined by a bridge, holding everything from ancient coins to contemporary glass.",
    nudge: "Don't try to see it all. Go to the top floor of the newer building, pick three things, and sit with each one. The benches are there to be used.",
  }),
  place({
    id: 'mmoca', name: 'Madison Museum of Contemporary Art', what: 'Free contemporary art in a glass prow on State Street',
    category: 'museum', hood: 'State Street', lat: 43.0747, lng: -89.3885, price: 0, setting: 'in', minutes: [30, 60], kids: 1,
    moods: 'learn date odd cozy', hours: 'th,fr 12:00-20:00; sa,su 12:00-18:00',
    story: "A sharp glass corner on State Street with free contemporary art inside and a sculpture garden on the roof. The glass staircase is worth walking in for by itself.",
    nudge: "Climb the glass stairs to the top and start with the rooftop, then work your way down. If a piece annoys you, stay with that one longest.",
  }),
  place({
    id: 'geology-museum', name: 'UW Geology Museum', what: 'Dinosaurs, meteorites, and rocks that glow',
    category: 'museum', hood: 'Campus', lat: 43.0707, lng: -89.4063, price: 0, setting: 'in', minutes: [30, 50], kids: 2,
    moods: 'kids! learn odd cozy', hours: 'mo-fr 08:30-16:30; sa 09:00-13:00', gem: 0.75,
    story: "A small free museum inside a campus science building, with a mastodon skeleton, a walk-through cave, and a blacklight room of fluorescent minerals. It takes forty minutes and beats most museums that take four hours.",
    nudge: "Go to the blacklight room first and stay until your eyes adjust. Then find the meteorites, which are about as old as anything you will ever stand next to.",
  }),
  place({
    id: 'central-library', name: 'Madison Central Library', what: 'A downtown library built for lingering',
    category: 'library', hood: 'Downtown', lat: 43.0745, lng: -89.388, price: 0, setting: 'in', minutes: [30, 90], kids: 2,
    moods: 'think! cozy learn kids', hours: 'mo-th 09:00-20:00; fr 09:00-18:00; sa 09:00-17:00; su 13:00-17:00',
    story: "Rebuilt in 2013 with a wall of glass, a top-floor reading room, and an art studio called the Bubbler where things get made on site. It's the best free indoor seat downtown.",
    nudge: "Take the stairs to the third floor and find a chair by the windows. Pull one book from a shelf you'd never normally visit. Stay for a chapter.",
  }),
  place({
    id: 'veterans-museum', name: 'Wisconsin Veterans Museum', what: 'A small, serious museum on the Square',
    category: 'museum', hood: 'Downtown', lat: 43.0756, lng: -89.3853, price: 0, setting: 'in', minutes: [30, 60], kids: 1,
    moods: 'learn! think showoff', hours: 'tu-sa 10:00-17:00',
    story: "A free museum that tells war through individual Wisconsinites: their letters, their coats, the things they carried. Life-size scenes, no glorifying.",
    nudge: "Skip the timeline panels if you have to, but read the handwritten letters in the cases. Pick one person and follow them through.",
  }),
  place({
    id: 'room-of-ones-own', name: "A Room of One's Own", what: 'Independent bookstore, since 1975',
    category: 'bookstore', hood: 'Atwood', lat: 43.0937, lng: -89.3379, price: 1, setting: 'in', minutes: [25, 50], kids: 1,
    moods: 'think! learn cozy date', hours: 'daily 10:00-19:00', gem: 0.8,
    story: "A feminist bookstore that opened in 1975 and outlasted nearly every chain that tried to bury it. The staff recommendation cards are handwritten, opinionated, and usually right.",
    nudge: "Ignore the front tables. Find the staff picks and read the cards until one of them argues you into it. Buy that one. Don't look it up first.",
  }),
  place({
    id: 'mystery-to-me', name: 'Mystery to Me', what: 'A neighborhood bookstore on Monroe Street',
    category: 'bookstore', hood: 'Monroe Street', lat: 43.0645, lng: -89.418, price: 1, setting: 'in', minutes: [20, 45], kids: 1,
    moods: 'think learn cozy', hours: 'mo-sa 10:00-18:00; su 11:00-16:00',
    story: "It started as a mystery shop and grew into a full bookstore without giving up the wall of whodunits. Small enough that an owner may well ring you up.",
    nudge: "Tell whoever's at the counter the last book you loved and ask what comes next. Then walk Monroe Street with the bag under your arm.",
  }),
  place({
    id: 'leopolds', name: "Leopold's Books Bar Caffè", what: 'A bookstore, a bar, and a café in one room',
    category: 'bookstore', hood: 'Regent', lat: 43.0679, lng: -89.4078, price: 2, setting: 'in', minutes: [40, 90], kids: 0,
    moods: 'date! think cozy drink learn', hours: 'daily 08:00-23:00', best: ['night'], gem: 0.8,
    story: "Books shelved by country instead of genre, an espresso machine, and a full bar, all in the same room. You can drink an amaro while reading the first chapter of a novel from the place it was made.",
    nudge: "Pick a country you've never been to and pull a book from its shelf. Order a drink to match and read ten pages at the bar before you decide.",
  }),

  // ------------------------------------------------------------- coffee
  place({
    id: 'bradburys', name: "Bradbury's Coffee", what: 'A wedge-shaped café just off the Square',
    category: 'cafe', hood: 'Downtown', lat: 43.0762, lng: -89.3845, price: 1, setting: 'in', minutes: [25, 60], kids: 1,
    moods: 'think! cozy eat date', hours: 'mo-fr 07:00-15:00; sa,su 08:00-15:00', best: ['morning'], gem: 0.85,
    story: "A tiny triangular room with tall windows, serious espresso, and crêpes made to order. It was doing careful coffee before the rest of town caught up.",
    nudge: 'Order the cortado. Sit at the window facing the square. Bring something to read that isn\'t on a screen.',
  }),
  place({
    id: 'michelangelos', name: "Michelangelo's Coffee House", what: 'The State Street café that stays open late',
    category: 'cafe', hood: 'State Street', lat: 43.0748, lng: -89.3866, price: 1, setting: 'in', minutes: [30, 90], kids: 1,
    moods: 'think cozy! date', hours: 'daily 07:00-21:00', best: ['night'],
    story: "Mismatched armchairs, local art on the walls, and a back room where people have been writing dissertations for decades. One of the few places downtown where you can sit past dinner without ordering alcohol.",
    nudge: "Walk past the front tables to the back room. Get tea in a pot, not a cup, and take the armchair nobody's guarding.",
  }),
  place({
    id: 'lakeside-coffee', name: 'Lakeside St. Coffee House', what: 'A café with a porch on Monona Bay',
    category: 'cafe', hood: 'South Side', lat: 43.052, lng: -89.393, price: 1, setting: 'both', minutes: [30, 75], kids: 1,
    moods: 'think! date cozy nature', hours: 'daily 07:00-18:00',
    story: "A neighborhood coffee house in an old storefront, looking across the street at Monona Bay. Unhurried in a way that places closer to campus can't afford to be.",
    nudge: "If it's warm, take your cup to the porch and face the bay. If it's not, take the window. Order something baked.",
  }),
  place({
    id: 'johnson-public-house', name: 'Johnson Public House', what: 'A bright coffee shop on East Johnson',
    category: 'cafe', hood: 'Tenney-Lapham', lat: 43.0832, lng: -89.3745, price: 1, setting: 'in', minutes: [25, 60], kids: 1,
    moods: 'think cozy eat', hours: 'daily 07:00-17:00', best: ['morning'],
    story: "The living room of the near east side: big front windows, rotating roasters, and a breakfast sandwich people cross town for. Loud enough to feel alive, quiet enough to work.",
    nudge: 'Ask what the guest roaster is and get it as a pour-over. Take the window bar and watch East Johnson go by.',
  }),

  // ------------------------------------------------------------- food
  place({
    id: 'old-fashioned', name: 'The Old Fashioned', what: 'Wisconsin tavern food, on the Square',
    category: 'food', hood: 'Downtown', lat: 43.0759, lng: -89.383, price: 2, setting: 'in', minutes: [50, 90], kids: 1,
    moods: 'showoff! eat! drink lively', hours: 'daily 11:00-22:00', gem: 0.85,
    story: "A tavern devoted entirely to Wisconsin: cheese curds from a named dairy, a long wall of Wisconsin beers, and a brandy old fashioned made the way the state insists on. Touristy in theory, correct in practice.",
    nudge: "Order cheese curds and a brandy old fashioned sweet before you even look at the menu. If there's a wait, and there usually is, take the bar.",
  }),
  place({
    id: 'garver', name: 'Garver Feed Mill', what: 'A 1906 sugar factory full of food makers',
    category: 'market', hood: 'East Side', lat: 43.0945, lng: -89.332, price: 2, setting: 'in', minutes: [40, 90], kids: 1,
    moods: 'eat lively showoff date cozy', hours: 'daily 08:00-21:00',
    story: "A brick sugar-beet factory from 1906 that sat in ruins behind Olbrich Gardens for decades. Now it holds a pizza place, a coffee roaster, and a handful of other local makers under very high ceilings.",
    nudge: "Walk the whole building before you order anything. Then get a slice from Ian's and take it to the long tables in the atrium. Look up at the old brick.",
  }),
  place({
    id: 'taqueria-guadalajara', name: 'Taqueria Guadalajara', what: 'A small, loved taqueria on South Park',
    category: 'food', hood: 'South Side', lat: 43.056, lng: -89.396, price: 1, setting: 'in', minutes: [30, 50], kids: 1,
    moods: 'eat! odd', hours: 'daily 10:00-21:00', gem: 0.8,
    story: "A little house on South Park Street turning out the tacos Madison argues are the best in town. A handful of tables, a line at lunch, and no interest in being discovered.",
    nudge: "Order tacos al pastor and a horchata. Ask for both salsas. If there's no table, wait; it turns over fast.",
  }),
  place({
    id: 'tornado', name: 'Tornado Steak House', what: 'An old-school supper club off the Square',
    category: 'food', hood: 'Downtown', lat: 43.0736, lng: -89.3847, price: 3, setting: 'in', minutes: [75, 120], kids: 0,
    moods: 'date! eat! showoff', hours: 'daily 17:00-22:00', gem: 0.8,
    story: "A low-ceilinged, dark-paneled supper club that looks like 1955 on purpose. Relish tray, steaks, a lounge downstairs. The kind of dinner Wisconsin does better than anywhere.",
    nudge: "Book ahead or eat at the bar. Start with an old fashioned, order the steak the way the server tells you to, and do not skip the hash browns.",
  }),
  place({
    id: 'madison-sourdough', name: 'Madison Sourdough', what: 'A bakery café that mills its own flour',
    category: 'food', hood: 'Willy Street', lat: 43.079, lng: -89.37, price: 2, setting: 'in', minutes: [30, 60], kids: 1,
    moods: 'eat! cozy date', hours: 'we-su 08:00-15:00', best: ['morning'],
    story: "A bakery that mills flour from Wisconsin grain and builds a whole breakfast-and-lunch menu on top of the bread. The pastry case empties by early afternoon for a reason.",
    nudge: 'Get there before eleven. Order whatever comes on the country sourdough and take a croissant for later. You will eat it in the car.',
  }),
  place({
    id: 'lazy-janes', name: "Lazy Jane's Café", what: 'Breakfast in a creaky Willy Street house',
    category: 'food', hood: 'Willy Street', lat: 43.0822, lng: -89.363, price: 1, setting: 'in', minutes: [40, 70], kids: 2,
    moods: 'eat! cozy kids', hours: 'daily 07:00-14:00', best: ['morning'],
    story: "Two floors of an old house filled with thrift-store tables and the smell of scones. They shout your name up the stairs when your food is ready.",
    nudge: "Order a scone, whichever kind is still warm, and eat it while you wait for the rest. Take a table upstairs. Listen for your name.",
  }),
  place({
    id: 'montys', name: "Monty's Blue Plate Diner", what: 'A chrome diner in an old gas station',
    category: 'food', hood: 'Atwood', lat: 43.0925, lng: -89.352, price: 2, setting: 'in', minutes: [40, 70], kids: 2,
    moods: 'eat! kids cozy', hours: 'daily 07:00-20:00',
    story: "A blue-and-chrome diner built into a former gas station, serving meatloaf, milkshakes, and a longer vegan menu than any diner needs. Reliable in the way you want a diner to be.",
    nudge: "Sit at the counter if you're alone. Get a milkshake no matter the hour; the extra comes in the steel cup. Pie, if you still can.",
  }),
  place({
    id: 'mint-mark', name: 'Mint Mark', what: 'Small plates in a tiny east-side room',
    category: 'food', hood: 'Atwood', lat: 43.09, lng: -89.356, price: 3, setting: 'in', minutes: [70, 110], kids: 0,
    moods: 'date! eat', hours: 'tu-sa 17:00-22:00',
    story: "A narrow neighborhood restaurant where the menu is short, seasonal, and mostly meant for sharing. The biscuit has a following of its own.",
    nudge: 'Order the biscuit first, for the table, before anything else. Then three or four plates between two people. Sit at the bar and watch the kitchen.',
  }),
  place({
    id: 'babcock', name: 'Babcock Hall Dairy Store', what: 'Ice cream made by the university',
    category: 'treat', hood: 'Campus', lat: 43.0752, lng: -89.413, price: 1, setting: 'in', minutes: [15, 35], kids: 2,
    moods: 'kids! eat showoff odd', hours: 'mo-fr 07:30-17:30; sa 11:00-16:00', best: ['hot'], gem: 0.8,
    story: "The university runs a working dairy plant, and this is its shop counter. The ice cream is made a few yards from where you eat it, by people studying how to make ice cream.",
    nudge: 'Get a scoop of Orange Custard Chocolate Chip; you won\'t find it elsewhere. Then go look for the window onto the plant floor.',
  }),
  place({
    id: 'fromagination', name: 'Fromagination', what: 'A cheese shop on the Square',
    category: 'treat', hood: 'Downtown', lat: 43.0738, lng: -89.385, price: 2, setting: 'in', minutes: [15, 35], kids: 1,
    moods: 'showoff! eat odd', hours: 'mo-fr 10:00-18:00; sa 08:00-17:00',
    story: "A small shop on the Capitol Square stacked with Wisconsin's best cheese, sold by people who can tell you which farm it came from and how old it is.",
    nudge: 'Tell them what you usually like and ask to taste something stranger. Buy a small wedge and some crackers and eat them on the Capitol lawn.',
  }),

  // ------------------------------------------------------------- drinks
  place({
    id: 'rathskeller', name: 'Der Rathskeller', what: 'A German beer hall inside the student union',
    category: 'bar', hood: 'Campus', lat: 43.0763, lng: -89.3997, price: 1, setting: 'in', minutes: [30, 75], kids: 1,
    moods: 'cozy! drink lively showoff', hours: 'daily 10:00-22:00',
    story: "A vaulted beer hall from 1928 with murals in the ceiling arches, a fireplace, and students pretending to study. It's winter's answer to the Terrace outside.",
    nudge: "Order at the counter, then take a table under the murals and work out what the painted figures are up to. If the nook by the fireplace is free, that's your seat.",
  }),
  place({
    id: 'weary-traveler', name: 'The Weary Traveler', what: 'A dim, wood-paneled Willy Street freehouse',
    category: 'bar', hood: 'Willy Street', lat: 43.081, lng: -89.366, price: 2, setting: 'in', minutes: [45, 100], kids: 0,
    moods: 'date! drink eat cozy', hours: 'daily 11:30-23:00', best: ['night'], gem: 0.75,
    story: "Dark wood, board games, mismatched lamps, and a kitchen that takes bar food more seriously than it has to. It feels like the pub of a town slightly more interesting than the one you're in.",
    nudge: "Get a booth and a board game off the shelf. Order Bob's Bad Breath Burger if you're not kissing anyone later.",
  }),
  place({
    id: 'mickeys', name: "Mickey's Tavern", what: 'A dive with velvet back rooms and a patio',
    category: 'bar', hood: 'Willy Street', lat: 43.0843, lng: -89.3615, price: 1, setting: 'in', minutes: [40, 90], kids: 0,
    moods: 'drink! lively date odd', hours: 'daily 16:00-02:00', best: ['night'], gem: 0.8,
    story: "From the front it's a corner tavern. Keep walking and it turns into a string of back rooms with velvet couches and odd paintings, then a patio near the Yahara. Often there's a band. There's rarely a cover.",
    nudge: "Don't settle in the front room. Walk all the way through until you find the couches. Order the sexy fries. Yes, that's what they're called.",
  }),
  place({
    id: 'le-tigre', name: 'Le Tigre Lounge', what: 'A strip-mall bar that is entirely tigers',
    category: 'bar', hood: 'West Side', lat: 43.05, lng: -89.452, price: 1, setting: 'in', minutes: [30, 60], kids: 0,
    moods: 'odd! drink date', hours: 'mo-sa 16:00-01:00', best: ['night'], gem: 0.8,
    story: "Not a craft cocktail bar. Not trying to be. Every surface holds a tiger: paintings, statues, plush, velvet. It has been family-run for decades and the jukebox agrees.",
    nudge: 'Bring cash. Sit at the bar, order something simple, and count tigers until you lose track. Do not ask for a drink menu.',
  }),
  place({
    id: 'harmony-bar', name: 'Harmony Bar & Grill', what: 'A neighborhood bar with a real stage',
    category: 'bar', hood: 'Atwood', lat: 43.0925, lng: -89.349, price: 1, setting: 'in', minutes: [40, 90], kids: 1,
    moods: 'lively drink! eat', hours: 'daily 11:00-24:00',
    story: "A proper Wisconsin corner bar that happens to book good blues and roots bands in its back room. The walnut burger is better than it has any reason to be.",
    nudge: "Order the walnut burger even if you eat meat. Check the back room; if there's a band, pay the cover without thinking about it.",
  }),
  place({
    id: 'gennas', name: "Genna's Lounge", what: 'A two-story bar looking straight at the Capitol',
    category: 'bar', hood: 'Downtown', lat: 43.0735, lng: -89.3838, price: 1, setting: 'both', minutes: [30, 75], kids: 0,
    moods: 'drink! date lively showoff', hours: 'mo-fr 15:00-02:00; sa,su 12:00-02:00', best: ['night'],
    story: "A narrow two-floor bar across the street from the Capitol, where legislative staffers and bike messengers drink side by side. The sidewalk tables have the best view of the dome that comes with a beer.",
    nudge: 'In good weather, take a sidewalk table facing the Capitol. In bad, go upstairs and get the window. Either way, look at the dome once it\'s lit.',
  }),
  place({
    id: 'working-draft', name: 'Working Draft Beer Company', what: 'A calm, bright east-side taproom',
    category: 'bar', hood: 'Willy Street', lat: 43.0805, lng: -89.365, price: 1, setting: 'in', minutes: [40, 80], kids: 1,
    moods: 'drink date lively', hours: 'tu-th 15:00-22:00; fr 15:00-23:00; sa 12:00-23:00; su 12:00-20:00',
    story: "A brewery taproom that feels more like an art studio than a sports bar: high ceilings, local art on rotation, and beers that favor drinkable over extreme.",
    nudge: "Order a flight and include whatever lager is on. Bring food in from Willy Street. Sit where you can see the tanks.",
  }),
  place({
    id: 'giant-jones', name: 'Giant Jones Brewing', what: 'A tiny organic brewery of very big beers',
    category: 'bar', hood: 'Capitol East', lat: 43.0808, lng: -89.369, price: 1, setting: 'in', minutes: [30, 60], kids: 0,
    moods: 'drink! odd date', hours: 'th,fr 16:00-21:00; sa 13:00-21:00', gem: 0.75,
    story: "A two-person, certified-organic brewery that only makes strong beers: barleywines, imperial stouts, things meant for sipping. The tasting room is a few tables next to the brewhouse.",
    nudge: "Order small pours and share them. Ask whoever's pouring what they're proudest of right now; it's probably an owner. Walk or bike. These beers are not kidding.",
  }),
  place({
    id: 'natt-spil', name: 'Natt Spil', what: 'A dim room with no sign and no phone',
    category: 'bar', hood: 'Downtown', lat: 43.0745, lng: -89.381, price: 2, setting: 'in', minutes: [45, 90], kids: 0,
    moods: 'date! drink eat odd', hours: 'daily 17:00-01:00', best: ['night'], gem: 0.8,
    story: "No sign, no phone number, no reservations. Inside: a wood-fired oven, carved wood, a DJ playing records at conversation volume, and light low enough that everyone looks good.",
    nudge: "Look for the unmarked door on King Street. Get dumplings and a pizza to share. Bring cash to be safe, and patience; it's small.",
  }),
  place({
    id: 'gibs', name: "Gib's Bar", what: 'Careful cocktails in an old Willy Street house',
    category: 'bar', hood: 'Willy Street', lat: 43.0828, lng: -89.3622, price: 2, setting: 'in', minutes: [45, 90], kids: 0,
    moods: 'date! drink! cozy', hours: 'tu-sa 17:00-24:00', best: ['night'], gem: 0.8,
    story: "A two-story house turned cocktail bar, with a short, serious menu downstairs and a living room of couches upstairs. The drinks are precise without anyone making a speech about them.",
    nudge: "Go upstairs and take a couch if one's free. Tell the bartender a spirit and a mood and let them choose. Have one more than you planned, slowly.",
  }),
  place({
    id: 'robin-room', name: 'Robin Room', what: 'A small, low-lit cocktail bar on East Johnson',
    category: 'bar', hood: 'Tenney-Lapham', lat: 43.0826, lng: -89.3752, price: 2, setting: 'in', minutes: [40, 80], kids: 0,
    moods: 'date! drink! cozy', hours: 'daily 16:00-24:00', best: ['night'],
    story: "A narrow neighborhood room with a long bar, candlelight, and a menu split between classics done properly and a few house inventions. Grown-up without being stiff.",
    nudge: "Sit at the bar, not a table. Start with a classic so you know what they can do, then order the strangest thing on the house list.",
  }),
  place({
    id: 'merchant', name: 'Merchant', what: 'Craft cocktails and a late kitchen off the Square',
    category: 'bar', hood: 'Downtown', lat: 43.0733, lng: -89.3822, price: 2, setting: 'in', minutes: [45, 100], kids: 0,
    moods: 'date drink! eat lively showoff', hours: 'daily 16:00-24:00', best: ['night'],
    story: "A big, handsome room a block from the Capitol with a wall of bottles and a long cocktail list that changes with the season. It's where downtown goes when it wants to dress up a little.",
    nudge: "Ask what's new on the seasonal list and order from that. Share a couple of plates rather than committing to dinner. Walk the Square afterward while the dome is lit.",
  }),
  place({
    id: 'plaza', name: 'The Plaza Tavern', what: 'Home of the Plazaburger',
    category: 'bar', hood: 'State Street', lat: 43.0755, lng: -89.39, price: 1, setting: 'in', minutes: [30, 60], kids: 0,
    moods: 'eat drink! lively odd', hours: 'mo-sa 11:00-02:00', best: ['night'],
    story: "A big, plain, wood-paneled tavern off State Street, famous for one thing: a thin burger with a tangy secret sauce. The murals and the pool tables haven't changed and nobody wants them to.",
    nudge: "Order a Plazaburger and a tap beer. Don't ask what's in the sauce; they won't say. Play a game of pool while you wait.",
  }),
  place({
    id: 'olbrich-biergarten', name: 'Olbrich Biergarten', what: 'A lakeside beer garden facing the skyline',
    category: 'bar', hood: 'East Side', lat: 43.09, lng: -89.33, price: 1, setting: 'out', minutes: [40, 90], kids: 2,
    moods: 'drink! lively date showoff kids', hours: [{ season: '05-01..10-15', hours: 'mo-fr 16:00-21:00; sa,su 12:00-21:00' }],
    needs: ['mild'], best: ['sunset'], gem: 0.85,
    story: "Communal tables on the shore of Lake Monona, pretzels the size of a steering wheel, and the sun going down behind the Capitol across the water. Kids and dogs everywhere, in the good way.",
    nudge: 'Get a liter and a giant pretzel and carry them to the tables closest to the water. Time it for the hour before sunset and face west.',
  }),

  // ------------------------------------------------------------- play
  place({
    id: 'vilas-zoo', name: 'Henry Vilas Zoo', what: 'A zoo that has always been free',
    category: 'play', hood: 'Vilas', lat: 43.0606, lng: -89.41, price: 0, setting: 'out', minutes: [45, 100], kids: 2,
    moods: 'kids! nature showoff', hours: 'daily 09:30-17:00', needs: ['daylight'], gem: 0.7,
    story: "One of the few free zoos left in the country, by the terms of the family that gave the land in 1904. Small enough to finish before anyone melts down.",
    nudge: "Go straight to the polar bear's underwater window, then work backward against the crowd. The carousel costs a couple of dollars; bring them.",
  }),
  place({
    id: 'childrens-museum', name: "Madison Children's Museum", what: 'A hands-on museum with chickens on the roof',
    category: 'play', hood: 'Downtown', lat: 43.0765, lng: -89.3848, price: 2, setting: 'in', minutes: [60, 120], kids: 2,
    moods: 'kids! cozy', hours: 'we-su 09:00-16:00', gem: 0.8,
    story: "Built largely from salvaged local materials, with a log cabin, a human-sized gerbil wheel, and live chickens in a rooftop garden that looks at the Capitol. Adults without kids quietly wish they could go in.",
    nudge: 'Start on the roof with the chickens before it gets busy, then work down. Let the kids pick the order after that. Budget more time than you think.',
  }),
  place({
    id: 'io-arcade', name: 'I/O Arcade Bar', what: 'Old arcade cabinets and pinball, with a bar',
    category: 'play', hood: 'Willy Street', lat: 43.0792, lng: -89.3698, price: 1, setting: 'in', minutes: [40, 90], kids: 0,
    moods: 'lively! odd date drink', hours: 'tu-su 16:00-24:00', best: ['night'],
    story: "A bar built around a few dozen arcade cabinets and pinball tables, kept in working order by people who care. Competitive in a friendly, slightly nerdy way.",
    nudge: "Sort out how you pay for games before you get a drink. Find the pinball row and play one table three times running instead of sampling them all. That's how you get good.",
  }),
  place({
    id: 'boulders', name: 'Boulders Climbing Gym', what: 'Indoor climbing, no experience needed',
    category: 'play', hood: 'East Side', lat: 43.1085, lng: -89.318, price: 2, setting: 'in', minutes: [60, 120], kids: 2,
    moods: 'move! kids lively date', hours: 'mo-fr 10:00-22:00; sa,su 10:00-20:00',
    story: "A long-running local climbing gym with walls for people who've never touched a hold and problems for people who do nothing else. A rainy-day cure for restless bodies of any age.",
    nudge: 'Rent shoes and start on the bouldering wall: no ropes, no partner, thick mats. Climb the easiest grade until your forearms complain. They will, quickly.',
  }),
  place({
    id: 'vitense', name: 'Vitense Golfland', what: 'Mini golf, indoors and out',
    category: 'play', hood: 'West Side', lat: 43.051, lng: -89.483, price: 1, setting: 'both', minutes: [40, 90], kids: 2,
    moods: 'kids! lively date', hours: 'daily 09:00-21:00',
    story: "A west-side institution since the fifties, with outdoor mini golf and an indoor course for when the weather turns. Earnest, a little worn, and better for it.",
    nudge: "Play the indoor course if it's cold; it's the stranger one anyway. Loser buys ice cream. Keep score honestly or not at all.",
  }),

  // ------------------------------------------------------------- recurring events
  place({
    kind: 'event',
    id: 'farmers-market', name: "Dane County Farmers' Market", what: 'The whole Capitol Square, full of farmers',
    category: 'market', hood: 'Downtown', lat: 43.0752, lng: -89.3841, price: 1, setting: 'out', minutes: [40, 90], kids: 1,
    moods: 'showoff! eat lively kids', hours: [{ season: '04-11..11-14', hours: 'sa 06:15-13:45' }], best: ['morning'], gem: 0.95,
    story: "Every Saturday the Capitol Square fills with farmers, and only farmers: everything sold has to be grown or made by the person selling it. It's the largest market of its kind in the country and it is not a secret.",
    nudge: "Walk counter-clockwise like everyone else; fighting the current is a rookie move. Get the hot spicy cheese bread from Stella's and eat it warm on the Capitol lawn. Go before nine.",
  }),
];
