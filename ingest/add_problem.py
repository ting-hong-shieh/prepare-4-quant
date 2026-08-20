#!/usr/bin/env python3
"""Insert transcribed problems into the bank from a JSON file.

The same destination as ingest/extract.py, for transcription done by hand or by
an assistant reading the page images directly rather than through the API. Rows
land with source='ingest' and verified=0 either way: nothing counts until a
human has seen it next to the scan.

    ingest/add_problem.py problems.json
"""
from __future__ import annotations

import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from common import db  # noqa: E402

REQUIRED = ["chapter_no", "title_en", "title_zh", "statement_en", "statement_zh", "page"]


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("用法：ingest/add_problem.py <problems.json>")

    payload = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
    items = payload if isinstance(payload, list) else [payload]
    conn = db()
    added = skipped = 0

    for p in items:
        missing = [k for k in REQUIRED if not p.get(k)]
        if missing:
            sys.exit(f"{p.get('title_en', '?')} 少了欄位：{missing}")

        ch = conn.execute("SELECT id FROM chapters WHERE no = ?", (p["chapter_no"],)).fetchone()
        if not ch:
            sys.exit(f"章節 {p['chapter_no']} 不存在")

        if conn.execute(
            "SELECT id FROM problems WHERE chapter_id = ? AND title_en = ?", (ch["id"], p["title_en"])
        ).fetchone():
            skipped += 1
            continue

        ordinal = conn.execute(
            "SELECT COALESCE(MAX(ordinal), 0) + 1 AS n FROM problems WHERE chapter_id = ?", (ch["id"],)
        ).fetchone()["n"]

        cur = conn.execute(
            """INSERT INTO problems
               (chapter_id, ordinal, title, title_en, topic, difficulty,
                statement_zh, statement_en, answer, solution_md, solution_en,
                hints, hints_en, figures, page, source, verified)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'ingest', 0)""",
            (
                ch["id"], ordinal, p["title_zh"], p["title_en"], p.get("topic"),
                p.get("difficulty", "medium"),
                p["statement_zh"], p["statement_en"], p.get("answer"),
                p.get("solution_zh"), p.get("solution_en"),
                json.dumps(p.get("hints_zh", []), ensure_ascii=False),
                json.dumps(p.get("hints_en", []), ensure_ascii=False),
                json.dumps(p.get("figures", []), ensure_ascii=False),
                p["page"],
            ),
        )
        added += 1
        print(f"  + [{cur.lastrowid}] {p['title_en']}  (p{p['page']})")

    conn.commit()
    print(f"新增 {added} 題，略過 {skipped} 題（已存在）。全部 verified=0，請到 /review 校對。")


if __name__ == "__main__":
    main()
