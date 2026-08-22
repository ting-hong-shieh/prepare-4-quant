// Answer matching. The bank stores a canonical short answer like "1/7" or
// "sqrt(pi)"; the keypad produces the same alphabet. We normalise rather than
// parse — a CAS would be nicer but every extra layer is another thing that can
// mark a correct answer wrong, which is the one failure this app must not have.

const SUBS: [RegExp, string][] = [
  [/\s+/g, ''],
  [/×/g, '*'],
  [/÷/g, '/'],
  [/−|–|—/g, '-'],
  [/√\(?([^)]*)\)?/g, 'sqrt($1)'],
  [/π|pi\b/g, 'pi'],
  [/\*\*/g, '^'],
  [/\\/g, ''],
];

export function normalizeAnswer(s: string): string {
  let out = s.trim().toLowerCase();
  for (const [re, to] of SUBS) out = out.replace(re, to);
  return out;
}

/** Numeric fallback so 0.5 matches 1/2 without pulling in a CAS. */
function numeric(s: string): number | null {
  if (!/^[-+*/^().0-9a-z]*$/.test(s)) return null;
  const js = s
    .replace(/sqrt/g, 'Math.sqrt')
    .replace(/\bpi\b/g, 'Math.PI')
    .replace(/\be\b/g, 'Math.E')
    .replace(/\^/g, '**');
  if (/[a-z]/.test(js.replace(/Math\.(sqrt|PI|E)/g, ''))) return null;
  try {
    const v = Function(`"use strict";return (${js})`)();
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

export function isCorrect(given: string, expected: string | null): boolean {
  if (!expected) return false;
  const g = normalizeAnswer(given);
  const e = normalizeAnswer(expected);
  if (!g) return false;
  if (g === e) return true;

  const gn = numeric(g);
  const en = numeric(e);
  if (gn !== null && en !== null) return Math.abs(gn - en) <= 1e-9 * Math.max(1, Math.abs(en));
  return false;
}
