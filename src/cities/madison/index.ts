import type { City, Option } from '../../core/types';
import { PLACES } from './places';
export { VENUES as venues } from './venues';

export const city: City = {
  id: 'madison',
  name: 'Madison',
  label: 'Madison, WI',
  tz: 'America/Chicago',
  center: { lat: 43.0747, lng: -89.3841 },
  centerName: 'the Capitol Square',
};

export const places: Option[] = PLACES;
