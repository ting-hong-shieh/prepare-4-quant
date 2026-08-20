#!/usr/bin/env python3
"""Pass B — transcribe each problem from its own page range into the题库.

Reads data/extract/index.jsonl (pass A) to work out which pages each problem
spans, sends exactly those pages, and writes the result into SQLite with
source='ingest' and verified=0. Nothing extracted here is trusted until a human
has seen it — /review in the app is where that happens.

    .venv/bin/python ingest/extract.py --limit 3     # try three problems first
    .venv/bin/python ingest/extract.py               # everything in the index
"""
from __future__ import annotations

import argparse
import json
import sys

from pydantic import BaseModel, Field

from common import DEFAULT_MODEL, EXTRACT, client, db, page_image

SYSTEM = """\
You are transcribing one problem from a scanned quantitative-finance interview
textbook into a study app's problem bank.

Rules:
- Transcribe faithfully. Do not solve the problem yourself, do not improve the
  book's argument, and do not add steps the book does not make.
- Set every formula in LaTeX between $…$ (inline) or $$…$$ (display). The scan
  renders sub/superscripts small — read them carefully; a wrong subscript makes
  the problem wrong.
- The book is in English, so English is the source: statement_en and
  solution_en are the book's own words, transcribed, not re-derived.
- statement_zh and solution_zh are Traditional Chinese (Taiwan) translations
  for a reader who already knows the mathematics: keep the LaTeX identical,
  translate only the prose, and keep standard English terms (martingale, Itô,
  call, put) where a Taiwanese quant would use them.
- answer is the final short answer alone, in a form a keypad can produce:
  "1/7", "sqrt(pi)", "3t^2", "b/(a+b)". Use null when the problem asks for a
  construction or a proof rather than a value.
- hints_en and hints_zh are 1–3 short nudges you write yourself, ordered
  weakest first, the same hints in both languages. A hint points at the idea;
  it never gives the answer away.
- If the pages you were given do not contain the whole problem and solution, say
  so in `truncated` rather than inventing the missing part.\
"""


class Extracted(BaseModel):
    title_en: str = Field(description="the book's own heading, verbatim")
    title_zh: str = Field(description="short Chinese handle, e.g. 條件機率 · 硬幣三次")
    statement_en: str = Field(description="the book's own statement, verbatim, LaTeX for maths")
    statement_zh: str = Field(description="Traditional Chinese translation of the statement")
    solution_en: str = Field(description="the book's own solution as markdown, English")
    solution_zh: str = Field(description="Traditional Chinese translation of the solution")
    answer: str | None
    difficulty: str = Field(description="easy | medium | hard")
    topic: str = Field(description="one lowercase english tag, e.g. probability, stochastic, algorithms")
    hints_en: list[str] = Field(description="1-3 short English nudges you write yourself, weakest first")
    hints_zh: list[str] = Field(description="the same hints in Traditional Chinese")
    truncated: bool = Field(description="true if the given pages did not contain the whole problem")


def load_index() -> list[dict]:
    path = EXTRACT / "index.jsonl"
    if not path.exists():
        sys.exit("找不到 data/extract/index.jsonl —— 先跑 ingest/scan_index.py")
    return [json.loads(l) for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]


def plan(index: list[dict]) -> list[dict]:
    """Turn the page index into one job per problem, with its page range."""
    index.sort(key=lambda r: r["page"])
    starts: list[dict] = []
    chapter_no, chapter_title = None, None
    for row in index:
        if row.get("chapter_no"):
            chapter_no, chapter_title = row["chapter_no"], row.get("chapter_title")
        if row.get("is_front_matter"):
            continue
        for p in row["problem_starts"]:
            starts.append({
                "heading": p["heading"],
                "page": row["page"],
                "chapter_no": chapter_no,
                "chapter_title": chapter_title,
            })

    last_page = index[-1]["page"]
    jobs = []
    for i, s in enumerate(starts):
        # A problem runs until the next problem starts. Cap the span so one bad
        # index entry cannot turn into a 40-page request.
        end = starts[i + 1]["page"] if i + 1 < len(starts) else last_page
        if starts[i + 1:] and starts[i + 1]["page"] == s["page"]:
            end = s["page"]
        jobs.append({**s, "pages": list(range(s["page"], min(end, s["page"] + 5) + 1))})
    return jobs


def ensure_chapter(conn, no: int | None, title: str | None) -> int:
    if no is None:
        no, title = 99, title or "未分類"
    row = conn.execute("SELECT id FROM chapters WHERE no = ?", (no,)).fetchone()
    if row:
        return row["id"]
    cur = conn.execute(
        "INSERT INTO chapters (no, title_zh, title_en) VALUES (?, ?, ?)",
        (no, title or f"第 {no} 章", title or f"Chapter {no}"),
    )
    return cur.lastrowid


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--limit", type=int, default=0, help="stop after N problems (use for a trial run)")
    ap.add_argument("--chapter", type=int, default=0, help="only this chapter number")
    args = ap.parse_args()

    jobs = plan(load_index())
    if args.chapter:
        jobs = [j for j in jobs if j["chapter_no"] == args.chapter]
    if args.limit:
        jobs = jobs[: args.limit]
    print(f"要抽 {len(jobs)} 題")

    c = client()
    conn = db()
    added = skipped = 0

    for j in jobs:
        chapter_id = ensure_chapter(conn, j["chapter_no"], j["chapter_title"])
        exists = conn.execute(
            "SELECT id FROM problems WHERE chapter_id = ? AND page = ? AND source = 'ingest'",
            (chapter_id, j["page"]),
        ).fetchone()
        if exists:
            skipped += 1
            continue

        content = [page_image(p) for p in j["pages"]]
        content.append({
            "type": "text",
            "text": (
                f'Transcribe the problem headed "{j["heading"]}", which begins on the first '
                f"page shown. Ignore any other problem on these pages."
            ),
        })

        resp = c.messages.parse(
            model=args.model,
            max_tokens=8000,
            system=SYSTEM,
            output_config={"effort": "high"},
            messages=[{"role": "user", "content": content}],
            output_format=Extracted,
        )
        e = resp.parsed_output

        ordinal = conn.execute(
            "SELECT COALESCE(MAX(ordinal), 0) + 1 AS n FROM problems WHERE chapter_id = ?",
            (chapter_id,),
        ).fetchone()["n"]

        conn.execute(
            """INSERT INTO problems
               (chapter_id, ordinal, title, title_en, topic, difficulty,
                statement_zh, statement_en, answer, solution_md, solution_en,
                hints, hints_en, page, source, verified)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'ingest', 0)""",
            (
                chapter_id, ordinal, e.title_zh, e.title_en, e.topic,
                e.difficulty if e.difficulty in ("easy", "medium", "hard") else "medium",
                e.statement_zh, e.statement_en, e.answer, e.solution_zh, e.solution_en,
                json.dumps(e.hints_zh[:3], ensure_ascii=False),
                json.dumps(e.hints_en[:3], ensure_ascii=False),
                j["page"],
            ),
        )
        conn.commit()
        added += 1
        flag = "  ⚠ 頁面不足，複查" if e.truncated else ""
        print(f"  + {e.title_en}  (p{j['page']}, {len(j['pages'])} 頁){flag}", flush=True)

    print(f"完成：新增 {added} 題，略過 {skipped} 題（已抽過）。全部 verified=0，請到 /review 校對。")


if __name__ == "__main__":
    main()
