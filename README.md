# Do Something · Madison

> You have a free evening. Make the most of it.

Say what sounds right and how long you've got: two taps. Then three things worth doing in Madison, WI, are dealt for you: open, reachable, different from each other, each with a reason it fits and exactly what to do when you get there. Three, never more. No feed. The backdrop is the actual sky over the city at that moment.

## Run it

```sh
npm install
npm run dev        # the app, at localhost:5173
npm test           # time zones, hours, seasons, events, matching, data
npm run events     # refresh public/events.json from the live calendars
npm run explain -- "date night" --at 2026-11-13T19:00 --hours 3 --mode walk --weather
```

`explain` runs the real matcher from the terminal and prints every score part and every rejection. In the browser, add `?debug` to the URL for the same thing under the cards.

## How it's built

A static site. No accounts, no API keys, and one optional collector (see "What people type"); without it, no server and no database.

| Piece | Where | Notes |
| --- | --- | --- |
| Places | `src/cities/madison/places.ts` | Hand-written. The content is the product. |
| Events | `public/events.json` | Rebuilt every morning from public calendars. See "The events process". |
| Weather | Open-Meteo, from the browser | Free, no key. Sunrise and sunset are computed locally. |
| Live conditions | `src/core/live.ts`, from the browser | Weather Service alerts, air quality (Open-Meteo) and the K index (NOAA). Free, no keys. See "Right now". |
| Matching | `src/core/match.ts` | One pure function. The only copy of the logic. |
| Memory | `localStorage` | Stays on the device. Location is used in memory only and never stored. |
| What people type | `worker/`, a Cloudflare Worker | Optional, and off until set up. The words typed in the "say it" box and what the app made of them. Nothing about who typed. |
| Visit counts | Cloudflare Web Analytics | Optional, and off until set up. Page views and visits over time, without cookies. See "Counting visits". |
| Deploy | `.github/workflows/deploy.yml` | GitHub Pages, on push to `main` and every morning (to refresh events). Cost: nothing. |

To turn on deploys: repo Settings → Pages → Source: GitHub Actions.

## Two tiers of places

1. **The list** (`src/cities/madison/places*.ts`): hand-written, with a story and a nudge for each. This is the product. It always comes first.
2. **The map** (`public/nearby.json`, built by `npm run nearby`): independent restaurants, cafés, bars, bakeries and ice cream shops from OpenStreetMap that have a name and opening hours we can represent exactly. Chains and anything already on the list are dropped.

The map is only ever used to fill seats the list couldn't: if three hand-written picks fit, no map place is shown. A "Local today" request never borrows from the map: those are ordinary restaurants, not things happening that day. A map place passes the same gates (open, reachable, in time), is tagged "From the map", carries no opinion, and its hours are always shown as "usually open". When any are used, the page says so. The logic is in `match()` (`world.fallback`) and `src/core/nearby.ts`.

## The model

The top of the page is a small 3D model of Madison (`src/ui/scene.ts`, three.js, loaded on demand), under the real sky for the time, season and weather. One unit is one mile, so a place's coordinates drop straight onto it.

What's real: the shorelines of the four lakes, the Yahara River and the main roads come from OpenStreetMap, simplified and stored as miles from the Capitol in `src/cities/madison/shape.json`. The landmarks (Camp Randall, the Kohl Center, Monona Terrace, the Union Terrace, Bascom Hill, Olbrich, the airport, the big parks and preserves) are placed by hand in `shape.ts`. The airport is drawn from its real runways, taxiways, aprons and terminal footprint (also OpenStreetMap), with a plane that takes off down the long runway, circles the city and lands. Roads that cross open water ride a raised causeway. The map supplies each road in short pieces; the model joins them end to end and rounds the bends, so a causeway is drawn as one curved strip. Downtown is packed block to block from shore to shore, as it is from the air: mid-rises around the Square, three and four stories beyond them, low roofs out to where the houses begin, all with windows that light up at night and the dome clear above them. About 25 recognisable buildings (the State Office Building, the Hilton, Monona Terrace, the Blount Street stacks, the campus dorm towers, Van Hise) stand at their real addresses, with sizes and colours judged by eye from photographs. The Capitol is drawn larger than life, so buildings on the Square are nudged out to its edge. What's invented: every individual house, tree, barn and downtown block is scattered by a seeded random number generator inside those real outlines, so the town looks the same on every visit but no single building is a real one.

