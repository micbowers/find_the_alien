#!/usr/bin/env python3
"""
Generate alien voice MP3s from tools/alien_voice_lines.json via OpenAI TTS.

Usage:
    OPENAI_API_KEY=sk-... python tools/generate_alien_voices.py

Output:
    public/audio/aliens/<lowercase-name>/<type>.mp3
    where <type> is one of: yes, no, found_me

Idempotent — files that already exist are skipped, so you can re-run
this safely after editing the JSON to regenerate just the changed lines
(delete the corresponding MP3 first).

Cost (as of 2026-04, OpenAI tts-1):
    $15 per 1M chars * 117 lines * ~12 chars/line ≈ $0.02 total
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

try:
    from openai import OpenAI
except ImportError:
    print("ERROR: 'openai' package not found. Install with:\n  pip install openai", file=sys.stderr)
    sys.exit(1)


REPO_ROOT = Path(__file__).resolve().parent.parent
LINES_PATH = REPO_ROOT / "tools" / "alien_voice_lines.json"
OUTPUT_ROOT = REPO_ROOT / "public" / "audio" / "aliens"
ENV_PATH = REPO_ROOT / ".env"
LINE_TYPES = ("yes", "no", "found_me")
SAFE_NAME_RE = re.compile(r"[^a-z0-9]")


def load_dotenv(path: Path) -> None:
    """Tiny .env loader. Mirrors python-dotenv's basic behavior so we don't
    need the package: KEY=VALUE per line, # comments allowed, optional quotes,
    existing env vars take precedence."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def safe_dir(name: str) -> str:
    """Match the URL convention used by audio.js — lowercase, alnum-only."""
    return SAFE_NAME_RE.sub("", name.lower())


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate alien voice MP3s.")
    parser.add_argument("--force", action="store_true", help="Re-generate even if MP3 exists.")
    parser.add_argument(
        "--only", help="Comma-separated alien names to generate (e.g. 'Zorp,Klax').",
    )
    parser.add_argument(
        "--types", default=",".join(LINE_TYPES),
        help=f"Comma-separated line types to generate. Default: {','.join(LINE_TYPES)}.",
    )
    args = parser.parse_args()

    load_dotenv(ENV_PATH)
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("ERROR: OPENAI_API_KEY env var is not set.", file=sys.stderr)
        print("Set it once for this shell:", file=sys.stderr)
        print("  export OPENAI_API_KEY=sk-...", file=sys.stderr)
        return 2

    if not LINES_PATH.exists():
        print(f"ERROR: {LINES_PATH} not found.", file=sys.stderr)
        return 2

    config = json.loads(LINES_PATH.read_text(encoding="utf-8"))
    model = config.get("model", "tts-1")
    fmt = config.get("format", "mp3")
    aliens = config.get("aliens", [])

    only = set()
    if args.only:
        only = {n.strip() for n in args.only.split(",") if n.strip()}
    types = [t.strip() for t in args.types.split(",") if t.strip()]
    bad_types = [t for t in types if t not in LINE_TYPES]
    if bad_types:
        print(f"ERROR: unknown line types: {bad_types}. Valid: {LINE_TYPES}", file=sys.stderr)
        return 2

    client = OpenAI(api_key=api_key)
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)

    total = 0
    generated = 0
    skipped = 0
    errors = 0
    for alien in aliens:
        name = alien.get("name")
        voice = alien.get("voice")
        lines = alien.get("lines", {})
        if not name or not voice:
            print(f"WARN: skipping malformed entry: {alien}")
            continue
        if only and name not in only:
            continue

        out_dir = OUTPUT_ROOT / safe_dir(name)
        out_dir.mkdir(parents=True, exist_ok=True)

        for line_type in types:
            text = lines.get(line_type)
            if not text:
                continue
            total += 1
            out_path = out_dir / f"{line_type}.{fmt}"
            if out_path.exists() and not args.force:
                skipped += 1
                continue

            try:
                resp = client.audio.speech.create(
                    model=model,
                    voice=voice,
                    input=text,
                    response_format=fmt,
                )
                # The OpenAI SDK exposes .stream_to_file() in older versions and
                # raw bytes in newer; handle both.
                if hasattr(resp, "stream_to_file"):
                    resp.stream_to_file(out_path)
                else:
                    out_path.write_bytes(resp.content)
                generated += 1
                print(f"  ✓ {name:>8s}  [{voice:>7s}]  {line_type:<9s}  {text!r}")
            except Exception as e:
                errors += 1
                print(f"  ✗ {name:>8s}  [{voice:>7s}]  {line_type:<9s}  ERROR: {e}", file=sys.stderr)

    print()
    print(f"Done. Total: {total}  Generated: {generated}  Skipped (already existed): {skipped}  Errors: {errors}")
    if errors:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
