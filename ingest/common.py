"""Shared bits for the two ingestion passes."""
from __future__ import annotations

import base64
import pathlib
import sqlite3

import anthropic

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ROOT / "data" / "pages"
EXTRACT = ROOT / "data" / "extract"
DB = ROOT / "data" / "quant.db"

DEFAULT_MODEL = "claude-opus-5"


def client() -> anthropic.Anthropic:
    # Resolves ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, or an `ant auth login`
    # profile — no key is read or stored by this project.
    return anthropic.Anthropic()


def page_image(n: int) -> dict:
    path = PAGES / f"p{n:04d}.png"
    if not path.exists():
        raise FileNotFoundError(f"{path} 不存在 —— 先跑 ingest/render_pages.py")
    return {
        "type": "image",
        "source": {
            "type": "base64",
            "media_type": "image/png",
            "data": base64.standard_b64encode(path.read_bytes()).decode(),
        },
    }


def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn
