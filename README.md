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

A static site. No server, no database, no accounts, no API keys.

| Piece | Where | Notes |
| --- | --- | --- |
| Places | `src/cities/madison/places.ts` | Hand-written. The content is the product. |
| Events | `public/events.json` | Rebuilt every morning from public calendars. See "The events process". |
| Weather | Open-Meteo, from the browser | Free, no key. Sunrise and sunset are computed locally. |
| Matching | `src/core/match.ts` | One pure function. The only copy of the logic. |
| Memory | `localStorage` | Stays on the device. Location is used in memory only and never stored. |
| Deploy | `.github/workflows/deploy.yml` | GitHub Pages, on push to `main` and every morning (to refresh events). Cost: nothing. |

To turn on deploys: repo Settings → Pages → Source: GitHub Actions.

## Two tiers of places

1. **The list** (`src/cities/madison/places*.ts`): hand-written, with a story and a nudge for each. This is the product. It always comes first.
2. **The map** (`public/nearby.json`, built by `npm run nearby`): independent restaurants, cafés, bars, bakeries and ice cream shops from OpenStreetMap that have a name and opening hours we can represent exactly. Chains and anything already on the list are dropped.

The map is only ever used to fill seats the list couldn't: if three hand-written picks fit, no map place is shown. A "Local today" request never borrows from the map: those are ordinary restaurants, not things happening that day. A map place passes the same gates (open, reachable, in time), is tagged "From the map", carries no opinion, and its hours are always shown as "usually open". When any are used, the page says so. The logic is in `match()` (`world.fallback`) and `src/core/nearby.ts`.

## The model

The top of the page is a small 3D model of Madison (`src/ui/scene.ts`, three.js, loaded on demand), under the real sky for the time, season and weather. One unit is one mile, so a place's coordinates drop straight onto it.

What's real: the shorelines of the four lakes, the Yahara River and the main roads come from OpenStreetMap, simplified and stored as miles from the Capitol in `src/cities/madison/shape.json`. The landmarks (Camp Randall, the Kohl Center, Monona Terrace, the Union Terrace, Bascom Hill, Olbrich, the airport, the big parks and preserves) are placed by hand in `shape.ts`. The airport is drawn from its real runways, taxiways, aprons and terminal footprint (also OpenStreetMap), with a plane that takes off down the long runway, circles the city and lands. Roads that cross open water ride a raised causeway. The map supplies each road in short pieces; the model joins them end to end and rounds the bends, so a causeway is drawn as one curved strip. Downtown is packed block to block from shore to shore, as it is from the air: mid-rises around the Square, three and four stories beyond them, low roofs out to where the houses begin, all with windows that light up at night and the dome clear above them. About 25 recognisable buildings (the State Office Building, the Hilton, Monona Terrace, the Blount Street stacks, the campus dorm towers, Van Hise) stand at their real addresses, with sizes and colours judged by eye from photographs. The Capitol is drawn larger than life, so buildings on the Square are nudged out to its edge. What's invented: every individual house, tree, barn and downtown block is scattered by a seeded random number generator inside those real outlines, so the town looks the same on every visit but no single building is a real one.

- Drag to look around. Pinch, ctrl-scroll or use the + and − buttons to zoom.
- Tap a landmark or a lake for its name; the camera flies over for a few seconds and comes back. Tap the Capitol, a sailboat, the plane or the water for a small reaction. Tap the sun or moon to run the day forward.
- Tap the balloon to ask for a surprise.
- When three picks are dealt, each stands as a numbered beacon where it really is. Tap a beacon to bring up its card; swipe the cards and the camera leans toward that pick.

The page holds back on first load: a quiet wordmark shows (straight from `index.html`, before any script) until the model has drawn and the weather is in, then the whole page fades in at once. It never waits more than about four seconds; without WebGL it shows the painted sky as soon as the weather is in.

The first visit opens with a short introduction (`src/ui/intro.tsx`): the idea of the app, one sentence at a time, over a scripted 27-second flight across the model. A tap anywhere skips it, the "?" button on the opening screen replays it, and a flag in local storage keeps it from playing twice. With reduced motion the camera holds still and the sentences simply change.

To look at the model in weather you aren't having, add `?weather=snow` (or `rain`, `storm`, `fog`, `clear`) to the URL. It changes only how the model is dressed: the header and the picks still use the real forecast.

Three things tie the model to the decision:

- **The lens.** The scene is drawn off-screen and shown through a tilt-shift blur (sharp across the middle, soft above and below), which is what makes it read as a miniature. If a device can't fill the off-screen buffer, it draws direct.
- **Routes.** In the results, a "You" marker sits where you're starting from, with an arc out to each pick and a small traveller on it, slower for the longer trips.
- **Tonight.** Off by default; the "Show key events in Madison" switch at the foot of the page turns it on. On the opening screen, a searchlight then stands over each venue with something on in the next six hours (from the events file). Tap one for the time and the name.

By season, weather and hour: leaves turn in October and come down in November; when snow is lying (an inch or more on the ground) or coming down in earnest, the ground, roofs, trees and causeway banks go white and the ploughed roads show grey against them; from December to March, when it is below 33°, the lakes freeze, the boats become ice shanties, and any snow lies on the ice; rain falls as slanting streaks, light or heavy with the forecast, darkening the streets and roughening the lakes; in a thunderstorm the sky goes to slate, the rain drives harder, the sailboats leave the water, and every several seconds a bolt comes down somewhere over town with one soft flash (none with reduced motion); in fog the haze closes in until downtown stands clear and the far shores are gone, the sun is a dim disc, and the header says "foggy"; windows, street lights and headlights come on at dusk, and fireflies come out on dry summer nights.

