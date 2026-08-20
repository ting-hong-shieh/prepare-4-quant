import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const dbPath = process.env.QUANT_DB ?? path.join(process.cwd(), 'data', 'quant.db');
mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.exec(readFileSync(path.join(process.cwd(), 'lib', 'schema.sql'), 'utf8'));
db.prepare('INSERT OR IGNORE INTO settings (id, daily_target) VALUES (1, 12)').run();

const seed = JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'seed-problems.json'), 'utf8'));

const upsertChapter = db.prepare(`
  INSERT INTO chapters (no, title_zh, title_en) VALUES (@no, @title_zh, @title_en)
  ON CONFLICT(no) DO UPDATE SET title_zh = excluded.title_zh, title_en = excluded.title_en
`);
const chapterId = db.prepare('SELECT id FROM chapters WHERE no = ?');
const nextOrdinal = db.prepare('SELECT COALESCE(MAX(ordinal), 0) + 1 AS n FROM problems WHERE chapter_id = ?');
const exists = db.prepare('SELECT id FROM problems WHERE chapter_id = ? AND title = ?');
const insertProblem = db.prepare(`
  INSERT INTO problems
    (chapter_id, ordinal, title, topic, difficulty, statement_zh, statement_en,
     answer, solution_md, hints, source, verified)
  VALUES
    (@chapter_id, @ordinal, @title, @topic, @difficulty, @statement_zh, @statement_en,
     @answer, @solution_md, @hints, 'seed', 1)
`);

db.transaction(() => {
  for (const c of seed.chapters) upsertChapter.run(c);

  let added = 0, skipped = 0;
  for (const p of seed.problems) {
    const ch = chapterId.get(p.chapter);
    if (!ch) throw new Error(`seed 指到不存在的章節 ${p.chapter}`);
    if (exists.get(ch.id, p.title)) { skipped++; continue; }
    insertProblem.run({
      chapter_id: ch.id,
      ordinal: nextOrdinal.get(ch.id).n,
      title: p.title,
      topic: p.topic ?? null,
      difficulty: p.difficulty ?? 'medium',
      statement_zh: p.statement_zh,
      statement_en: p.statement_en ?? null,
      answer: p.answer ?? null,
      solution_md: p.solution_md ?? null,
      hints: JSON.stringify(p.hints ?? []),
    });
    added++;
  }
  console.log(`seed: +${added} 題，略過 ${skipped} 題（已存在）`);
})();

const n = db.prepare('SELECT COUNT(*) AS n FROM problems').get().n;
console.log(`題庫現有 ${n} 題 → ${dbPath}`);
