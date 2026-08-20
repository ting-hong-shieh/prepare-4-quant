#!/usr/bin/env python3
"""Pass A — cheap structural scan, one call per page.

Reads each page image and reports only *where things start*: chapter headings and
problem headings. Nothing is transcribed here. The result is an index that lets
pass B send each problem its own page range instead of guessing at windows —
which is the difference between a problem whose solution is cut in half and one
that is extracted whole.

    .venv/bin/python ingest/scan_index.py            # all rendered pages
    .venv/bin/python ingest/scan_index.py --pages 20-60
"""
from __future__ import annotations

import argparse
import json
import sys

from pydantic import BaseModel, Field

from common import DEFAULT_MODEL, EXTRACT, PAGES, client, page_image

SYSTEM = """\
You are indexing scanned pages of a quantitative-finance interview textbook.

Report only STRUCTURE, never content:
- the printed page number in the footer, if visible
- a chapter heading, if a new chapter begins on this page
- every problem heading that BEGINS on this page. Problem headings are set in
  bold display type on their own line, followed by the problem statement and
  then an italic "Solution:" paragraph.
- whether the page opens mid-way through material that began on an earlier page

Do not transcribe statements, solutions or formulas. Section headings that are
not problems (e.g. a chapter's introductory essay) are not problem headings.\
"""


class ProblemStart(BaseModel):
    heading: str = Field(description="the bold problem heading, verbatim")
    solution_starts_here: bool = Field(description="does the italic Solution: paragraph also begin on this page")


class PageScan(BaseModel):
    printed_page: int | None = Field(description="page number printed in the footer, null if none")
    chapter_no: int | None = Field(description="chapter number if a chapter begins here")
    chapter_title: str | None = Field(description="chapter title if a chapter begins here")
    problem_starts: list[ProblemStart]
    continues_previous: bool
    is_front_matter: bool = Field(description="cover, table of contents, preface, index")


def parse_range(spec: str, available: list[int]) -> list[int]:
    if not spec:
        return available
    lo, _, hi = spec.partition("-")
    lo, hi = int(lo), int(hi or lo)
    return [p for p in available if lo <= p <= hi]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", default="")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--force", action="store_true", help="rescan pages already in the index")
    args = ap.parse_args()

    EXTRACT.mkdir(parents=True, exist_ok=True)
    index_path = EXTRACT / "index.jsonl"

    done: set[int] = set()
    if index_path.exists() and not args.force:
        for line in index_path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                done.add(json.loads(line)["page"])

    available = sorted(int(p.stem[1:]) for p in PAGES.glob("p*.png"))
    if not available:
        sys.exit("data/pages 是空的 —— 先跑 ingest/render_pages.py")
    todo = [p for p in parse_range(args.pages, available) if p not in done]
    print(f"要掃 {len(todo)} 頁（已完成 {len(done)}）")

    c = client()
    with index_path.open("a", encoding="utf-8") as out:
        for n in todo:
            resp = c.messages.parse(
                model=args.model,
                max_tokens=2000,
                system=SYSTEM,
                output_config={"effort": "low"},
                messages=[{
                    "role": "user",
                    "content": [page_image(n), {"type": "text", "text": f"Scan page image {n}."}],
                }],
                output_format=PageScan,
            )
            scan = resp.parsed_output
            out.write(json.dumps({"page": n, **scan.model_dump()}, ensure_ascii=False) + "\n")
            out.flush()
            titles = ", ".join(p.heading for p in scan.problem_starts) or "—"
            print(f"p{n:04d} (印刷頁 {scan.printed_page}): {titles}", flush=True)

    print(f"索引 → {index_path}")


if __name__ == "__main__":
    main()
