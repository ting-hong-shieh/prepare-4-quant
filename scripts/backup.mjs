import Database from 'better-sqlite3';
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';

// The bank is deliberately outside version control — it is the book's content,
// and the repo is public. That leaves it with no backup at all, and the
// transcription is by far the most expensive thing in this project to
// reproduce. This writes a self-contained snapshot somewhere you choose.
//
//   node scripts/backup.mjs                    → ./backups/
//   node scripts/backup.mjs /mnt/e/quant-bak   → anywhere else

const dbPath = process.env.QUANT_DB ?? path.join(process.cwd(), 'data', 'quant.db');
const outDir = process.argv[2] ?? path.join(process.cwd(), 'backups');
mkdirSync(outDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const target = path.join(outDir, `quant-bank-${stamp}`);
mkdirSync(target, { recursive: true });

// VACUUM INTO gives a consistent copy even with the dev server running, which
// a plain file copy does not while WAL has uncommitted pages.
const db = new Database(dbPath, { readonly: true });
db.exec(`VACUUM INTO '${path.join(target, 'quant.db').replace(/'/g, "''")}'`);
db.close();

const figures = path.join(process.cwd(), 'data', 'figures');
if (existsSync(figures)) {
  execFileSync('tar', ['-czf', path.join(target, 'figures.tar.gz'), '-C', path.join(process.cwd(), 'data'), 'figures']);
}
const extract = path.join(process.cwd(), 'data', 'extract');
if (existsSync(extract)) {
  execFileSync('tar', ['-czf', path.join(target, 'extract.tar.gz'), '-C', path.join(process.cwd(), 'data'), 'extract']);
}

const size = p => (existsSync(p) ? `${Math.round(statSync(p).size / 1024)} KB` : '—');
console.log(`備份 → ${target}`);
console.log(`  quant.db         ${size(path.join(target, 'quant.db'))}`);
console.log(`  figures.tar.gz   ${size(path.join(target, 'figures.tar.gz'))}`);
console.log(`  extract.tar.gz   ${size(path.join(target, 'extract.tar.gz'))}`);
console.log('\n這份包含書的內容，不要放進公開 repo 或公開雲端。');