- Drag to look around; flick and the camera keeps turning, then coasts to a stop. Pinch, ctrl-scroll or use the + and − buttons to zoom.
- Tap a landmark or a lake for its name; the camera flies over for a few seconds and comes back. Tap the Capitol, a sailboat, the plane or the water for a small reaction. Tap the sun or moon to run the day forward.
- Tap the balloon to ask for a surprise.
- When the lakes are frozen: tap an ice shanty and a few fish come flying out of it, skid across the ice (fast on bare ice, slowly in snow, where they plough a furrow), knock into each other and the shanties, flop about, then hop home. Tap snowy ice to leave a dent. Press on snowy ice, hold still a moment, then drag to push the snow about: a quick drag still turns the view (or, up and down on a phone, scrolls the page); the hold is what makes it a plough.
- When three picks are dealt, each stands as a numbered beacon where it really is. Tap a beacon to bring up its card; swipe the cards and the camera leans toward that pick.

The page holds back on first load: a quiet wordmark shows (straight from `index.html`, before any script) until the model has drawn and the weather is in, then the whole page fades in at once. It never waits more than about four seconds; without WebGL it shows the painted sky as soon as the weather is in.

The first visit opens with a short introduction (`src/ui/intro.tsx`): the idea of the app, one sentence at a time, over a scripted 27-second flight across the model. A tap anywhere skips it, the "?" button on the opening screen replays it, and a flag in local storage keeps it from playing twice. With reduced motion the camera holds still and the sentences simply change.

To look at the model in weather you aren't having, add `?weather=snow` (or `ice`, `rain`, `storm`, `fog`, `clear`) to the URL. It changes only how the model is dressed: the header and the picks still use the real forecast. To lay any depth of snow on it, add `?snow=6` (inches). To look at it at an hour that isn't now, add `?at=16:10` (24-hour, today, by the browser's clock): the sky and the header move to that time, the picks do not.

Three things tie the model to the decision:

- **The lens.** The scene is drawn off-screen and shown through a tilt-shift blur (sharp across the middle, soft above and below), which is what makes it read as a miniature. If a device can't fill the off-screen buffer, it draws direct.
- **Routes.** In the results, a "You" marker sits where you're starting from, with an arc out to each pick and a small traveller on it, slower for the longer trips.
- **Tonight.** Off by default; the "Show key events in Madison" switch at the foot of the page turns it on. On the opening screen, a searchlight then stands over each venue with something on in the next six hours (from the events file). Tap one for the time and the name.

By season, weather and hour: leaves turn in October and come down in November; snow follows the real depth on the ground (from the forecast, in inches): a dusting lies in patches with the grass showing through and frosts the roofs; by two inches the ground is one white and the ploughed roads show grey against it; from an inch it lies on the roofs as a layer with thickness, deeper by the inch: overhanging the eaves of the houses, and as a slab on downtown's flat roofs; from there trees whiten further, conifers most, drifts appear over the open ground and grow, and from four inches the ploughs have left grey banks along the roads; past ten the roads pale and the lake ice loses its cracks. Snow that is falling adds to what is lying (flurries a dusting, snow in earnest enough to whiten the ground) and builds over a quarter of a minute rather than appearing at once, with a few flakes in the air or many to match; from December to March, when it is below 33°, the lakes freeze, the boats become ice shanties, and any snow lies on the ice; rain falls as slanting streaks, light or heavy with the forecast, darkening the streets and roughening the lakes; in a thunderstorm the sky goes to slate, the rain drives harder, the sailboats leave the water, and every several seconds a bolt comes down somewhere over town with one soft flash (none with reduced motion); in fog the haze closes in until downtown stands clear and the far shores are gone, the sun is a dim disc, and the header says "foggy"; windows, street lights and headlights come on at dusk, and fireflies come out on dry summer nights.

The small things that follow the real day live in `src/ui/scene-life.ts`. None of them draws a person; a crowd is dots.

- **Shadows.** The sun throws real ones (one shadow map that follows the camera and covers only what is in view): long across the streets at either end of the day, short at noon, faint under the moon, and all but gone under cloud or in fog. The light rises behind the viewer's right shoulder and by evening rakes in from the left, so it never comes from in front. The balloon's and the plane's shadows cross the town for real. A device with 4 GB of memory or less goes without, and keeps a soft disc under each flier.
- **Wind.** Trees lean with it, and gusts cross the woods in bands. A flag on the square swings to the wind's real bearing, ripples harder the more it blows and hangs when it doesn't. Clouds drift the same way, boats heel, rain slants, the lakes roughen in a blow and go glassy when it's still.
- **Cold.** At freezing and below, chimneys smoke, and the smoke leans downwind.
- **The sky.** The moon is drawn at its true phase and lays a path on the water in proportion. On an evening the forecast gives a show to, the horizon burns and the clouds catch it. When the K index says so, the northern lights hang low in the north. Under a thunderstorm or tornado warning a shelf cloud stands in the west.
- **The city's calendar.** On market mornings (when the place named by `marketPlace` in the shape is open) tents ring the square and a crowd shuffles round counter-clockwise. When the events file has something on at a stadium or an arena, from two hours before until it ends, the stadium's floodlights come on, the stands fill with red and white, a stream of red walks in, and the arena's roof glows. From late November to New Year's Day coloured lights go up round the square and at Olin Park. The dome is lit every night. The Terrace chairs go indoors for the winter.
- **Always.** A freight train crosses the causeway every minute or so. The plane and the balloon throw shadows when the sun is out.
- **Snow on the ice** (`src/ui/scene-ice.ts`). The snow on the frozen lakes is a grid of depths on the CPU, made the first time the lakes freeze. A plough (a finger, or a skidding fish) shoves whatever lies under it out to its rim, mostly ahead and to the sides, so a ridge builds in front and is pushed along and berms are left either side of a bare track. Then it settles the way heaped snow does: wherever one cell stands more than a set height above its neighbour, some slides down to it, over the next frames, until every slope can stand. Snow is only moved, never made or lost, though falling snow slowly fills the hollows back in, and a thaw smooths it all for the next freeze. The ice shader reads the depths: bare where it was cleared (so the sun glints there again), whiter on the heaps, and lit or shaded on their slopes.
- **Ripples** (`src/ui/scene-water.ts`). The lakes are a grid of water heights on the graphics card, stepped sixty times a second by the wave equation, so a disturbance spreads as a ring, rings pass through each other, and they bounce off the shore. A boat lifts the water at its bow and lets it fall at its stern, which leaves a wake; tap a boat and its spinning hull throws rings; tap the lake, or let it rain, and each drop is a real one. The water's shader tilts its surface to the simulated heights, so the sky and sun reflect off the waves. A boat is a small weight on springs: when a ring from a tap reaches it (at the pace the ring really travels) it is shoved off, lifted and rolled or pitched according to which side the wave took it on, and it settles again. The lakes also carry a small chart, worked out once at load: how far each spot of water is from its shore, and how much lamplight stands near it. From the first the water is paler and greener in the shallows, with a line of foam lapping at the edge; from the second, after dark, the town's lights lie on the water in streaks drawn out toward the viewer and broken by the passing waves. One shortcut: real wakes depend on long waves outrunning short ones, which is too heavy for a phone, so there are two fields at two speeds, a slow one for wakes and a fast one for rings. It needs a device that can draw to a floating-point texture; without one, and with reduced motion, the lakes are as they were.

To look at any of these on a day that isn't having them, add `?scene=` with any of `market`, `gameday`, `arena`, `holiday`, `aurora`, `sunset`, `shelf`, `cold`, `windy`, `calm`, `full`, `new`, separated by commas. With `?debug`, the model is on the window: `model.visit(east, north)` flies the camera to a spot.

The model stops drawing while the tab is hidden or the model is scrolled out of view.

A beacon is only as good as the coordinate behind it. Places in the list were located from memory and are right to within a few blocks, not to the door; events are placed by their venue, or by the coordinates their feed supplies. A test fails if any place or venue lands in a lake, which is how one bad coordinate was already caught. Anything beyond about 12 miles is dropped before it gets here, and the detailed part of the model reaches a little past the edge of town.

The scene knows nothing about Madison: it builds whatever `CityShape` it is handed (`src/core/types.ts`). It's decoration over a working page: everything it does is also a button below. Without WebGL the page keeps its painted sky, and with reduced motion the model holds still.

To rebuild `shape.json`, fetch the lake polygons from Nominatim (`polygon_geojson=1`) and the `motorway|trunk|primary` ways from Overpass for the bounding box, convert to miles with `offsetMiles`, and simplify. Map data © OpenStreetMap contributors, under the Open Database License.

## How matching works

`match(request, world)` in `src/core/match.ts`, in four stages:

1. **Assess.** Hard gates decide whether this person can actually do this thing at that time: open long enough once you arrive (in the city's time zone), in season, enough daylight, weather that suits it, close enough for the time and transport you have, fine for kids if kids are along. One gate comes from the request itself: `today` (the "Local today" tile, or words like "what's on", "happening tonight", "events") keeps only what is specifically on that day, meaning dated events and markets while they are open, and rules out everything that is always there. For that request other words only lean the order, and the map tier is never used to fill seats. Every rejection is recorded with a reason.
2. **Score.** Named, additive parts: `mood`, `vibe` (the optional feel chosen in the vibe picker: chill, upbeat, romantic, curious, active or offbeat, defined in `src/core/vibes.ts`; it leans the order and never rules anything out), `moment` (sunset timing, weather, seasonal peaks, one-night events), `time`, `near`, `gem` (editorial weight), `taste` and `seen`/`been`/`skipped`/`saved` from history.
   Dated events get one more part, `once`: a one-off that is also an occasion (a fair or festival, something outdoors, something for families) leans up the order, but only when it fits what was asked. An ordinary gig that happens to be on once gets none. Events take at most two of the three seats unless what's on, or a stage, was the question.
   A pick may also be a **stretch**: a knowing departure from the request. Who's coming along ("friends", "a date") is read separately from what was asked for and only shades the order; it can earn something a seat that the ask alone would not (a concert, for "outside, with friends"), and asking for outdoors does not forbid an indoor pick. But a stretch gives up half a point, is never listed first, carries an "A stretch" tag, and opens its reason by saying where it departs ("Not outdoors, I know."). If every pick is a stretch, the note says so.
3. **Choose.** The best fit; then the best fit that is a *different kind of thing*; then a "left turn" drawn at random (seeded) from what still clears the bar. The draw leans toward places we'd vouch for hardest and toward the odd.
4. **Explain.** One line per pick, the sharpest true one available, tried in this order: a moment that won't keep (sunset, a seasonal peak, the weather; for an event, when it starts and how comfortably you'd make it); your own history with it (saved, liked last time); **the place's own line for what you asked** (`why` on the place, one hand-written sentence per mood the place is *for*); a lesser moment (it's morning, it's after dark); a general line for the vibe, the kind of place or the mood, used when the place is only a partial fit; the place's own lead line regardless; a fact read straight from its data; and only then a stock line per family of place. No two cards share a reason, and no line claims what the story or a field doesn't back. `tests/reasons.test.ts` sweeps about 1,500 requests over the real list and fails if any one line is on more than 15% of cards; run it with `REASONS=1` to print the table. `tests/data.test.ts` fails if a place lacks a `why` line for a mood it's for, or if two places share one.

If fewer than three things pass, it shows fewer and says why. If nothing passes, it says that.

What the person types, taps or picks all goes through one parser (`src/core/intent.ts`): chips are just canned words. All tunable numbers live in `TUNING` at the top of `match.ts`.

It learns from a small on-device log (`src/core/history.ts`). Tapping Directions prompts a "Did you go?" check-in later; going and liking counts for much more than tapping.

## Right now

Beyond the hourly forecast, the app looks at what is going on outside at this moment. Every source is optional: a feed that fails is treated as unknown, and nothing is claimed or ruled out from it.

| What | Where it comes from | What it does |
| --- | --- | --- |
| Cloud by layer | Open-Meteo forecast | A sunset is only given as a reason when the forecast leaves one to see. Low cloud or a solid deck: no mention. A clear horizon with cloud above it: "the forecast leaves high cloud for it to light up". |
| Wind and gusts | Open-Meteo forecast | Boats and beaches are ruled out from 20 mph steady (or 30 in gusts), lean down the order from 12, and a still lake (5 or under) is said out loud. |
| Moon | Computed locally (`src/core/moon.ts`) | A clear night within two days of full is a reason for a view or a shoreline. |
| Weather alerts | api.weather.gov, for the city centre | Under a tornado, blizzard or ice storm warning nothing is offered at all. Under a lesser warning (severe thunderstorm, winter storm, extreme cold or heat, flash flood, high wind) nothing outdoors is, and the page says why above the picks. Watches and advisories change nothing. |
| Air quality | Open-Meteo air quality | US index 151 and up rules out the outdoors; 101 to 150 leans away from it. Either way the page says so. |
| K index | NOAA Space Weather Prediction Center | At 7 or more on a clear night, the opening screen says the northern lights may be visible. |

On the opening screen, when there is something worth knowing (`headline()` in `live.ts`: a warning, bad air, the northern lights, rain or storms due within four hours, a sunset worth going to, snow falling, a fine day, a flat lake, or a moonlit night, in that order), the weather line under the wordmark becomes a banner: a glowing dot, a two- or three-word tag ("Good sunset", "Winter storm warning"), and the time and temperature. It breathes and catches the light until it has been opened once. Tapping it unfolds the detail and a button that asks for exactly that, through the same parser as everything else; tapping again folds it away. On an ordinary day it is the plain weather line.

The last forecast is kept in local storage (it is the city's weather, not the person's). A reload within fifteen minutes doesn't ask again, a failed request is retried once, and if that fails too a forecast up to six hours old is used.

`npm run explain -- "…" --weather` fetches all of this and prints the "right now" line and any alert alongside the picks.

## Trust in the data

Past versions were wrong quietly. The rules now:

- **Time is always city time.** `src/core/time.ts` is the only place wall-clock time is computed, and tests run under several process time zones and both DST changes.
- **Hours carry a trust level.** `hoursTrust: 'solid'` only for hours that come from a rule (city parks, 4 am to 10 pm) or were checked by hand. Everything else shows as "Usually open until…". **Most places are currently `unverified`: see below.**
- **Unknown is not yes.** No weather means no sledding suggestion; a stale or malformed events file is ignored, not shown.
- **Malformed data fails loudly.** Bad hours strings throw; `tests/data.test.ts` checks every place.

### Known gaps

- The ~60 places were written from general knowledge of Madison, not verified on the ground. Hours, a few specifics in the nudges, and whether each business is still operating need a hand check. Checks go in `reviews.json` (see Scheduled review).
- Coordinates are approximate (good to a few blocks). They're only used for travel estimates; directions search by name.
- Travel times are straight-line estimates with a detour factor, not routing.
- The target is 200+ places. Add them slowly.
- Not built yet: itineraries, group decisions.
- Live conditions cover the sky, the wind, the air and official warnings. Still missing: beach closures (the county's algae reports), lake ice, and whether the Terrace is actually open on a given day. Each needs a source scraped by the morning job, as events are.
- The lakes' ice on the model is still a guess from the month and the temperature.

## The events process

`npm run events` (run by the deploy workflow every morning; add `-- --dry` to look without writing):

1. **Fetch** each calendar. Today: the Isthmus calendar (RSS), UW–Madison events by tag (JSON, which also carries the Wisconsin Union's films and concerts), and the Madison Children's Museum's own programs (JSON).
2. **Parse** with one small pure function per calendar in `src/core/sources.ts`.
3. **Judge** every listing in `src/core/events.ts`. It's kept only if we know where it is (a venue in `src/cities/madison/venues.ts`, or coordinates from the feed within 12 miles), can tell what kind of thing it is, and it isn't filler, sold out, cancelled or an all-day notice. The run prints how many were dropped and why.
   Along the way each listing is tagged, from where it is and from its own words:
   - **Outdoors** (`setting: 'out'`, and a `nature` mood so it answers "outside") if its venue is marked `outdoor` in `venues.ts` (a park, the Square; from April to October only, since a park's winter listing is as likely in the shelter), if the listing says so ("outdoor", "on the Square", "weather permitting", "bring a lawn chair"), or if it is an outing or a spectacle by nature (a hike, a ski, a parade, fireworks). "Indoor" in the listing settles it the other way. An outdoor event then faces the same weather gates as a park: it isn't offered in the rain.
   - **For families** (`kids: 2`, and a `kids` mood) only if the listing says so in so many words ("family-friendly", "for kids", "children's concert", "all ages welcome"). A film *about* children doesn't count. "21+" makes it adults only; a bar that says nothing is too.
   - **Turn up any time** (`dropIn`) for open mics, jams, DJ nights, fairs, and music in a bar; concerts want you there at the start.
4. **Dedupe**: same start time at the same spot is one event; the earlier calendar wins. Then **mark one-offs**: the Isthmus feed is read fifteen days ahead (eight are published), and anything that appears on one day only (not a run, not a weekly night) is `oneOff`.
5. **Write** `public/events.json`. The app re-validates it and ignores it entirely if it's more than four days old.

A calendar that fails is skipped and reported; the others still publish. The quickest way to get more events through is to add venues to `venues.ts`. Run `npm run events -- --dry --venues` to see every venue whose listings were dropped this week, busiest first, with the address and coordinates from its listing page, in a form that pastes straight into the file. About 180 venues are on file. In a week in November 2026, 164 of 322 Isthmus listings got through: most of the rest were filler (trivia, bingo, meetings), and the unknown venues left were mostly past 12 miles, churches or meditation centres. The rest are at venues left out on purpose (schools, churches, private homes, towns more than 12 miles out) or are filler.

To add a calendar: write a parser in `sources.ts`, test it against a real sample, name it in `SOURCES`, and list it in `scripts/fetch-events.ts`.

Looked at and not used: Visit Madison's feed has dates but no times, so we can't honestly say when to turn up; the Wisconsin Union's own feed has titles only; Madtown Life mostly repeats Isthmus.

## What people type

The "or say it" box is where the app finds out what it doesn't understand, so what's typed there can be collected. Apart from the visit counter (next section), it is the only thing the app ever sends anywhere, and it is off until the collector is set up.

- **What is sent:** the words (200 characters at most), the phrases the app understood, whether it understood none, how many picks came back, and the time the person had. **What is kept with it:** the hour it arrived. **What is never sent or kept:** location, IP address, cookies, any identifier, the exact minute, and anything about taps on tiles.
- **When it is on,** the footer says so in plain words. A browser that asks not to be tracked (Global Privacy Control, or Do Not Track) sends nothing.
- **The collector** is `worker/say-log.js`, a Cloudflare Worker with one table. It accepts writes only from the site's own addresses, stops writing in a flood, and hands the rows over only to whoever holds the export token. Setting it up takes about ten minutes: `worker/README.md`. The site learns the collector's address from the `SAY_LOG_URL` repository variable at build time; deleting the variable turns logging off.
- **Reading it:** `npm run says` (with `SAY_EXPORT_URL` and `SAY_EXPORT_TOKEN` set) prints the share of typed requests the app understood none of, understood only in part, or answered with no picks; the phrases it is lost on; and the words it steps over, commonest first. Every phrase is read again with the parser as it is today, so a fix shows up as phrases "lost when typed, understood now".
- **Improving it:** the words it steps over are the vocabulary `src/core/intent.ts` is missing. Add them to the lexicon with a test in `tests/intent.test.ts`. The phrases are things strangers typed: never copy them into the repository or anywhere public. A test should use a phrase of your own that makes the same point.

## Counting visits

How many people use the site, over time, comes from Cloudflare Web Analytics. It sets no cookies and stores nothing on the device, so its numbers are visits and page views, not a count of distinct people across days. It is off until a token is set, and a browser that asks not to be tracked (Global Privacy Control, or Do Not Track) is not counted.

**Set it up (once, about five minutes):**

1. In the Cloudflare dashboard: Analytics & Logs → Web Analytics → Add a site. Enter `dosomethingmadison.com`, and choose the manual JavaScript snippet (not automatic setup, which needs the site's DNS on Cloudflare).
2. From the snippet it shows, copy the `token` value: 32 letters and digits.
3. In the GitHub repository: Settings → Secrets and variables → Actions → Variables → New repository variable. Name `CF_ANALYTICS_TOKEN`, value the token. The next deploy turns counting on. Deleting the variable turns it off.

**Reading it:** the same Web Analytics page in Cloudflare, with a chart of visits and page views over time and breakdowns by page, referrer, country and device.

## The tagging review

How well loaded events are tagged is measured, and the measure may only go up.

- `tagging/golden.json` is the answer key: real listings, each labelled by hand with what it should come out as. A quarter are held out for judging.
- `npm run tagging` grades the tagger against the key (keep or drop, kind, indoors or out, kids, turn-up, and moods by precision and recall) and profiles the week's listings: coverage, how evenly the moods are spread, which moods no event carries, and what share of events each tile, companion and vibe can reach.
- `tagging/baseline.json` is the floor, and the answer-key items it was set on. `npm test` fails below it on those items, so new listings can't fail it until the floor is set again. `npm run tagging -- --compare main` grades the old rules and the new on the same listings: the fair before-and-after.
- `tagging/history.jsonl` keeps every recorded run.
- `tagging/PLAYBOOK.md` is the process: grow the key, find the biggest pattern in the misses, fix it, measure, write it up, open a pull request. A scheduled Claude Code session runs it weekly.

## Scheduled review (for a reviewing agent)

Some facts can only be settled by reading a place's own website: its real hours, whether it still exists. That work is meant to be done on a schedule by a reviewer (a person, or an agent with repo write access) and has its own file so the reviewer never edits the prose:

- **Queue:** `npm run review-queue -- --json` lists what's never been checked or is coming due, most overdue first.
- **Write:** one entry per place in `src/cities/madison/reviews.json`:

  ```json
  { "bradburys": { "checked": "2026-11-20", "source": "https://…/hours", "hours": "mo-fr 07:00-15:00; sa,su 08:00-15:00" } }
  ```

  Omit `hours` to confirm the existing ones; use `[{ "season": "04-15..10-20", "hours": "…" }]` for seasonal hours; set `"closed": true` if it's gone for good; `note` is free text for a human.
- **Gate:** `npm test` must pass. An unknown id, a missing `https` source, a bad date or unparseable hours fails the build, so a bad review can't ship.
- **Effect:** a reviewed place shows firm hours ("Open until 9 pm") for 180 days, then drops back to "Usually" and re-enters the queue.

Anything outside this contract (rewriting a story or nudge, adding a place) should come as a pull request for a person to read.

## Adding a place

Copy an entry in `places.ts`. Write the **story** (why it's distinct) and the **nudge** (exactly what to do there): specific, opinionated, practical, never promotional. Write a **why** line for each mood the place is *for*: one sentence that could only be about this place, saying nothing the story and nudge don't. Mark moods with `!` for what the place is *for*. Run `npm test`.

## Another city

Add `src/cities/<city>/` with a `City` (name, time zone, center), places and venues. Nothing in `src/core` knows about Madison.
