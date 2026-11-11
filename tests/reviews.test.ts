import { describe, expect, it } from 'vitest';
import { applyReviews, REVIEW_GOOD_FOR, reviewQueue } from '../src/core/reviews';
import { DAY } from '../src/core/time';
import { reviews } from '../src/cities/madison';
import { PLACES } from '../src/cities/madison/places';
import { at, option } from './helpers';

const now = at(2026, 11, 11, 12);
const cafe = option({ id: 'cafe', hoursTrust: 'unverified', rules: [{ hours: 'daily 07:00-15:00' }] });
const park = option({ id: 'park', category: 'park' });
const ok = { checked: '2026-11-01', source: 'https://example.org/hours' };

describe('reviews', () => {
  it('the committed review file is valid against the committed places', () => {
    expect(() => applyReviews(PLACES, reviews, Date.now())).not.toThrow();
  });

  it('a current review makes hours solid, and can replace them', () => {
    const [confirmed] = applyReviews([cafe], { cafe: ok }, now);
    expect(confirmed).toMatchObject({ hoursTrust: 'solid', checked: '2026-11-01', rules: cafe.rules });
    const [changed] = applyReviews([cafe], { cafe: { ...ok, hours: 'mo-fr 08:00-14:00' } }, now);
    expect(changed!.rules).toEqual([{ hours: 'mo-fr 08:00-14:00' }]);
  });

  it('trust expires: an old review keeps its hours but stops vouching for them', () => {
    const [stale] = applyReviews([cafe], { cafe: { ...ok, hours: 'mo-fr 08:00-14:00' } }, now + REVIEW_GOOD_FOR + 30 * DAY);
    expect(stale).toMatchObject({ hoursTrust: 'unverified', rules: [{ hours: 'mo-fr 08:00-14:00' }] });
  });

  it('removes a place reviewed as closed for good', () => {
    expect(applyReviews([cafe, park], { cafe: { ...ok, closed: true } }, now).map((o) => o.id)).toEqual(['park']);
  });

  it('rejects a bad review outright rather than shipping it', () => {
    expect(() => applyReviews([cafe], { nowhere: ok }, now)).toThrow(/unknown place/);
    expect(() => applyReviews([cafe], { cafe: { ...ok, source: 'someone said' } }, now)).toThrow(/source/);
    expect(() => applyReviews([cafe], { cafe: { ...ok, checked: 'last week' } }, now)).toThrow(/YYYY-MM-DD/);
    expect(() => applyReviews([cafe], { cafe: { ...ok, checked: '2027-03-01' } }, now)).toThrow(/future/);
    expect(() => applyReviews([cafe], { cafe: { ...ok, hours: '9 to 5' } }, now)).toThrow();
  });

  it('queues what has never been checked or is nearly due, and skips rule-based hours', () => {
    const q = (r = {}) => reviewQueue([cafe, park], r, now).map((x) => x.id);
    expect(q()).toEqual(['cafe']);
    expect(q({ cafe: ok })).toEqual([]);
    expect(q({ cafe: { ...ok, checked: '2026-05-01' } })).toEqual(['cafe']);
  });
});
