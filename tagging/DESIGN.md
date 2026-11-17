# Making the tagging review learn from live events

A proposal, not yet built. It extends the process in `PLAYBOOK.md`; nothing here replaces it until the owner agrees and the pieces land.

## What is wrong with the review as it stands

The weekly review is sound on one sample, but the sample doesn't move.

1. **The answer key comes from one snapshot.** Every review labels from `raw-latest.json`, a single fetch taken on review day. The key is 67 listings, all from Monday to Wednesday of one November week. Nothing from a weekend, nothing from summer, nothing the calendars said on the other six days. The morning deploy fetches every day and throws the raw listings away.
2. **The floor gets in the way of a growing key.** `baseline.json` holds aggregate scores. When the key grows with harder listings, the aggregate can fall with no change to the tagger, and the only remedy is to edit the floor by hand. That is the one move the guardrails least want a scheduled session making.
3. **Nothing asks whether a choice gets an answer.** The profile measures what share of events carry a mood, and what share answer each tap on its own. It never asks the question a person asks: *I picked Music & shows, with friends, and Offbeat. Did anything come back that is all three?*

## How big the third problem is today

Measured on 2026-11-17 with the real matcher, over every tile × companion × vibe (9 × 5 × 7 = 315 combinations).

**On the answer key, with time taken out of it.** For each combination, run the matcher on each labelled event twice: once with the hand labels, once with the tagger's tags.

| | combinations |
| --- | --- |
| the labelled events should answer | 199 |
| …and the tagger's tags answer none of them | **81 (41%)** |
| the tagger answers when the labels say nothing should | 0 |

By vibe, combinations that are blind (should answer / do answer none):

| Offbeat | Active | Upbeat | Romantic | any vibe | Chill | Curious |
| --- | --- | --- | --- | --- | --- | --- |
| 24 of 24 | 20 of 20 | 11 of 30 | 10 of 35 | 6 of 35 | 5 of 30 | 5 of 25 |

By tile: Something odd 25 of 25, Drinks 16 of 24, Play 15 of 35, Music & shows 10 of 35, Local today 10 of 35. Drinks is blind because a band in a bar never carries `drink`, so a Drinks request can't reach any of the bar gigs.

**Live, on that week's 290 events.** 1,575 requests: each combination at five times (Tuesday 6:30pm, Friday 7pm, Saturday 1pm, Saturday 7:30pm, Sunday 11am). Every request came back with picks, so "something shows up" is true in the trivial sense: the places list always fills the seats. But for the five tiles where events matter (Music & shows, Local today, Play, Art & ideas, Something odd), **628 of 875 requests had no event that fits both the tile and the vibe**. For Active and Offbeat that was all of them. A person who asks for an offbeat night of music this week gets music, but never offbeat music, though the calendars had a sea-shanty sing and belly dance in a bar.

So the share of events that carry *some* tag is the wrong thing to watch. It can look healthy while whole combinations go dark.

## The design in one paragraph

Keep every listing the calendars show, every day, with the tags it was published with. Build the answer key from that growing archive, partly at random (to measure the tagger honestly) and partly where it is weakest (to improve it), so it widens across days of the week and seasons. Replace the aggregate floor with **locks**: every decision the tagger gets right on the key, and every combination it answers, is locked, and a change may not break one without saying so and paying it back elsewhere. Run the combinations through the real matcher two ways: on the key, as a gate in `npm test`, and on the day's live events, as a monitor whose dark spots become next week's labelling queue. A daily job gathers, a weekly session improves, and a monthly session checks the checkers.

## Part 1: live listings feed the key

### Keep everything (daily, no model)

The deploy already fetches every morning. Have it also write the raw listings (`npm run events -- --raw`) and hand them to a small job that appends the new ones to an archive:

- One file per month, `tagging/archive/2026-11.jsonl`. One line per listing: the raw listing, the day it was first seen, and the tags it was published with (category, setting, kids, drop-in, moods, or the reason it was dropped).
- De-duplicated by URL. Each listing also gets a **series key** (title and venue, normalised), so a weekly trivia night is one series, not fifty listings.
- Kept on its own branch, `tagging-data`, so `main`'s history stays about the app. Roughly 150 KB a week, under 10 MB a year.

The tags *as published* matter. They let the review measure what people actually saw, not what today's rules would have shown them.

### Label from the archive, not from a snapshot

Each weekly review labels about 25 listings from what the archive gathered since the last review:

- **10 at random, chosen by the script, not the reviewer.** `npm run tagging -- --sample` draws them, seeded by the date, at most one per series, spread across sources and days. Their labels carry `"sample": "random"`. These are the honest measure: the session that labels is also the one graded, so it must not be the one choosing what gets graded.
- **10 to 15 targeted.** These come from where the tagger is weakest: the dark combinations from the live monitor (below), listings dropped as "can't tell what it is", events with no mood at all, and venues new to the archive. Labels carry `"sample": "targeted"`.
- A quarter of each group goes to holdout, as now.

Two numbers come out of this that the review can't get today:

- **Live accuracy:** the key's scores on the random labels only, using the tags as published. This is how well the tagging served real people that week. It is the number to read for trend, month on month.
- **Key accuracy:** the scores on everything, with today's rules. This is the number the review tunes.

Because old labels stay in the key forever, a June festival labelled in June still guards against a November rule that would break it. That is the floor for "other events".

### Re-tag the whole archive on every change

Before a pull request, run the changed rules over every listing in the archive, thousands of them across seasons, labelled or not, and report what moved: how many listings changed keep or drop, kind, setting, or moods, broken down by source and month. The reviewer then reads 10 changed listings drawn at random by the script, and labels each one before looking at either version. Those labels join the key. This is how a change gets checked against events nobody has labelled yet, and how the key keeps growing from live data. A rule meant to fix social dances that also moves 300 lectures shows up here before it ships.

## Part 2: locks instead of an aggregate floor

`baseline.json` becomes a record of what the tagger gets right on the key, made from the scores rather than written by hand:

- **Field locks.** For every item where `keep`, `category`, `setting`, `kids` or `dropIn` is right, that item-field is locked.
- **Mood locks.** For every item and every mood, a right call is locked, whether the mood is rightly given or rightly withheld. So precision is protected as well as recall: a rule that starts tagging cello recitals "lively" breaks a lock.
- **Combination locks.** Every combination the key's labelled events answer with the tagger's tags (see Part 3) is locked.

`npm test` fails if any lock breaks. A change may break locks only by naming each one in `tagging/accepted.json` with a reason, and only if it fixes more than it breaks, separately on dev and on holdout. The pull request lists every accepted break for a person to read. For holdout, the test reports counts, not which items, so the reviewer can't tune to them.

New labels arrive unlocked. They can't fail anything until the tagger first gets them right. That ends hand edits to the floor: adding a hard listing to the key never fails the build, and fixing it locks it. `--raise-floor` becomes `--lock`. The aggregate scores stay in the report and in `history.jsonl` for reading progress, but they no longer gate anything.

The existing unit tests in `tests/events.test.ts` stay as the **sentinels**: a case each rule must catch and a near miss it must not. They are the hard floor that no `accepted.json` entry can waive.

## Part 3: does each combination get an answer?

### The grid

Every tile × companion × vibe: 315 combinations, built the way the page builds them (`asks.ts`, `vibes.ts`, and the merging in `app.tsx`'s `ask`). A combination **answers** with an event when the real matcher picks it, it is not a stretch, and, if a vibe was chosen, it fits the vibe. Measuring through `match()` itself, not a copy of its rules, means the grid reports what a person would see.

### On the key: a gate (runs in `npm test`)

For each combination, count the labelled events that answer it using the hand labels (**should**) and using the tagger's tags (**do**), with the time window taken out (each event is asked about just before it starts):

- **Combination recall:** of combinations with should > 0, the share with do > 0. Today 118 of 199 (59%).
- **Combination precision:** of combinations with do > 0, the share where what the tagger offers is also what the labels offer. Today no combination is answered wrongly.
- **Blind combinations:** should > 0 and do = 0. Listed in the report, worst first.

Answered combinations are locked (Part 2). This is the floor for "when I pick this type with this mood, something shows up", and it doesn't depend on what happens to be on this week, so it can gate a merge without being flaky.

### Live: a monitor (runs daily)

Each morning, after the fetch, run the grid on the day's real events at a fixed set of times over the coming week (weekday evening, Friday night, Saturday afternoon and evening, Sunday morning). For each combination and time, record the picks, the events among them, and the events that fit both tile and vibe. Append a summary to `tagging/live.jsonl` on the data branch.

Live supply varies (some weeks there really is no offbeat music), so this never gates a merge. It does two things:

1. **It separates a tagging gap from a supply gap.** A combination dark live but answered on the key is probably a supply gap. One dark live *and* blind on the key is a tagging gap. For each dark combination the job lists the near misses: events that answer the tile but not the vibe, or the vibe but not the tile.
2. **It fills the labelling queue.** Those near misses go to the top of next week's targeted labels. The labels show whether they truly belong, those that do become should > 0 on the key, and the gate takes over from there. That is the loop: dark live → labelled → blind on the key → fixed → locked.

Some dark combinations aren't tagging at all: the vibe is a lean rather than a wall, so Music & shows + Active still returns music, just not active music, and two of three seats is the most events can take. Those are the matcher's decisions, out of bounds for a tagging review. The report keeps them in a separate list, "for a person: the matcher", so they are seen without being "fixed" from the wrong side.

### Weighting by what people ask for

At first every combination counts the same, with the five event-heavy tiles reported first. The collector already keeps typed requests, and every typed request that came back with no picks is a real "nothing showed up". Those are parsed and added to the grid as extra rows. A later, optional step is to count taps (tile, companion, vibe; no text, no time finer than the day) so the report can weight combinations by how often they are chosen. That changes what the site sends, so it is the owner's call.

## Part 4: the schedule

| When | Who | What | Gates anything? |
| --- | --- | --- | --- |
| Every morning, after the deploy's fetch | GitHub Actions, no model | Archive the day's raw listings with their published tags. Run the profile and the live grid. Append to `live.jsonl`. If a calendar returns nothing, or coverage, "can't classify", or the number of dark combinations moves well past its four-week range, open or update one "tagging watch" issue. | No |
| Every Monday (the existing task) | Scheduled Claude session | The playbook, changed as follows. Read the week's `live.jsonl` and dark combinations first. Label 10 random (script-drawn) and 10 to 15 targeted listings from the archive. Fix 1 to 3 patterns, choosing by blind combinations as well as by misses. Re-tag the archive and label 10 changed listings. Pass the sentinels, the locks and `npm run build`. Lock. Open a pull request. | Its pull request must pass `npm test`; a person merges |
| First Monday of the month | Scheduled Claude session (new) | Check the checkers. Re-label 10 random existing items blind and report how often the new label disagrees with the old one: that is the labeller's own consistency, and any disagreement goes to the owner rather than being settled by the session. Report live accuracy and combination recall month on month. Retire combinations that have had no supply on the key or live for three months. Say whether the rules have stopped improving, which is when tagging by a language model becomes worth the API key. | No: it reports, in a pull request or an issue |

Each layer catches what the one below it misses. The daily job is cheap and dumb and never sleeps. The weekly session changes things, but only inside the locks. The monthly session watches for the weekly one drifting: grading itself kindly, labelling to fit its rules, or chasing combinations nobody asks for.

### What stops it from fooling itself

- Random labels are drawn by the script and measured apart from targeted ones, so the trend line can't be bent by choosing easy listings.
- Labels are written before the reviewer looks at the tagger's output, as now. For the churn sample, before looking at either version.
- Locks only ratchet. Breaking one needs a written reason, a net gain on both splits, and a person's merge.
- Holdout failures are reported as counts.
- The monthly consistency check, plus each pull request's list of least-certain labels, keeps a person in the loop on the standard itself.

## Building it, in order

1. **Measurement, one pull request.** Combination grading in `src/core/tagging.ts` (should, do, blind, precision; through `match()`). The live grid and dark combinations in `npm run tagging`. Locks and `accepted.json` replacing the aggregate floor in `tests/tagging.test.ts`, with today's key locked as the starting point. `sample` on golden items, `--sample` and `--churn` in the report script. No change to what users see.
2. **The archive, one pull request.** `--raw` in the deploy's events step; a job with write access to `tagging-data` only, which appends and runs the live monitor. The deploy keeps read-only access to `main`.
3. **The schedule.** Update the weekly task's instructions and `PLAYBOOK.md` to match; create the monthly task.
4. **Later, each the owner's decision:** counting taps for weighting; tagging by a model, judged against this same key.

## Decisions for the owner

- **Where the archive lives:** a `tagging-data` branch (recommended), committed to `main`, or Actions artifacts (simplest, but GitHub deletes them after 90 days, which defeats the purpose).
- **Write access for one workflow job**, to that branch only.
- **Whether to count taps** for weighting, a change to what the site sends.
- **Whether the monthly check reports** by pull request, by issue, or both.
