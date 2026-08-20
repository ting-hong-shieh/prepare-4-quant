import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const dbPath = process.env.QUANT_DB ?? path.join(process.cwd(), 'data', 'quant.db');
mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.exec(readFileSync(path.join(process.cwd(), 'lib', 'schema.sql'), 'utf8'));
db.prepare('INSERT OR IGNORE INTO settings (id, daily_target) VALUES (1, 12)').run();
console.log(`schema applied → ${dbPath}`);
