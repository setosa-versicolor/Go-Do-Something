// The introduction: the idea of the app, one sentence at a time, over a slow
// flight across the model. Shown on the first visit and again from the "?"
// button. A tap anywhere (or Escape, Enter or Space) skips it.

import { useEffect, useState } from 'preact/hooks';

/** Each line and how long it stays, in seconds. The total is paced to the flyover. */
const LINES: [text: string, seconds: number][] = [
  ['There is a lot to do in Madison.', 3.2],
  ['Sometimes that can feel overwhelming.', 3.2],
  ['Give us a little information about what you’re looking for.', 3.8],
  ['We’ll help you decide.', 3.0],
  ['You get three options.', 2.8],
  ['Only three.', 2.3],
  ['That’s on purpose.', 2.7],
  ['Pick one of the three', 5.4],
];

export function Intro({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const finish = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(onDone, calm ? 0 : 700);
  };

  useEffect(() => {
    const t = setTimeout(() => (i < LINES.length - 1 ? setI(i + 1) : finish()), LINES[i]![1] * 1000);
    return () => clearTimeout(t);
  }, [i]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        finish();
      }
    };
    addEventListener('keydown', key);
    const scroll = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      removeEventListener('keydown', key);
      document.body.style.overflow = scroll;
    };
  }, []);

  const [text, seconds] = LINES[i]!;
  const last = i === LINES.length - 1;
  return (
    <button type="button" class={`intro${leaving ? ' leaving' : ''}`} onClick={finish} aria-label="Skip the introduction">
      <span class="intro-stage" aria-live="polite">
        <span class={`intro-line${last ? ' last' : ''}`} key={i} style={{ '--hold': `${seconds}s` }}>
          {text}
          {last && <strong class="intro-go">and go do something.</strong>}
        </span>
      </span>
      <span class="intro-foot" aria-hidden="true">
        <span class="intro-dots">{LINES.map((_, n) => <i class={n <= i ? 'on' : ''} />)}</span>
        <span class="intro-skip">Tap to skip</span>
      </span>
    </button>
  );
}
