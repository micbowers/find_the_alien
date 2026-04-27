#!/usr/bin/env python3
"""
Generate alien voice MP3s from tools/alien_voice_lines.json via OpenAI TTS.

Output:
    public/audio/aliens/<lowercase-name>/found_me.mp3
    public/audio/aliens/<lowercase-name>/great_move_1.mp3 ... great_move_5.mp3
    public/audio/aliens/<lowercase-name>/okay_move_1.mp3  ... okay_move_5.mp3
    public/audio/aliens/<lowercase-name>/bad_move_1.mp3   ... bad_move_5.mp3

Per alien: 16 clips. Total: 39 × 16 = 624 clips.

The shared move-quality lines live at the top of the JSON (`shared_lines`)
so we don't repeat 15 phrases × 39 aliens = 585 times. Each alien gets all
five variants per bucket rendered in their assigned voice.

Usage:
    OPENAI_API_KEY=sk-... python tools/generate_alien_voices.py
    OPENAI_API_KEY=sk-... python tools/generate_alien_voices.py --force
    OPENAI_API_KEY=sk-... python tools/generate_alien_voices.py --only Zorp,Klax

Idempotent — files that already exist are skipped unless --force.
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
BUCKETS = ("great_move", "okay_move", "bad_move")
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


def synth(client: OpenAI, *, model: str, voice: str, text: str, instructions: str | None,
          fmt: str, out_path: Path) -> None:
    """Call the TTS API and write the MP3 to out_path."""
    kwargs = dict(model=model, voice=voice, input=text, response_format=fmt)
    # gpt-4o-mini-tts supports an `instructions` field for tone/style steering.
    # Older models (tts-1) do not — pass only when set and supported.
    if instructions and "gpt-4o" in model:
        kwargs["instructions"] = instructions
    resp = client.audio.speech.create(**kwargs)
    if hasattr(resp, "stream_to_file"):
        resp.stream_to_file(out_path)
    else:
        out_path.write_bytes(resp.content)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate alien voice MP3s.")
    parser.add_argument("--force", action="store_true", help="Re-generate even if MP3 exists.")
    parser.add_argument("--only", help="Comma-separated alien names to generate (e.g. 'Zorp,Klax').")
    parser.add_argument(
        "--types", default=",".join(("found_me",) + BUCKETS),
        help="Comma-separated line types to generate (found_me, great_move, okay_move, bad_move).",
    )
    args = parser.parse_args()

    load_dotenv(ENV_PATH)
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("ERROR: OPENAI_API_KEY env var is not set. Add it to .env or export it.", file=sys.stderr)
        return 2

    if not LINES_PATH.exists():
        print(f"ERROR: {LINES_PATH} not found.", file=sys.stderr)
        return 2

    config = json.loads(LINES_PATH.read_text(encoding="utf-8"))
    model = config.get("model", "gpt-4o-mini-tts")
    fmt = config.get("format", "mp3")
    global_instructions = config.get("instructions")
    shared_lines = config.get("shared_lines", {})
    aliens = config.get("aliens", [])

    only = set()
    if args.only:
        only = {n.strip() for n in args.only.split(",") if n.strip()}
    requested_types = [t.strip() for t in args.types.split(",") if t.strip()]
    valid_types = {"found_me"} | set(BUCKETS)
    bad_types = [t for t in requested_types if t not in valid_types]
    if bad_types:
        print(f"ERROR: unknown line types: {bad_types}. Valid: {sorted(valid_types)}", file=sys.stderr)
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
        if not name or not voice:
            print(f"WARN: skipping malformed entry: {alien}", file=sys.stderr)
            continue
        if only and name not in only:
            continue

        # Per-alien instructions override the global instructions.
        instructions = alien.get("instructions") or global_instructions
        out_dir = OUTPUT_ROOT / safe_dir(name)
        out_dir.mkdir(parents=True, exist_ok=True)

        # Build the work list: (line_type, variant_idx_or_None, text, out_path)
        work = []
        if "found_me" in requested_types and alien.get("found_me"):
            work.append(("found_me", None, alien["found_me"], out_dir / "found_me.mp3"))
        for bucket in BUCKETS:
            if bucket not in requested_types:
                continue
            variants = shared_lines.get(bucket, [])
            for i, text in enumerate(variants, start=1):
                work.append((bucket, i, text, out_dir / f"{bucket}_{i}.mp3"))

        for line_type, idx, text, out_path in work:
            total += 1
            if out_path.exists() and not args.force:
                skipped += 1
                continue
            label = f"{line_type}" if idx is None else f"{line_type}_{idx}"
            try:
                synth(client, model=model, voice=voice, text=text,
                      instructions=instructions, fmt=fmt, out_path=out_path)
                generated += 1
                print(f"  [ok]  {name:>8s}  [{voice:>7s}]  {label:<13s}  {text!r}")
            except Exception as e:
                errors += 1
                print(f"  [ERR] {name:>8s}  [{voice:>7s}]  {label:<13s}  {e}", file=sys.stderr)

    print()
    print(f"Done. Total: {total}  Generated: {generated}  Skipped: {skipped}  Errors: {errors}")
    return 0 if errors == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
