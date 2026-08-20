import { getDb } from './db';
import { schedule, gradeFromOutcome, type ReviewState } from './review';
import type { Chapter, ChapterProgress, Overview, Problem, SessionItem } from './types';

const today = () => new Date().toISOString().slice(0, 10);

function hydrate(row: any): Problem {
  return { ...row, hints: JSON.parse(row.hints || '[]') };
}

export function getOverview(): Overview {
  const db = getDb();

  const chapters = db.prepare(`
    SELECT c.id, c.no, c.title_zh, c.title_en,
           COUNT(p.id) AS total,
           COUNT(r.problem_id) FILTER (WHERE r.reps > 0) AS done
      FROM chapters c
      LEFT JOIN problems p ON p.chapter_id = c.id
      LEFT JOIN reviews  r ON r.problem_id = p.id
     GROUP BY c.id
     ORDER BY c.no
  `).all() as ChapterProgress[];

  const totalProblems = chapters.reduce((n, c) => n + c.total, 0);
  const doneProblems = chapters.reduce((n, c) => n + c.done, 0);

  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get() as
    { interview_date: string | null; daily_target: number } | undefined;

  const dueCount = (db.prepare(
    `SELECT COUNT(*) AS n FROM reviews WHERE due_at <= ?`
  ).get(new Date().toISOString()) as { n: number }).n;

  // Streak: consecutive days back from today with at least one finished attempt.
  const days = (db.prepare(
    `SELECT DISTINCT date(ended_at) AS d FROM attempts WHERE ended_at IS NOT NULL ORDER BY d DESC`
  ).all() as { d: string }[]).map(r => r.d);
  let streakDays = 0;
  for (let i = 0; i < days.length; i++) {
    const expect = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    if (days[i] === expect) streakDays++;
    else break;
  }

  const interviewDate = settings?.interview_date ?? null;
  const daysToInterview = interviewDate
    ? Math.round((new Date(interviewDate).getTime() - Date.now()) / 86400_000)
    : null;

  // Projected finish: 14-day trailing rate, or the daily target if there is no history yet.
  const recent = (db.prepare(
    `SELECT COUNT(*) AS n FROM attempts
      WHERE ended_at >= datetime('now', '-14 days') AND outcome IS NOT NULL`
  ).get() as { n: number }).n;
  const perDay = recent > 0 ? recent / 14 : 0;
  const remaining = totalProblems - doneProblems;
  const projectedFinish = perDay > 0.2
    ? new Date(Date.now() + (remaining / perDay) * 86400_000).toISOString().slice(0, 10)
    : null;

  const target = settings?.daily_target ?? 12;
  const plan = planToday(target);

  return {
    totalProblems,
    doneProblems,
    percent: totalProblems ? Math.round((doneProblems / totalProblems) * 100) : 0,
    streakDays,
    dueCount,
    interviewDate,
    daysToInterview,
    dailyTarget: target,
    chapters,
    todayPlan: plan,
    projectedFinish,
  };
}

/** Composition of today's set: due reviews first, then lapsed, then new. */
function planToday(target: number) {
  const db = getDb();
  const now = new Date().toISOString();
  const review = (db.prepare(
    `SELECT COUNT(*) AS n FROM reviews WHERE due_at <= ? AND lapses = 0`
  ).get(now) as { n: number }).n;
  const missed = (db.prepare(
    `SELECT COUNT(*) AS n FROM reviews WHERE due_at <= ? AND lapses > 0`
  ).get(now) as { n: number }).n;
  const cappedReview = Math.min(review, target);
  const cappedMissed = Math.min(missed, Math.max(0, target - cappedReview));
  const fresh = Math.max(0, target - cappedReview - cappedMissed);
  return { fresh, review: cappedReview, missed: cappedMissed, total: target };
}

