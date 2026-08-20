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
  title: string;
  topic: string | null;
  difficulty: Difficulty;
  statement_zh: string;
  statement_en: string | null;
  answer: string | null;
  solution_md: string | null;
  hints: string[];
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
