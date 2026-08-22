'use client';

// Ported from `quant-buddy.js` in the design canvas. One filled superellipse and
// two stroked eye arcs; the life comes from gaze drift and blinking, never from
// floating. Morphs are exponential ease-outs — no springs, no overshoot.

import { useEffect, useRef } from 'react';

export type Mood = 'rest' | 'proud' | 'sorry' | 'focus';

interface MoodSpec {
  n: number; sx: number; sy: number; roll: number; eyeY: number;
  gap: number; len: number; thick: number; bend: number; tilt: number;
  look: [number, number];
}

const MOODS: Record<Mood, MoodSpec> = {
  rest:  { n: 2.5, sx: 1.00, sy: 1.00, roll: -7,  eyeY: -2, gap: 15, len: 15, thick: 8.5, bend: 0.6,  tilt: 100, look: [0, 0] },
  proud: { n: 3.1, sx: 0.97, sy: 1.06, roll: -2,  eyeY: -4, gap: 15, len: 17, thick: 7.5, bend: 7.5,  tilt: 0,   look: [0, -0.2] },
  sorry: { n: 2.2, sx: 1.09, sy: 0.87, roll: 9,   eyeY: 3,  gap: 13, len: 9,  thick: 7,   bend: -2.5, tilt: 8,   look: [0.1, 0.55] },
  focus: { n: 2.8, sx: 1.00, sy: 1.00, roll: -14, eyeY: -3, gap: 14, len: 12, thick: 8,   bend: 1.2,  tilt: 84,  look: [-0.5, -0.25] },
};

const KEYS = ['n', 'sx', 'sy', 'roll', 'eyeY', 'gap', 'len', 'thick', 'bend', 'tilt'] as const;

function bodyPath(c: MoodSpec) {
  const R = 38, steps = 96;
  let d = '';
  for (let i = 0; i < steps; i++) {
    const th = (i / steps) * Math.PI * 2;
    const ct = Math.cos(th), st = Math.sin(th);
    const r = R / Math.pow(Math.pow(Math.abs(ct), c.n) + Math.pow(Math.abs(st), c.n), 1 / c.n);
    d += (i ? 'L' : 'M') + (50 + r * ct * c.sx).toFixed(2) + ' ' + (52 + r * st * c.sy).toFixed(2);
  }
  return d + 'Z';
}

export default function QuantBuddy({
  size = 128, mood = 'rest', personality = 'quiet', tone = 'light',
}: { size?: number; mood?: Mood; personality?: 'quiet' | 'loud'; tone?: 'light' | 'dark' }) {
  const bodyRef = useRef<SVGPathElement>(null);
  const eyeLRef = useRef<SVGPathElement>(null);
  const eyeRRef = useRef<SVGPathElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const moodRef = useRef<Mood>(mood);
  const loudRef = useRef(personality === 'loud');
  const popRef = useRef(0);

  moodRef.current = MOODS[mood] ? mood : 'rest';
  loudRef.current = personality === 'loud';

  useEffect(() => { if (loudRef.current) popRef.current = 1; }, [mood]);

  useEffect(() => {
    const cur: MoodSpec = { ...MOODS[moodRef.current] };
    let look: [number, number] = [...MOODS[moodRef.current].look];
    let lookTarget: [number, number] = [...look];
    let lookAt = 0;
    let blink = 1;
    let blinkPhase = 0;
    let blinkAt = performance.now() / 1000 + 1.6;
    let prev = performance.now();
    let raf = 0;

    const draw = () => {
      const s = 1 + popRef.current * 0.07;
      bodyRef.current?.setAttribute('d', bodyPath(cur));
      gRef.current?.setAttribute(
        'transform',
        `rotate(${cur.roll.toFixed(2)} 50 52) translate(50 52) scale(${s.toFixed(3)}) translate(-50 -52)`,
      );
      const gx = look[0] * 5.2, gy = look[1] * 4.4;
      const th = Math.max(cur.thick * blink, 1.2);
      const half = cur.len / 2;
      const set = (el: SVGPathElement | null, sign: number) => {
        if (!el) return;
        const cx = 50 + sign * cur.gap + gx;
        const cy = 52 + cur.eyeY + gy;
        el.setAttribute('d', `M${(-half).toFixed(2)} 0 Q0 ${(-cur.bend * 2).toFixed(2)} ${half.toFixed(2)} 0`);
        el.setAttribute('stroke-width', th.toFixed(2));
        el.setAttribute('transform', `translate(${cx.toFixed(2)} ${cy.toFixed(2)}) rotate(${(sign * cur.tilt).toFixed(2)})`);
      };
      set(eyeLRef.current, -1);
      set(eyeRRef.current, 1);
    };

    const tick = () => {
      const now = performance.now();
      const t = now / 1000;
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      const target = MOODS[moodRef.current];
      const loud = loudRef.current;

      const a = 1 - Math.exp(-dt / (loud ? 0.11 : 0.19));
      KEYS.forEach(k => { cur[k] += (target[k] - cur[k]) * a; });

      if (t > lookAt) {
        const range = loud ? 1 : 0.6;
        lookTarget = [
          target.look[0] + (Math.random() - 0.5) * range,
          target.look[1] + (Math.random() - 0.5) * range * 0.7,
        ];
        lookAt = t + (loud ? 0.8 + Math.random() * 1.1 : 1.6 + Math.random() * 2.2);
      }
      const la = 1 - Math.exp(-dt / (loud ? 0.16 : 0.3));
      look = [look[0] + (lookTarget[0] - look[0]) * la, look[1] + (lookTarget[1] - look[1]) * la];

      if (t > blinkAt) {
        blinkPhase = 0.2;
        blinkAt = t + (loud ? 1.7 + Math.random() * 2.2 : 3.2 + Math.random() * 3.4);
        if (loud && Math.random() < 0.35) blinkAt = t + 0.42;
      }
      if (blinkPhase > 0) {
        blinkPhase = Math.max(0, blinkPhase - dt);
        const u = 1 - blinkPhase / 0.2;
        blink = Math.abs(u * 2 - 1) * 0.94 + 0.06;
      } else blink = 1;

      if (popRef.current > 0) popRef.current = Math.max(0, popRef.current - dt * 3.4);

      draw();
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  const dark = tone === 'dark';
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ overflow: 'visible', display: 'inline-block' }}>
      <g ref={gRef}>
        <path ref={bodyRef} fill={dark ? '#F4EEE2' : '#241E1A'} />
        <path ref={eyeLRef} fill="none" strokeLinecap="round" stroke={dark ? '#171320' : '#FBF1E2'} />
        <path ref={eyeRRef} fill="none" strokeLinecap="round" stroke={dark ? '#171320' : '#FBF1E2'} />
      </g>
    </svg>
  );
}
