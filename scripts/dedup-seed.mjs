import Database from 'better-sqlite3';
import path from 'node:path';

// The 14 seeded problems existed so the app had something to drill before the
// book was ingested. Where the book's own version of the same problem lands,
// the seed copy is redundant — and two near-identical problems in one chapter
// is worse than either alone. Pass pairs as "<seed title>=<book title_en>".
const db = new Database(process.env.QUANT_DB ?? path.join(process.cwd(), 'data', 'quant.db'));

const pairs = process.argv.slice(2).map(a => {
  const [seed, book] = a.split('=');
  return { seed, book };
});
if (!pairs.length) {
  // No arguments: report collisions instead of acting on them.
  const seeds = db.prepare("SELECT id, title, title_en, chapter_id FROM problems WHERE source='seed'").all();
  const book = db.prepare("SELECT id, title, title_en, chapter_id FROM problems WHERE source='ingest'").all();
  console.log('種子題 vs 書上題，可能重複的：');
  for (const s of seeds) {
    for (const b of book) {
      const a1 = (s.title_en ?? '').toLowerCase();
      const a2 = (b.title_en ?? '').toLowerCase();
      if (a1 && a2 && (a1.includes(a2) || a2.includes(a1))) {
        console.log(`  seed[${s.id}] ${s.title_en}  ↔  book[${b.id}] ${b.title_en}`);
      }
    }
  }
  process.exit(0);
}

for (const { seed, book } of pairs) {
  const s = db.prepare("SELECT id FROM problems WHERE source='seed' AND (title = ? OR title_en = ?)").get(seed, seed);
  const b = db.prepare("SELECT id FROM problems WHERE source='ingest' AND title_en = ?").get(book);
  if (!s) { console.log(`找不到種子題「${seed}」，略過`); continue; }
  if (!b) { console.log(`書上還沒有「${book}」，先不刪「${seed}」`); continue; }
  db.prepare('DELETE FROM reviews WHERE problem_id = ?').run(s.id);
  db.prepare('DELETE FROM chats WHERE attempt_id IN (SELECT id FROM attempts WHERE problem_id = ?)').run(s.id);
  db.prepare('DELETE FROM derivations WHERE attempt_id IN (SELECT id FROM attempts WHERE problem_id = ?)').run(s.id);
  db.prepare('DELETE FROM attempts WHERE problem_id = ?').run(s.id);
  db.prepare('DELETE FROM problems WHERE id = ?').run(s.id);
  console.log(`刪掉種子題 [${s.id}] ${seed}（書上的 [${b.id}] ${book} 取代）`);
}
