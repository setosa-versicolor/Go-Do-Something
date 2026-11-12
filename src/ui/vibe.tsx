// The vibe picker: one small character acting out each feel. The drawings are
// inline SVG moved by CSS (styles.css, "vibes"), and hold still under
// reduced motion.

import { useEffect, useRef } from 'preact/hooks';
import { VIBES } from '../core/vibes';

const HEART = 'M0 -1.6C-2.2 -5 -6 -1.6 0 3.4C6 -1.6 2.2 -5 0 -1.6Z';
const STAR = 'M0 -5L1.2 -1.2L5 0L1.2 1.2L0 5L-1.2 1.2L-5 0L-1.2 -1.2Z';

/** A 64×64 drawing for a vibe id ('' is "anything goes"). */
export function VibeIcon({ id }: { id: string }) {
  const eyes = <g class="ink"><circle cx="26" cy="37" r="2.2" /><circle cx="38" cy="37" r="2.2" /></g>;
  const smile = <path class="line" d="M27 43q5 4 10 0" />;
  const body = <ellipse class="body" cx="32" cy="40" rx="17" ry="15" />;
  const art: Record<string, preact.JSX.Element> = {
    '': (
      <g>
        {[[12, 16, 0], [52, 20, 1], [44, 8, 2], [18, 6, 3]].map(([x, y, i]) => (
          <g transform={`translate(${x} ${y})`}><path class="spark" style={{ animationDelay: `${i! * 0.4}s` }} d={STAR} /></g>
        ))}
        {body}{eyes}{smile}
      </g>
    ),
    chill: (
      <g>
        <g class="breathe">
          <ellipse class="body" cx="30" cy="46" rx="21" ry="11" />
          <path class="line" d="M19 45q3 2.4 6 0M31 45q3 2.4 6 0" />
        </g>
        {[[44, 30, 9], [50, 21, 11], [56, 11, 13]].map(([x, y, s], i) => (
          <text class="zed" x={x} y={y} font-size={s} style={{ animationDelay: `${i * 0.5}s` }}>z</text>
        ))}
      </g>
    ),
    upbeat: (
      <g>
        <text class="note n1" x="6" y="20" font-size="14">♪</text>
        <text class="note n2" x="48" y="16" font-size="16">♫</text>
        <g class="dance">
          <path class="limb" d="M17 36L8 24M47 36L56 24" />
          {body}{eyes}
          <path class="ink" d="M26 42q6 7 12 0Z" />
        </g>
      </g>
    ),
    romantic: (
      <g>
        <g transform="translate(32 13)"><path class="heart beat" d={HEART} transform="scale(2.2)" /></g>
        <g class="sway">
          {body}
          <g transform="translate(26 37)"><path class="heart" d={HEART} /></g>
          <g transform="translate(38 37)"><path class="heart" d={HEART} /></g>
          {smile}
          <circle class="blush" cx="20" cy="43" r="2.6" /><circle class="blush" cx="44" cy="43" r="2.6" />
        </g>
      </g>
    ),
    curious: (
      <g>
        <text class="ask" x="46" y="20" font-size="20">?</text>
        <g class="tilt">
          {body}
          <circle class="white" cx="25" cy="37" r="5" /><circle class="white" cx="39" cy="37" r="5" />
          <g class="look ink"><circle cx="25" cy="37" r="2.2" /><circle cx="39" cy="37" r="2.2" /></g>
          <circle class="ink" cx="32" cy="46" r="1.8" />
        </g>
      </g>
    ),
    active: (
      <g>
        <ellipse class="shadow" cx="32" cy="59" rx="14" ry="2.5" />
        <path class="whoosh" d="M8 34h7M6 41h9M49 34h7M49 41h9" />
        <g class="jump">
          {body}
          <path class="band" d="M16 33q16 -7 32 0" />
          {eyes}{smile}
        </g>
      </g>
    ),
    offbeat: (
      <g class="wobble">
        <path class="limb" d="M32 25V13" />
        <circle class="blink" cx="32" cy="11" r="3.2" />
        {body}
        <circle class="white" cx="32" cy="38" r="7" />
        <circle class="look ink" cx="32" cy="38" r="3" />
        <path class="line" d="M24 49l3 -2l3 2l3 -2l3 2l3 -2" />
      </g>
    ),
  };
  return <svg class={`vibe-icon v-${id || 'any'}`} viewBox="0 0 64 64" aria-hidden="true">{art[id] ?? art['']}</svg>;
}

export const vibeLabel = (id: string) => VIBES.find((v) => v.id === id)?.label.toLowerCase() ?? 'anything goes';

export function VibeSheet(props: { value: string; onPick: (id: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const all = [{ id: '', label: 'Anything goes', blurb: 'no preference' }, ...VIBES];
  return (
    <dialog ref={ref} class="sheet vibes" aria-label="Choose a vibe" onClose={props.onClose} onClick={(e) => { if (e.target === ref.current) props.onClose(); }}>
      <div class="sheet-body">
        <h2>What's the vibe?</h2>
        <p class="vibes-sub">It leans the picks one way. It never rules anything out.</p>
        <div class="vibe-grid">
          {all.map((v, i) => (
            <button class="vibe" style={{ '--i': i }} aria-pressed={props.value === v.id} onClick={() => props.onPick(v.id)}>
              <VibeIcon id={v.id} />
              <strong>{v.label}</strong>
              <span>{v.blurb}</span>
            </button>
          ))}
        </div>
      </div>
    </dialog>
  );
}
