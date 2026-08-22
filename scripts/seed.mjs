import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { migrate } from '../lib/migrations.mjs';

const dbPath = process.env.QUANT_DB ?? path.join(process.cwd(), 'data', 'quant.db');
mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.exec(readFileSync(path.join(process.cwd(), 'lib', 'schema.sql'), 'utf8'));
migrate(db);
db.prepare('INSERT OR IGNORE INTO settings (id, daily_target) VALUES (1, 12)').run();

const seed = JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'seed-problems.json'), 'utf8'));

const upsertChapter = db.prepare(`
  INSERT INTO chapters (no, title_zh, title_en) VALUES (@no, @title_zh, @title_en)
  ON CONFLICT(no) DO UPDATE SET title_zh = excluded.title_zh, title_en = excluded.title_en
`);
const chapterId = db.prepare('SELECT id FROM chapters WHERE no = ?');
const nextOrdinal = db.prepare('SELECT COALESCE(MAX(ordinal), 0) + 1 AS n FROM problems WHERE chapter_id = ?');
const exists = db.prepare('SELECT id FROM problems WHERE chapter_id = ? AND title = ?');
// Re-running the seed backfills the English side onto rows that already exist,
// so adding a translation never means wiping the bank and starting over.
const backfill = db.prepare(`
  UPDATE problems SET title_en = @title_en, solution_en = @solution_en, hints_en = @hints_en,
                      statement_en = COALESCE(@statement_en, statement_en)
   WHERE id = @id
`);
const insertProblem = db.prepare(`
  INSERT INTO problems
    (chapter_id, ordinal, title, title_en, topic, difficulty, statement_zh, statement_en,
     answer, solution_md, solution_en, hints, hints_en, source, verified)
  VALUES
    (@chapter_id, @ordinal, @title, @title_en, @topic, @difficulty, @statement_zh, @statement_en,
     @answer, @solution_md, @solution_en, @hints, @hints_en, 'seed', 1)
`);

db.transaction(() => {
  for (const c of seed.chapters) upsertChapter.run(c);

  let added = 0, skipped = 0;
  for (const p of seed.problems) {
    const ch = chapterId.get(p.chapter);
    if (!ch) throw new Error(`seed 指到不存在的章節 ${p.chapter}`);
    const already = exists.get(ch.id, p.title);
    if (already) {
      backfill.run({
        id: already.id,
        title_en: p.title_en ?? null,
        solution_en: p.solution_en ?? null,
        hints_en: JSON.stringify(p.hints_en ?? []),
        statement_en: p.statement_en ?? null,
      });
      skipped++;
      continue;
    }
    insertProblem.run({
      chapter_id: ch.id,
      ordinal: nextOrdinal.get(ch.id).n,
      title: p.title,
      title_en: p.title_en ?? null,
      topic: p.topic ?? null,
      difficulty: p.difficulty ?? 'medium',
      statement_zh: p.statement_zh,
      statement_en: p.statement_en ?? null,
      answer: p.answer ?? null,
      solution_md: p.solution_md ?? null,
      solution_en: p.solution_en ?? null,
      hints: JSON.stringify(p.hints ?? []),
      hints_en: JSON.stringify(p.hints_en ?? []),
    });
    added++;
  }
  console.log(`seed: +${added} 題，另外補上 ${skipped} 題的英文`);
})();

const n = db.prepare('SELECT COUNT(*) AS n FROM problems').get().n;
console.log(`題庫現有 ${n} 題 → ${dbPath}`);
