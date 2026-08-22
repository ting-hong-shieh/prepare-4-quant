// SQLite has no ADD COLUMN IF NOT EXISTS, and CREATE TABLE IF NOT EXISTS does
// nothing to a table that already exists — so columns added after the first
// release have to be applied by hand. Shared by the Next server (lib/db.ts) and
// the CLI scripts so there is only ever one list.

export const ADDED_COLUMNS = [
  // The book is in English: English is the source, Chinese is the translation.
  ['problems', 'title_en', 'TEXT'],
  ['problems', 'solution_en', 'TEXT'],
  ['problems', 'hints_en', "TEXT NOT NULL DEFAULT '[]'"],
  ['settings', 'language', "TEXT NOT NULL DEFAULT 'en'"],
  // Figures cropped out of the scan: [{ file, caption }]. A problem that
  // depends on a diagram is unusable without it, and LaTeX cannot carry one.
  ['problems', 'figures', "TEXT NOT NULL DEFAULT '[]'"],
];

/** Idempotent: safe to run on every boot. */
export function migrate(db) {
  for (const [table, column, decl] of ADDED_COLUMNS) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!cols.some(c => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${decl}`);
    }
  }
}
