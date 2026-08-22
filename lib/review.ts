// A trimmed SM-2. Grades: 0 again, 1 hard, 2 good, 3 easy.
// Deliberately shorter first intervals than Anki's defaults — an interview in
// three months does not leave room for a 4-day first step.

export interface ReviewState {
  interval_days: number;
  ease: number;
  reps: number;
  lapses: number;
}

const FIRST_STEPS = [0.02, 1, 3]; // ~30 min, 1 day, 3 days

export function schedule(prev: ReviewState | null, grade: number): ReviewState & { due_at: string } {
  const s: ReviewState = prev ?? { interval_days: 0, ease: 2.5, reps: 0, lapses: 0 };
  let { interval_days, ease, reps, lapses } = s;

  if (grade === 0) {
    lapses += 1;
    reps = 0;
    ease = Math.max(1.3, ease - 0.2);
    interval_days = FIRST_STEPS[0];
  } else {
    ease = Math.min(2.8, Math.max(1.3, ease + (grade === 1 ? -0.15 : grade === 3 ? 0.1 : 0)));
    if (reps < FIRST_STEPS.length) {
      interval_days = FIRST_STEPS[Math.min(reps, FIRST_STEPS.length - 1)];
    } else {
      const mult = grade === 1 ? 1.2 : grade === 3 ? ease * 1.3 : ease;
      interval_days = Math.min(180, interval_days * mult);
    }
    reps += 1;
  }

  const due = new Date(Date.now() + interval_days * 86400_000);
  return { interval_days, ease, reps, lapses, due_at: due.toISOString() };
}

// What the drill screen sends after each problem, before any self-assessment.
export function gradeFromOutcome(outcome: string, hintsUsed: number): number {
  if (outcome === 'correct') return hintsUsed === 0 ? 3 : 2;
  if (outcome === 'revealed') return 0;
  if (outcome === 'skipped') return 0;
  return 0; // wrong
}
