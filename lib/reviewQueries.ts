import { getDb } from './db';
import type { Problem } from './types';

export interface ReviewRow extends Problem {
  chapter_no: number;
  chapter_title: string;
}

export function listForReview(all: boolean): ReviewRow[] {
  const rows = getDb().prepare(`
    SELECT p.*, c.no AS chapter_no, c.title_zh AS chapter_title
      FROM problems p JOIN chapters c ON c.id = p.chapter_id
     ${all ? '' : 'WHERE p.verified = 0'}
     ORDER BY c.no, p.ordinal
  `).all() as any[];
  return rows.map(r => ({
    ...r,
    hints: JSON.parse(r.hints || '[]'),
    hints_en: JSON.parse(r.hints_en || '[]'),
    figures: JSON.parse(r.figures || '[]'),
  }));
}

export function reviewCounts() {
  const db = getDb();
  const total = (db.prepare('SELECT COUNT(*) AS n FROM problems').get() as { n: number }).n;
  const pending = (db.prepare('SELECT COUNT(*) AS n FROM problems WHERE verified = 0').get() as { n: number }).n;
  return { total, pending };
}
