#!/usr/bin/env python3
"""Crop a figure out of a scanned page and attach it to a problem.

Some problems are unusable without their diagram, and a transcription into
LaTeX cannot carry one. Rather than try to redraw them, keep the book's own
figure as an image and hang it off the problem.

Coordinates are fractions of the page (0-1), so they can be read off a rendered
page without knowing its pixel size.

    ingest/crop_figure.py --page 55 --box 0.03,0.05,0.42,0.37 \
        --caption "Figure 3.1 Interaction of two cylinders" --problem 21
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys

import pymupdf

ROOT = pathlib.Path(__file__).resolve().parent.parent
FIGURES = ROOT / "data" / "figures"
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from common import db  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", default=None)
    ap.add_argument("--page", type=int, required=True, help="1-indexed page in the scan")
    ap.add_argument("--box", required=True, help="left,top,right,bottom as fractions of the page")
    ap.add_argument("--caption", default="")
    ap.add_argument("--problem", type=int, help="problem id to attach it to")
    ap.add_argument("--name", default=None, help="output filename (default: p<page>-<n>.png)")
    ap.add_argument("--dpi-scale", type=float, default=2.0, help="render scale; figures deserve more than the text pass")
    args = ap.parse_args()

    pdf = args.pdf or str(next(iter(sorted(ROOT.glob("*.pdf")))))
    doc = pymupdf.open(pdf)
    page = doc[args.page - 1]

    l, t, r, b = (float(x) for x in args.box.split(","))
    rect = pymupdf.Rect(
        page.rect.x0 + l * page.rect.width,
        page.rect.y0 + t * page.rect.height,
        page.rect.x0 + r * page.rect.width,
        page.rect.y0 + b * page.rect.height,
    )

    FIGURES.mkdir(parents=True, exist_ok=True)
    name = args.name or f"p{args.page:04d}-{len(list(FIGURES.glob(f'p{args.page:04d}-*'))) + 1}.png"
    out = FIGURES / name
    page.get_pixmap(matrix=pymupdf.Matrix(args.dpi_scale, args.dpi_scale), clip=rect).save(out)
    print(f"{out}  ({out.stat().st_size // 1024} KB)")

    if args.problem:
        conn = db()
        row = conn.execute("SELECT figures FROM problems WHERE id = ?", (args.problem,)).fetchone()
        if not row:
            sys.exit(f"problem {args.problem} 不存在")
        figs = json.loads(row["figures"] or "[]")
        figs.append({"file": name, "caption": args.caption})
        conn.execute("UPDATE problems SET figures = ? WHERE id = ?",
                     (json.dumps(figs, ensure_ascii=False), args.problem))
        conn.commit()
        print(f"→ 掛到 problem {args.problem}")


if __name__ == "__main__":
    main()
