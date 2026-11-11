import { applyReviews, type Reviews } from '../../core/reviews';
import type { City, Option } from '../../core/types';
import { PLACES } from './places';
import reviewData from './reviews.json';
export { VENUES as venues } from './venues';

export const city: City = {
  id: 'madison',
  name: 'Madison',
  label: 'Madison, WI',
  tz: 'America/Chicago',
  center: { lat: 43.0747, lng: -89.3841 },
  centerName: 'the Capitol Square',
};

export const reviews = reviewData as Reviews;

/** The curated list with the latest reviews applied. */
export const places: Option[] = applyReviews(PLACES, reviews, Date.now());
