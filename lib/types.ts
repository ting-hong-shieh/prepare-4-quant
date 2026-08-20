export type Difficulty = 'easy' | 'medium' | 'hard';
export type Outcome = 'correct' | 'wrong' | 'revealed' | 'skipped';

export interface Chapter {
  id: number;
  no: number;
  title_zh: string;
  title_en: string;
}

export interface ChapterProgress extends Chapter {
  total: number;
  done: number;
}

export interface Problem {
  id: number;
  chapter_id: number;
  ordinal: number;
  /** Chinese title. `title_en` is the book's own heading. */
  title: string;
  title_en: string | null;
  topic: string | null;
  difficulty: Difficulty;
  statement_zh: string;
  statement_en: string | null;
  answer: string | null;
  /** Chinese solution. `solution_en` is the book's own, and is the source. */
  solution_md: string | null;
  solution_en: string | null;
  hints: string[];
  hints_en: string[];
  page: number | null;
  verified: 0 | 1;
}

export interface SessionItem {
  problem: Problem;
  attemptId: number;
  ordinal: number;
}

export interface Overview {
  totalProblems: number;
  doneProblems: number;
  percent: number;
  streakDays: number;
  dueCount: number;
  interviewDate: string | null;
  daysToInterview: number | null;
  dailyTarget: number;
  chapters: ChapterProgress[];
  todayPlan: { fresh: number; review: number; missed: number; total: number };
  projectedFinish: string | null;
}
