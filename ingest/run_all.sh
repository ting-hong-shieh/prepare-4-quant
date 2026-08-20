#!/usr/bin/env bash
# Ingest the whole book: render → index → extract.
#
# Both passes resume, so re-running after an interruption picks up where it
# stopped rather than starting over or duplicating work. Safe to run again.
#
#   GEMINI_API_KEY=... ingest/run_all.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."

PY=.venv/bin/python
LOG=data/extract/run.log
mkdir -p data/extract

if [ ! -x "$PY" ]; then
  echo "找不到 $PY —— 先建 venv：python3 -m venv .venv && .venv/bin/pip install pymupdf google-genai pydantic" >&2
  exit 1
fi

echo "=== $(date '+%F %T') 開始 ===" | tee -a "$LOG"

rendered=$(ls data/pages/*.png 2>/dev/null | wc -l)
if [ "$rendered" -lt 1 ]; then
  echo "[1/3] 算圖…" | tee -a "$LOG"
  $PY ingest/render_pages.py 2>&1 | tee -a "$LOG"
else
  echo "[1/3] 已有 $rendered 頁，跳過算圖" | tee -a "$LOG"
fi

echo "[2/3] 掃結構（每頁一次，便宜）…" | tee -a "$LOG"
$PY ingest/scan_index.py 2>&1 | tee -a "$LOG"

echo "[3/3] 抽題目（每題自己的頁範圍）…" | tee -a "$LOG"
$PY ingest/extract.py 2>&1 | tee -a "$LOG"

echo "=== $(date '+%F %T') 完成 ===" | tee -a "$LOG"
echo
echo "抽出來的題目全部 verified=0。開 /review 一題一題校對過才算數。"