A beacon is only as good as the coordinate behind it. Places in the list were located from memory and are right to within a few blocks, not to the door; events are placed by their venue, or by the coordinates their feed supplies. A test fails if any place or venue lands in a lake, which is how one bad coordinate was already caught. Anything beyond about 12 miles is dropped before it gets here, and the detailed part of the model reaches a little past the edge of town.

The scene knows nothing about Madison: it builds whatever `CityShape` it is handed (`src/core/types.ts`). It's decoration over a working page: everything it does is also a button below. Without WebGL the page keeps its painted sky, and with reduced motion the model holds still.

To rebuild `shape.json`, fetch the lake polygons from Nominatim (`polygon_geojson=1`) and the `motorway|trunk|primary` ways from Overpass for the bounding box, convert to miles with `offsetMiles`, and simplify. Map data © OpenStreetMap contributors, under the Open Database License.

## How matching works

`match(request, world)` in `src/core/match.ts`, in four stages:

1. **Assess.** Hard gates decide whether this person can actually do this thing at that time: open long enough once you arrive (in the city's time zone), in season, enough daylight, weather that suits it, close enough for the time and transport you have, fine for kids if kids are along. One gate comes from the request itself: `today` (the "Local today" tile, or words like "what's on", "happening tonight", "events") keeps only what is specifically on that day, meaning dated events and markets while they are open, and rules out everything that is always there. For that request other words only lean the order, and the map tier is never used to fill seats. Every rejection is recorded with a reason.
2. **Score.** Named, additive parts: `mood`, `vibe` (the optional feel chosen in the vibe picker: chill, upbeat, romantic, curious, active or offbeat, defined in `src/core/vibes.ts`; it leans the order and never rules anything out), `moment` (sunset timing, weather, seasonal peaks, one-night events), `time`, `near`, `gem` (editorial weight), `taste` and `seen`/`been`/`skipped`/`saved` from history.
3. **Choose.** The best fit; then the best fit that is a *different kind of thing*; then a "left turn" drawn at random (seeded) from what still clears the bar.
4. **Explain.** One line per pick, the sharpest true one available, tried in this order: the moment (sunset, weather, a seasonal peak, an event you'd make), the vibe that was picked, the kind of place that was named, the mood, then a fact read straight from the place's data (a few minutes away, open late or early for the hour, free or cheap, high editorial weight, hours checked by hand in the last 60 days, the time it needs), and only then a general line from a small pool per family of place. Facts and pool lines are rotated by a hash of the place's id, so a place tends to keep its line. No two cards share a reason, and no line claims what a field doesn't back. `tests/reasons.test.ts` sweeps about 1,500 requests over the real list and fails if any one line is on more than 15% of cards; run it with `REASONS=1` to print the table.

**The second look.** If fewer than three of the things that were asked for fit the window (anything on, for "Local today"; the named kind, for a request like "Music & shows"; anything at all otherwise), the matcher looks again at that day's events and markets with two gates relaxed: a start after the window, up to 3 am, and a finish past its end. Those are offered after whatever fits the window, soonest first, each with a line on the card saying how it differs ("Later than the time you gave: it starts at 7 pm."), and the note above the cards says how many fit as asked. They take seats ahead of places that merely share the mood, so a request for music gets tonight's shows before a lively bar, but they never push out something that fits the window, and nothing is brought in when three already fit.

If fewer than three things pass, it shows fewer and says why. If nothing passes, it says that.

What the person types, taps or picks all goes through one parser (`src/core/intent.ts`): chips are just canned words. All tunable numbers live in `TUNING` at the top of `match.ts`.

It learns from a small on-device log (`src/core/history.ts`). Tapping Directions prompts a "Did you go?" check-in later; going and liking counts for much more than tapping.

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
- Not built yet: itineraries, group decisions, live conditions (beach closures, ice).

## The events process

`npm run events` (run by the deploy workflow every morning; add `-- --dry` to look without writing):

1. **Fetch** each calendar. Today: the Isthmus calendar (RSS), UW–Madison events by tag (JSON, which also carries the Wisconsin Union's films and concerts), and the Madison Children's Museum's own programs (JSON).
2. **Parse** with one small pure function per calendar in `src/core/sources.ts`.
3. **Judge** every listing in `src/core/events.ts`. It's kept only if we know where it is (a venue in `src/cities/madison/venues.ts`, or coordinates from the feed within 12 miles), can tell what kind of thing it is, and it isn't filler, sold out, cancelled or an all-day notice. The run prints how many were dropped and why.
4. **Dedupe**: same start time at the same spot is one event; the earlier calendar wins.
5. **Write** `public/events.json`. The app re-validates it and ignores it entirely if it's more than four days old.

A calendar that fails is skipped and reported; the others still publish. The quickest way to get more events through is to add venues to `venues.ts`. Run `npm run events -- --dry --venues` to see every venue whose listings were dropped this week, busiest first, with the address and coordinates from its listing page, in a form that pastes straight into the file. About 115 venues are on file; roughly half of a week's Isthmus listings now get through. The rest are at venues left out on purpose (schools, churches, private homes, towns more than 12 miles out) or are filler.

To add a calendar: write a parser in `sources.ts`, test it against a real sample, name it in `SOURCES`, and list it in `scripts/fetch-events.ts`.

Looked at and not used: Visit Madison's feed has dates but no times, so we can't honestly say when to turn up; the Wisconsin Union's own feed has titles only; Madtown Life mostly repeats Isthmus.

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

Copy an entry in `places.ts`. Write the **story** (why it's distinct) and the **nudge** (exactly what to do there): specific, opinionated, practical, never promotional. Mark moods with `!` for what the place is *for*. Run `npm test`.

## Another city

Add `src/cities/<city>/` with a `City` (name, time zone, center), places and venues. Nothing in `src/core` knows about Madison.
