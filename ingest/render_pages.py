#!/usr/bin/env python3
"""PDF → page PNGs, sized for a vision model rather than for print.

The scan is ~600 dpi bilevel, which is far more than the model can use: images
are downsampled to about 1568px on the long edge before they are read. Render
straight to that size instead of shipping 15 MB of pixels that get thrown away.

    python ingest/render_pages.py [--dpi-target 1568] [--pages 1-213]
"""
import argparse
import pathlib
import sys

try:
    import pymupdf
except ImportError:
    sys.exit("pymupdf 沒裝。跑：.venv/bin/pip install pymupdf，並用 .venv/bin/python 執行。")

ROOT = pathlib.Path(__file__).resolve().parent.parent
DEFAULT_PDF = next(iter(sorted(ROOT.glob("*.pdf"))), None)


def parse_range(spec: str, n: int) -> range:
    if not spec:
        return range(n)
    lo, _, hi = spec.partition("-")
    return range(int(lo) - 1, int(hi or lo))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", default=str(DEFAULT_PDF) if DEFAULT_PDF else None)
    ap.add_argument("--out", default=str(ROOT / "data" / "pages"))
    ap.add_argument("--long-edge", type=int, default=1568,
                    help="target pixels on the long edge (the vision model's own cap)")
    ap.add_argument("--pages", default="", help='e.g. "1-20" (1-indexed, inclusive)')
    args = ap.parse_args()

    if not args.pdf:
        sys.exit("找不到 PDF —— 用 --pdf 指定路徑。")

    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    doc = pymupdf.open(args.pdf)
    todo = parse_range(args.pages, doc.page_count)
    written = 0
    for i in todo:
        page = doc[i]
        long_pt = max(page.rect.width, page.rect.height)
        zoom = args.long_edge / long_pt
        pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), colorspace=pymupdf.csGRAY)
        path = out / f"p{i + 1:04d}.png"
        pix.save(path)
        written += 1
        if written % 25 == 0:
            print(f"  {written}/{len(todo)}…", flush=True)

    print(f"{written} 頁 → {out}")


if __name__ == "__main__":
    main()
