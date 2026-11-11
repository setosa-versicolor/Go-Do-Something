import { applyReviews, type Reviews } from '../../core/reviews';
import type { City, Option } from '../../core/types';
import { PLACES } from './places';
import reviewData from './reviews.json';
export { VENUES as venues } from './venues';
export { shape } from './shape';

export const city: City = {
  id: 'madison',
  name: 'Madison',
  label: 'Madison, WI',
  tz: 'America/Chicago',
  center: { lat: 43.0747, lng: -89.3841 },
  centerName: 'the Capitol Square',
  // Rough middles of each area; they only feed travel-time estimates.
  starts: [
    { name: 'campus', lat: 43.0755, lng: -89.404 },
    { name: 'Willy Street', lat: 43.0815, lng: -89.366 },
    { name: 'Atwood', lat: 43.0925, lng: -89.35 },
    { name: 'Monroe Street', lat: 43.0655, lng: -89.4175 },
    { name: 'Hilldale', lat: 43.0735, lng: -89.452 },
    { name: 'the north side', lat: 43.125, lng: -89.365 },
    { name: 'the south side', lat: 43.045, lng: -89.394 },
    { name: 'the east side', lat: 43.1235, lng: -89.305 },
    { name: 'the west side', lat: 43.058, lng: -89.503 },
    { name: 'Middleton', lat: 43.097, lng: -89.504 },
    { name: 'Monona', lat: 43.062, lng: -89.334 },
    { name: 'Fitchburg', lat: 43.007, lng: -89.43 },
    { name: 'Verona', lat: 42.99, lng: -89.533 },
    { name: 'Sun Prairie', lat: 43.183, lng: -89.213 },
  ],
};

export const reviews = reviewData as Reviews;

/** The curated list with the latest reviews applied. */
export const places: Option[] = applyReviews(PLACES, reviews, Date.now());
