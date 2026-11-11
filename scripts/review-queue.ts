// What's due for a website check, most overdue first. `npm run review-queue`
// (add --json for a scheduled reviewer to read).

import { reviews } from '../src/cities/madison';
import { PLACES } from '../src/cities/madison/places';
import { reviewQueue } from '../src/core/reviews';

const queue = reviewQueue(PLACES, reviews, Date.now());
if (process.argv.includes('--json')) console.log(JSON.stringify(queue, null, 1));
else for (const q of queue) console.log(`${(q.lastChecked ?? 'never').padEnd(11)} ${q.id.padEnd(24)} ${q.name}`);
