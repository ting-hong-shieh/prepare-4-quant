"""Shared bits for the two ingestion passes.

Both passes are the same shape: show the model some page images, get back a
validated pydantic object. The provider behind that is swappable — Gemini by
default because 213 pages twice over is where the money in this project
actually goes.
"""
from __future__ import annotations

import base64
import json
import os
import pathlib
import sqlite3
from typing import Any, TypeVar

from pydantic import BaseModel

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ROOT / "data" / "pages"
EXTRACT = ROOT / "data" / "extract"
DB = ROOT / "data" / "quant.db"

PROVIDER = os.environ.get("INGEST_PROVIDER", "gemini").lower()
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.7-flash")
CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-opus-5")

T = TypeVar("T", bound=BaseModel)


def credentials_error() -> str | None:
    """None when the selected provider can actually be called."""
    if PROVIDER == "gemini":
        if not (os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")):
            return "沒有 GEMINI_API_KEY。設定之後再跑，或用 INGEST_PROVIDER=claude 搭配 ANTHROPIC_API_KEY。"
    elif PROVIDER == "claude":
        if not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")):
            return "沒有 ANTHROPIC_API_KEY。設定之後再跑，或用 INGEST_PROVIDER=gemini 搭配 GEMINI_API_KEY。"
    else:
        return f"不認得的 INGEST_PROVIDER：{PROVIDER}（可用：gemini, claude）"
    return None


def model_name() -> str:
    return GEMINI_MODEL if PROVIDER == "gemini" else CLAUDE_MODEL


def page_bytes(n: int) -> bytes:
    path = PAGES / f"p{n:04d}.png"
    if not path.exists():
        raise FileNotFoundError(f"{path} 不存在 —— 先跑 ingest/render_pages.py")
    return path.read_bytes()


def _b64(data: bytes) -> str:
    return base64.standard_b64encode(data).decode()


# ── providers ──────────────────────────────────────────────────────────────

def _gemini(system: str, pages: list[int], text: str, schema: type[T], effort: str) -> T:
    from google.genai import Client

    client = Client(api_key=os.environ.get("GEMINI_API_KEY") or os.environ["GOOGLE_API_KEY"])

    json_schema: dict[str, Any] = schema.model_json_schema()
    json_schema.pop("$schema", None)

    content: list[dict[str, Any]] = [
        {"type": "image", "mime_type": "image/png", "data": _b64(page_bytes(p))} for p in pages
    ]
    content.append({"type": "text", "text": text})

    res = client.interactions.create(
        model=GEMINI_MODEL,
        system_instruction=system,
        generation_config={"thinking_level": effort},
        response_format={"type": "text", "mime_type": "application/json", "schema": json_schema},
        input=content,
    )
    out = getattr(res, "output_text", None)
    if not out:
        raise RuntimeError("模型沒有回傳內容")
    return schema.model_validate(json.loads(out))


def _claude(system: str, pages: list[int], text: str, schema: type[T], effort: str) -> T:
    import anthropic

    content: list[dict[str, Any]] = [
        {
            "type": "image",
            "source": {"type": "base64", "media_type": "image/png", "data": _b64(page_bytes(p))},
        }
        for p in pages
    ]
    content.append({"type": "text", "text": text})

    res = anthropic.Anthropic().messages.parse(
        model=CLAUDE_MODEL,
        max_tokens=8000,
        system=system,
        output_config={"effort": effort},
        messages=[{"role": "user", "content": content}],
        output_format=schema,
    )
    if res.parsed_output is None:
        raise RuntimeError("解析失敗")
    return res.parsed_output


def structured(system: str, pages: list[int], text: str, schema: type[T], effort: str = "medium") -> T:
    """Show the model these pages, get back a validated `schema`.

    `effort` is the provider's own scale — Gemini's thinking_level and Claude's
    output_config.effort both take low / medium / high.
    """
    if PROVIDER == "gemini":
        return _gemini(system, pages, text, schema, effort)
    return _claude(system, pages, text, schema, effort)


def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn
