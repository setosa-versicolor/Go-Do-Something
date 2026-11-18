# The tagging review

Every loaded event is tagged before the app can offer it: what kind of thing it is, the moods it answers, indoors or out, for kids or not, whether you can turn up late, whether it's a one-off. If the tags are wrong, the right event never reaches the person who asked for it. This file is the process for making the tagging better, a little at a time, on a schedule, with numbers to show for it.

It is written for whoever runs the review: a scheduled Claude Code session, or a person. Read all of it before changing anything.

## What is measured

`npm run tagging` prints all of it. Two kinds of number.

**Accuracy**, against the answer key (`tagging/golden.json`): real listings, each labelled by hand with what it should come out as.

| Number | Meaning |
| --- | --- |
| keep or drop | Share of listings where the decision to offer it at all was right. |
| kind, in/out, kids, turn-up | Of the listings rightly kept, the share with that field right. |
| mood precision | Of the moods the tagger gave, the share that belong. Low means over-tagging (everything is "lively"). |
| mood recall | Of the moods that belong, the share the tagger gave. Low means blind spots (nothing is ever "odd"). |
| mood F1 | The two combined. The headline number. |

The key is split: `dev` listings are for tuning against, `holdout` listings are only for judging. A change that lifts dev and not holdout has memorised the key, not learned anything.

**The week's profile**, over `tagging/raw-latest.json` (every listing the calendars gave, before judging):

| Number | Meaning | Healthy direction |
| --- | --- | --- |
| coverage | Share of listings that became events. | Up, but only by keeping things worth going to. Filler stays out. |
| couldn't classify | Share dropped because nothing said what it was. The tagger's own blind spot. | Down. |
| mood diversity | 0 = every event carries the same moods, 1 = evenly spread. | Up. |
| commonest mood | The share of events carrying the most common mood. | Down: a mood on 90% of events tells them apart from nothing. |
| silent moods | Moods no event carries. Each is a tile or a vibe that can never be answered with an event. | Fewer, when the week's listings really contain such things. |
| reach | For each tile, companion and vibe, the share of events that answer it. | No tap at 0% when the listings contain an answer; none near 100% either. |

Every run can be appended to `tagging/history.jsonl` (`--record`), which is how progress over months is read.

## Grading fairly: same listings, before and after

A score only means something next to another score taken on **the same listings with the same labels**. Growing the key with harder listings lowers the aggregate with no change to the tagger, so "this week's number against last week's number" mixes up two things: the rules changing and the test changing. Every comparison in a review is therefore one of two kinds, and never anything else:

- **Old rules against new rules, on today's key.** `npm run tagging -- --compare main` grades the rules as they are on `main` against the same answer key, labels and all, beside the rules now. This is the before-and-after. Dev should improve; holdout must not get worse on any of keep, kind, in/out, kids, turn-up or mood F1.
- **The floor, on the items it was set on.** See below.

Never judge a change by comparing today's scores with the floor numbers, or with a past review's table, when the key has grown in between. And with only 20-odd holdout listings, one listing moves a holdout number by about 5 points: read a small holdout change as one or two listings, and say which.

## The floor

`tagging/baseline.json` holds the lowest acceptable accuracy on each set, **and the list of answer-key items it was set on** (`items`). `npm test` grades the floor only on those items, so adding new listings to the key, however hard, can never fail it. A listing joins the floor the next time the floor is set.

`npm run tagging -- --raise-floor` sets it: it first checks the tagger still meets the old floor on the old items (and refuses if not), then sets the floor to today's scores over the whole key and records the new item list. When the key has gained hard listings, some aggregate numbers come out lower than the old ones. That is expected and correct: they are numbers over a bigger, harder set, and the old items are still held to the old numbers by the check before. Never edit the numbers or the item list by hand; the guard rejects a floor number that isn't the tagger's real score.

## One review, step by step

1. **Refresh the listings.** `npm run events -- --dry --raw tagging/raw-latest.json`. If the Isthmus feed stops early (it says so), go on with what was read and note it.
2. **Read where things stand.** `npm run tagging -- --misses`. Read the last few entries of `tagging/history.jsonl` and the notes at the bottom of this file.
3. **Grow the answer key by about 20 listings.** Pick from `raw-latest.json` listings that are not already in the key. Do not pick at random only: half at random, half from where the tagger is weakest (a silent mood, a tap with 0% reach, the "couldn't classify" drops, kinds of event the key has few of). Label each one as a thoughtful local would, following "How to label" below. Give every fourth one `"split": "holdout"`. Leave out anything you can't call either way.
4. **Find the biggest pattern in the misses**, not the biggest single miss. "Every social dance is tagged as a show to watch" is a pattern. "This one band has an odd name" is not.
5. **Fix that pattern** in `src/core/events.ts` (the kinds, the cues) or `src/cities/madison/venues.ts` (what a venue is). One to three patterns per review. Prefer a rule that reads as common sense to one that only fits the sample. Add a unit test in `tests/events.test.ts` for each new rule, with a case it must catch and a near-miss it must not.
6. **Measure again**, fairly: `npm run tagging -- --compare main`, which grades the old rules and the new on the same, grown key. A change is good if dev improves **and holdout does not get worse** than the old rules on the same listings. If holdout falls, the rule is too narrow or too greedy: rework it or drop it. Do not compare with the floor numbers or the last review's table (see "Grading fairly"). If the floor tests in `npm test` fail, the new rules broke something on the listings the floor was set on: look at those misses, they are real.
7. **Check nothing else broke.** `npm test` and `npm run build` must pass. Run `npm run explain -- "<a request the change should affect>"` for two or three requests and read the picks as a person would.
8. **Record and set the floor.** `npm run tagging -- --record --raise-floor`. The floor now covers the listings you added; some of its numbers may come out lower than before because those listings are harder. Say so in the write-up, with the `--compare` table that shows the rules themselves did not get worse.
9. **Write it up** at the bottom of this file under "Review notes": the date, what the numbers were and are, the pattern fixed, what you looked at and left alone, and what the next review should look at first. Keep each entry short.
10. **Open a pull request**, do not push to `main`. Title it "Tagging review, <date>". In the body: the before and after table, the patterns fixed, every label you added that you were least sure of (so a person can check them), and anything you think needs a human decision. A person merges it. When the review runs on its schedule (`.github/workflows/tagging-review.yml`), the reviewer writes the body to `.review/PR_BODY.md` and the workflow opens the pull request, after `npm run review-guard` has checked the guardrails below and the tests and build have passed. The guard rejects a change to any file a review may not touch; new rules that fall below the old floor on the items it was set on; a floor number that isn't the tagger's real score, or an item dropped from the floor; holdout doing worse than the old rules on the same listings; an answer key item removed or moved between dev and holdout; and a rewritten history. It puts the old-rules-against-new table in the pull request, and lists every existing label that changed, for a person to check.

## How to label

A label says what a thoughtful local would say about the listing, not what the current rules produce. Never look at what the tagger outputs before labelling.

- **keep**: would you tell a friend about it as a thing to go and do this week? Not kept, by standing decision: classes and workshops you must register for, meetings, support groups, fundraisers, auditions and rehearsals, trivia, bingo, karaoke, knitting and similar standing socials, anything online, anything for members or staff only, anything more than 12 miles out. If you think one of these decisions is wrong, say so in the pull request; do not label against it.
- **category**: the app's own list (`CATEGORIES` in `src/core/types.ts`). A social dance, a board game night or a Lego night is `play`: something you do. A dance performance is `show`: something you watch.
- **setting**: `out` only if you would be outdoors for it. A rooftop in November is not.
- **kids**: 2 if it is put on for children or families, 0 if it is not for them (a bar at night, an R-rated film, anything 21+), 1 otherwise. Leave it out if the listing doesn't let you tell.
- **dropIn**: true if arriving an hour in is fine (an open mic, a DJ night, a band in a bar, a fair), false if you need to be there at the start (a concert hall, a film, a play, a lecture).
- **moods**: every mood from `MOODS` that this event is genuinely an answer to, and no others. The test for each: if someone tapped that mood, would this be a good thing to show them? "date" is not a default: a lecture on the Sahel is not a date. "lively" is not a default either: a cello recital is not lively. Use "odd" for what a person wouldn't have thought of (a sea shanty sing, belly dance in a 28-seat bar), "move" for what gets you moving, "drink" where drinking is part of it, "cozy" for warm, seated and unhurried.
- **why**: one sentence. The next reviewer reads it to learn the standard.

Changing an existing label is allowed when it is plainly wrong. Say which and why in the pull request. Never change a label, or move a listing between dev and holdout, to make a score go up.

## Guardrails

- The answer key is the standard, and you are also the one being graded against it. The honest way through that: label before you look at the tagger's output, hold a quarter out, and list your least certain labels for a person to check.
- Never edit the floor by hand. Set it only with `--raise-floor`. Adding hard listings to the key is not a reason to stop a review: the floor ignores them until it is set again, and the fair test is `--compare main`. If you corrected a plainly wrong label and that moves the old floor out of reach, stop and say so; that is for a person.
- Hard listings belong in the key, in whichever split the every-fourth rule puts them. Never leave one out, or choose its split, because of what it will do to a score.
- Do not touch the places list, the matcher's scoring (`src/core/match.ts`) or anything in `src/ui/` in a tagging review. If the numbers say the matcher should use the tags differently, write that up for a person.
- Do not loosen "keep" to raise coverage. Coverage is worth nothing if what's added is filler.
- Keep the rules readable. If a pattern can't be caught by a rule a person could explain, write it down as a case for tagging by a language model (see below) and leave it.

## Where this is heading

Keyword rules have a ceiling. When the misses that remain are ones no readable rule can catch (irony in a title, a venue that changes what an event is, a description that implies and doesn't say), the next step is to have a model read each new listing in the morning job and return these same tags, with the rules as the fallback. The answer key and these numbers are what will tell whether that is better, and by how much. It needs an Anthropic API key stored as a repository secret, which is the owner's decision.

## Review notes

### 2026-11-16: the baseline

First reading, taken when this process was set up. 67 listings labelled (51 dev, 16 holdout), all from the week of November 16; the Isthmus feed stopped early that day, so they are Monday to Wednesday listings plus the UW and Children's Museum calendars. Later reviews should widen the key to weekends first.

| set | keep or drop | kind | in/out | kids | turn-up | mood precision | mood recall | mood F1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dev | 78% | 86% | 100% | 93% | 93% | 71% | 58% | 64% |
| holdout | 94% | 90% | 100% | 100% | 75% | 82% | 69% | 75% |

Patterns seen and not yet fixed, biggest first:

1. **Social dances are dropped or called shows.** Contra, salsa, tango, swing, English country: either lost to the word "lesson"/"club"/"practice" in the filler list, or tagged as a show to watch. They are `play`, with `move`.
2. **"date" and "lively" are defaults.** Every music and show listing gets both. A recital isn't lively; an open mic isn't a date.
3. **Bar music never carries "drink".** Only DJ nights do.
4. **Nothing is ever "odd".** Sea shanty sings, belly dance, a community choir, Lego night.
5. **Lectures are lost to stray words.** "RSVP for Zoom option" drops an in-person lecture as online; a curator's "tour" is filler.
6. **Films rated R are "fine with kids"**, and films are dropped when the description mentions a "club" or a "class" in passing.
7. **Children's Museum programs all carry "cozy"** and never "move" or "learn", because the source presets one set of moods for everything.
8. **Games and making** (board games in a brewery, Lego night) have no kind of their own.

### 2026-11-17: social dances, drinks at the bar, children's programs; and a fairer floor

This review ran on its schedule and stopped: its five new holdout listings were harder than the first sixteen, so the holdout aggregate fell below the old floor (keep 93.8% → 85.7%, turn-up 75% → 72.7%) although the new rules did no harm on the original listings. The owner landed its work by hand, and changed how scores are compared so it doesn't happen again (see "Grading fairly" and "The floor" above).

Key grown by 22 listings (17 dev, 5 holdout): 10 at random, 12 at weak spots. Old rules against new, on the same 89 listings:

| set | rules | keep | kind | in/out | kids | turn-up | mood P | mood R | mood F1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dev (68) | before | 81% | 82% | 100% | 96% | 86% | 69% | 57% | 62% |
| dev (68) | after | 85% | 94% | 100% | 96% | 96% | 83% | 80% | 82% |
| holdout (21) | before | 81% | 83% | 100% | 100% | 70% | 78% | 66% | 71% |
| holdout (21) | after | 86% | 92% | 100% | 100% | 73% | 85% | 89% | 87% |

Fixed (patterns 1, 3 and 7 of the baseline list):

- **Social dances** (contra, English country, folk, polka, cèilidh, square, swing, tango, milonga, salsa, ballroom, anything with an "open dance") are `play` with `move`, dropped in on; the old folk forms are also `odd`. "club" and "practice" no longer drop them as filler; "class" still does.
- **Something you drop in on at a bar carries `drink`**: the band, the open mic, the polka night.
- **Children's Museum programs** get `kids` plus what their own description says (moving, music, science, stories), not the calendar's blanket `cozy`.

Label corrected: 2026-11-16/23, the West Coast Swing Club ("Lesson 6:15 pm, open dance 7-9 pm"), from not drop-in to drop-in. Arriving an hour in, you still get the open dance, and the other three lesson-then-open-dance nights in the key were labelled drop-in.

Left alone, for the owner: the Majestic is `bar: true` in `venues.ts`, which makes its concerts drop-in and now `drink`; the label for Fox Stevenson there says a concert hall. The only evidence is a holdout listing, so it wasn't touched.

Next: `drink` went from 6% to 38% of the week's events; check a sample of what now carries it. Then pattern 2, "lively" (87% of events) and "date" (81%) as defaults. The two hardest new holdout listings ("Saideira Pagode, *Brazilian.*" at Working Draft, an exhibition-opening reception at the Union gallery) are dropped as "can't tell what it is"; a rule for them has to come from dev listings like them, not from these.
