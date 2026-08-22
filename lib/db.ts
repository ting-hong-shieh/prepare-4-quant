import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import path from 'node:path';
// Plain JS module, shared with the CLI scripts so the list lives in one place.
import { migrate } from './migrations.mjs';

const DB_PATH = process.env.QUANT_DB ?? path.join(process.cwd(), 'data', 'quant.db');

// The connection is cached on globalThis, not in a module-level `let`. In dev,
// Next re-evaluates this module on every hot reload; a fresh Database each time
// leaves the previous one to be finalised after its V8 environment is gone, and
// better-sqlite3's native destructor then aborts the process
// ("Assertion failed: (env) != nullptr"). One instance per process fixes it.
const globalForDb = globalThis as unknown as {
  __quantDb?: Database.Database;
  __quantStmts?: Map<string, Database.Statement>;
};

export function getDb(): Database.Database {
  if (globalForDb.__quantDb) return globalForDb.__quantDb;

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(readFileSync(path.join(process.cwd(), 'lib', 'schema.sql'), 'utf8'));
  migrate(db);
  globalForDb.__quantDb = db;
  return db;
}

// Every prepared statement is cached forever, keyed by its SQL.
//
// This is not just a speed optimisation. Next renders server components inside
// contexts it later tears down; a Statement created during a render and then
// garbage-collected after that context is gone hits better-sqlite3's native
// destructor with a dead environment and aborts the whole process
// ("Assertion failed: (env) != nullptr"). In production that killed the server
// on the first request. Holding every statement in a module-global map means
// none of them is ever collected while the process lives, so the destructor
// only ever runs at real shutdown.
//
// Use this instead of getDb().prepare() everywhere.
export function q(sql: string): Database.Statement {
  const cache = (globalForDb.__quantStmts ??= new Map());
  let stmt = cache.get(sql);
  if (!stmt) {
    stmt = getDb().prepare(sql);
    cache.set(sql, stmt);
  }
  return stmt;
}