/** Pick the problems for a session and persist it. Returns the session id. */
export function createSession(kind: 'daily' | 'chapter' | 'mock' = 'daily', chapterId?: number): number {
  const db = getDb();
  const settings = db.prepare('SELECT daily_target FROM settings WHERE id = 1').get() as
    { daily_target: number } | undefined;
  const target = settings?.daily_target ?? 12;
  const now = new Date().toISOString();

  const chapterFilter = chapterId ? 'AND p.chapter_id = ?' : '';
  const dueArgs: unknown[] = chapterId ? [now, chapterId, target] : [now, target];
  const due = db.prepare(`
    SELECT p.* FROM problems p
      JOIN reviews r ON r.problem_id = p.id
     WHERE r.due_at <= ? ${chapterFilter}
     ORDER BY r.lapses DESC, r.due_at ASC
     LIMIT ?
  `).all(...dueArgs) as any[];

  const freshLimit = Math.max(0, target - due.length);
  const freshArgs: unknown[] = chapterId ? [chapterId, freshLimit] : [freshLimit];
  const fresh = freshLimit === 0 ? [] : db.prepare(`
    SELECT p.* FROM problems p
     WHERE p.id NOT IN (SELECT problem_id FROM reviews)
       ${chapterFilter}
     ORDER BY p.chapter_id, p.ordinal
     LIMIT ?
  `).all(...freshArgs) as any[];

  const picked = [...due, ...fresh].slice(0, target);
  if (picked.length === 0) throw new Error('沒有可以排入的題目 —— 題庫是空的，先跑 ingestion 或 npm run db:seed。');

  const sessionId = Number(
    db.prepare('INSERT INTO sessions (created_at, kind) VALUES (?, ?)').run(now, kind).lastInsertRowid
  );
  const insert = db.prepare(
    'INSERT INTO attempts (session_id, problem_id, ordinal, started_at) VALUES (?, ?, ?, ?)'
  );
  picked.forEach((p, i) => insert.run(sessionId, p.id, i, now));
  return sessionId;
}

export function getSession(sessionId: number): { id: number; ended_at: string | null; items: SessionItem[] } {
  const db = getDb();
  const session = db.prepare('SELECT id, ended_at FROM sessions WHERE id = ?').get(sessionId) as
    { id: number; ended_at: string | null } | undefined;
  if (!session) throw new Error(`session ${sessionId} 不存在`);

  const rows = db.prepare(`
    SELECT a.id AS attempt_id, a.ordinal, p.*
      FROM attempts a JOIN problems p ON p.id = a.problem_id
     WHERE a.session_id = ?
     ORDER BY a.ordinal
  `).all(sessionId) as any[];

  return {
    ...session,
    items: rows.map(r => ({
      attemptId: r.attempt_id,
      ordinal: r.ordinal,
      problem: hydrate(r),
    })),
  };
}

export function submitAttempt(input: {
  attemptId: number;
  answer: string;
  outcome: 'correct' | 'wrong' | 'revealed' | 'skipped';
  seconds: number;
  hintsUsed: number;
}) {
  const db = getDb();
  const attempt = db.prepare('SELECT problem_id FROM attempts WHERE id = ?').get(input.attemptId) as
    { problem_id: number } | undefined;
  if (!attempt) throw new Error(`attempt ${input.attemptId} 不存在`);

  const grade = gradeFromOutcome(input.outcome, input.hintsUsed);

  db.prepare(`
    UPDATE attempts
       SET ended_at = ?, seconds = ?, answer = ?, outcome = ?, grade = ?, hints_used = ?
     WHERE id = ?
  `).run(new Date().toISOString(), input.seconds, input.answer, input.outcome, grade, input.hintsUsed, input.attemptId);

  const prev = db.prepare('SELECT * FROM reviews WHERE problem_id = ?').get(attempt.problem_id) as
    (ReviewState & { problem_id: number }) | undefined;
  const next = schedule(prev ?? null, grade);

  db.prepare(`
    INSERT INTO reviews (problem_id, due_at, interval_days, ease, reps, lapses, last_grade)
    VALUES (@problem_id, @due_at, @interval_days, @ease, @reps, @lapses, @last_grade)
    ON CONFLICT(problem_id) DO UPDATE SET
      due_at = excluded.due_at, interval_days = excluded.interval_days,
      ease = excluded.ease, reps = excluded.reps,
      lapses = excluded.lapses, last_grade = excluded.last_grade
  `).run({ problem_id: attempt.problem_id, last_grade: grade, ...next });

  return { grade };
}

