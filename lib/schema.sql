-- Quant Drill local store. Written by ingest/*.py (Python) and read/written by
-- the Next.js server. Everything derived from the scanned book stays in here,
-- and this file is gitignored — the book is licensed to one reader, not a repo.

PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS chapters (
  id          INTEGER PRIMARY KEY,
  no          INTEGER NOT NULL UNIQUE,      -- display number, 01..07
  title_zh    TEXT NOT NULL,
  title_en    TEXT NOT NULL,
  page_start  INTEGER,
  page_end    INTEGER
);

CREATE TABLE IF NOT EXISTS problems (
  id            INTEGER PRIMARY KEY,
  chapter_id    INTEGER NOT NULL REFERENCES chapters(id),
  ordinal       INTEGER NOT NULL,           -- position within the chapter
  title         TEXT NOT NULL,              -- short handle, e.g. 條件機率 · 硬幣三次
  topic         TEXT,                       -- probability | stochastic | ...
  difficulty    TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  -- The book is in English, so English is the source language and Chinese is
  -- the translation — not the other way round. Either side can be missing;
  -- the reader falls back to whichever exists.
  statement_zh  TEXT NOT NULL,              -- the question, Chinese
  statement_en  TEXT,                       -- the book's own wording
  answer        TEXT,                       -- canonical short answer, e.g. 1/7
  solution_md   TEXT,                       -- worked solution, Chinese (markdown + $latex$)
  hints         TEXT NOT NULL DEFAULT '[]', -- JSON array, Chinese, revealed one at a time
  page          INTEGER,                    -- page in the scan, for going back to the book
  source        TEXT NOT NULL DEFAULT 'seed' CHECK (source IN ('seed','ingest','manual')),
  verified      INTEGER NOT NULL DEFAULT 0, -- 1 once a human has proofread the OCR
  UNIQUE (chapter_id, ordinal)
);

CREATE INDEX IF NOT EXISTS idx_problems_chapter ON problems(chapter_id);

-- Spaced repetition state, one row per problem once it has been attempted.
CREATE TABLE IF NOT EXISTS reviews (
  problem_id    INTEGER PRIMARY KEY REFERENCES problems(id),
  due_at        TEXT NOT NULL,              -- ISO date
  interval_days REAL NOT NULL DEFAULT 0,
  ease          REAL NOT NULL DEFAULT 2.5,
  reps          INTEGER NOT NULL DEFAULT 0,
  lapses        INTEGER NOT NULL DEFAULT 0,
  last_grade    INTEGER                     -- 0 again | 1 hard | 2 good | 3 easy
);

CREATE INDEX IF NOT EXISTS idx_reviews_due ON reviews(due_at);

CREATE TABLE IF NOT EXISTS sessions (
  id          INTEGER PRIMARY KEY,
  created_at  TEXT NOT NULL,
  ended_at    TEXT,
  kind        TEXT NOT NULL DEFAULT 'daily' CHECK (kind IN ('daily','chapter','mock'))
);

CREATE TABLE IF NOT EXISTS attempts (
  id          INTEGER PRIMARY KEY,
  session_id  INTEGER REFERENCES sessions(id),
  problem_id  INTEGER NOT NULL REFERENCES problems(id),
  ordinal     INTEGER NOT NULL,             -- position within the session
  started_at  TEXT NOT NULL,
  ended_at    TEXT,
  seconds     INTEGER,
  answer      TEXT,
  outcome     TEXT CHECK (outcome IN ('correct','wrong','revealed','skipped')),
  grade       INTEGER,                      -- 0..3, feeds the review scheduler
  hints_used  INTEGER NOT NULL DEFAULT 0,
  note        TEXT                          -- why I got it wrong, in my own words
);

CREATE INDEX IF NOT EXISTS idx_attempts_session ON attempts(session_id, ordinal);
CREATE INDEX IF NOT EXISTS idx_attempts_problem ON attempts(problem_id);

-- One row; holds the things the home screen counts.
CREATE TABLE IF NOT EXISTS settings (
  id             INTEGER PRIMARY KEY CHECK (id = 1),
  interview_date TEXT,                      -- ISO date, drives the "interview -83d" chip
  daily_target   INTEGER NOT NULL DEFAULT 12
);

-- Columns added after the first version of this file shipped. SQLite has no
-- ADD COLUMN IF NOT EXISTS, so lib/db.ts applies these by inspecting
-- PRAGMA table_info at startup. Listed here so the schema still reads as one
-- description of the database.
--
--   problems.title_en    TEXT   the book's own heading
--   problems.solution_en TEXT   the book's own solution, English
--   problems.hints_en    TEXT   JSON array, English
--   settings.language    TEXT   'en' | 'zh', which one the reader sees

-- ── LLM 討論 ──────────────────────────────────────────────────────────────
-- One row per turn. Kept per attempt rather than per problem so that meeting a
-- problem again on review starts a fresh conversation instead of dragging the
-- last one's answer along with it.
CREATE TABLE IF NOT EXISTS chats (
  id         INTEGER PRIMARY KEY,
  attempt_id INTEGER NOT NULL REFERENCES attempts(id),
  role       TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content    TEXT NOT NULL,
  -- 'thinking' = still working on it, the tutor must not hand over the answer.
  -- 'reviewing' = already submitted or revealed, everything is on the table.
  phase      TEXT NOT NULL CHECK (phase IN ('thinking','reviewing')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chats_attempt ON chats(attempt_id, id);

-- A graded write-up: the whole derivation, not just the final value. This is
-- the thing worth reviewing later — the answer you got is much less
-- interesting than the step where you went wrong.
CREATE TABLE IF NOT EXISTS derivations (
  id           INTEGER PRIMARY KEY,
  attempt_id   INTEGER NOT NULL REFERENCES attempts(id),
  body         TEXT NOT NULL,
  verdict      TEXT CHECK (verdict IN ('sound','flawed','wrong')),
  score        INTEGER,
  first_error  TEXT,   -- quotes the step where it first goes wrong, null if sound
  why          TEXT,   -- what is actually wrong with that step
  concept      TEXT,   -- the idea to go back and fix
  praise       TEXT,   -- what the write-up got right, so it is not all correction
  disputed     INTEGER NOT NULL DEFAULT 0,  -- I pressed 「我覺得我對」
  created_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_derivations_attempt ON derivations(attempt_id);