export function endSession(sessionId: number) {
  getDb().prepare('UPDATE sessions SET ended_at = ? WHERE id = ? AND ended_at IS NULL')
    .run(new Date().toISOString(), sessionId);
}

export function getSessionResult(sessionId: number) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT a.ordinal, a.seconds, a.outcome, a.grade, p.title, p.topic
      FROM attempts a JOIN problems p ON p.id = a.problem_id
     WHERE a.session_id = ? AND a.ended_at IS NOT NULL
     ORDER BY a.ordinal
  `).all(sessionId) as {
    ordinal: number; seconds: number; outcome: string; grade: number; title: string; topic: string | null;
  }[];

  const answered = rows.length;
  const correct = rows.filter(r => r.outcome === 'correct').length;
  const totalSeconds = rows.reduce((n, r) => n + (r.seconds || 0), 0);
  return {
    rows,
    answered,
    correct,
    avgSeconds: answered ? Math.round(totalSeconds / answered) : 0,
  };
}

export function listChapters(): Chapter[] {
  return getDb().prepare('SELECT id, no, title_zh, title_en FROM chapters ORDER BY no').all() as Chapter[];
}

// ── LLM 討論 ───────────────────────────────────────────────────────────────

export interface AttemptContext {
  attemptId: number;
  problem: Problem;
  /** Once the attempt has ended, the answer is on the table and the tutor stops holding back. */
  phase: 'thinking' | 'reviewing';
  outcome: string | null;
}

export function getAttemptContext(attemptId: number): AttemptContext {
  const row = getDb().prepare(`
    SELECT a.id AS attempt_id, a.ended_at, a.outcome, p.*
      FROM attempts a JOIN problems p ON p.id = a.problem_id
     WHERE a.id = ?
  `).get(attemptId) as any;
  if (!row) throw new Error(`attempt ${attemptId} 不存在`);
  return {
    attemptId,
    problem: hydrate(row),
    phase: row.ended_at ? 'reviewing' : 'thinking',
    outcome: row.outcome,
  };
}

export interface ChatTurn { id: number; role: 'user' | 'assistant'; content: string; phase: string }

export function getChat(attemptId: number): ChatTurn[] {
  return getDb()
    .prepare('SELECT id, role, content, phase FROM chats WHERE attempt_id = ? ORDER BY id')
    .all(attemptId) as ChatTurn[];
}

export function appendChat(attemptId: number, role: 'user' | 'assistant', content: string, phase: string): number {
  return Number(
    getDb()
      .prepare('INSERT INTO chats (attempt_id, role, content, phase, created_at) VALUES (?,?,?,?,?)')
      .run(attemptId, role, content, phase, new Date().toISOString()).lastInsertRowid,
  );
}

export interface Derivation {
  id: number;
  body: string;
  verdict: 'sound' | 'flawed' | 'wrong' | null;
  score: number | null;
  first_error: string | null;
  why: string | null;
  concept: string | null;
  praise: string | null;
  disputed: number;
}

export function saveDerivation(attemptId: number, body: string, g: {
  verdict: string; score: number; first_error?: string | null;
  why?: string | null; concept?: string | null; praise?: string | null;
}): number {
  return Number(
    getDb().prepare(`
      INSERT INTO derivations (attempt_id, body, verdict, score, first_error, why, concept, praise, created_at)
      VALUES (?,?,?,?,?,?,?,?,?)
    `).run(
      attemptId, body, g.verdict, g.score,
      g.first_error ?? null, g.why ?? null, g.concept ?? null, g.praise ?? null,
      new Date().toISOString(),
    ).lastInsertRowid,
  );
}

export function getDerivation(attemptId: number): Derivation | null {
  return (getDb()
    .prepare('SELECT * FROM derivations WHERE attempt_id = ? ORDER BY id DESC LIMIT 1')
    .get(attemptId) as Derivation | undefined) ?? null;
}

/** 「我覺得我對」 — flag a grade I disagree with, so it can be looked at again. */
export function disputeDerivation(id: number) {
  getDb().prepare('UPDATE derivations SET disputed = 1 WHERE id = ?').run(id);
}
