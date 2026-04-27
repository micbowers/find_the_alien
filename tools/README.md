# Tools

Content-generation utilities. These run locally; their outputs (MP3s) get committed to the repo and served as static assets via Vercel.

## generate_alien_voices.py

Generates voice clips for all 39 aliens via OpenAI's TTS API.

### Setup (one-time)

```bash
pip install openai
```

You need an OpenAI API key (separate from the Anthropic one used for `/api/interpret`). Get one at https://platform.openai.com/api-keys.

### Run

```bash
# From the repo root
export OPENAI_API_KEY=sk-...
python tools/generate_alien_voices.py
```

This reads `tools/alien_voice_lines.json` and writes MP3s to:

```
public/audio/aliens/<lowercase-alien-name>/yes.mp3
public/audio/aliens/<lowercase-alien-name>/no.mp3
public/audio/aliens/<lowercase-alien-name>/found_me.mp3
```

The script is **idempotent** — files that already exist are skipped. Total cost on `tts-1`: roughly $0.02 for the full corpus (~117 clips, ~12 chars each, $15/1M chars).

### Tweaking lines or voices

Edit `tools/alien_voice_lines.json`. Then:

- To regenerate a single alien:
  ```bash
  python tools/generate_alien_voices.py --only Zorp --force
  ```
- To regenerate just one line type for everyone:
  ```bash
  python tools/generate_alien_voices.py --types yes --force
  ```
- To force-regenerate everything (e.g. if you change voices):
  ```bash
  python tools/generate_alien_voices.py --force
  ```

### Voices

OpenAI TTS exposes 6 voices: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`. The current assignment in the JSON groups them roughly by alien color:

- **purple** aliens lean onyx, nova, alloy
- **orange** aliens lean echo, fable, nova
- **teal** aliens lean shimmer, alloy, fable

You can change any individual alien's `voice` in the JSON and rerun with `--force`.

### Commit the results

After generation, commit the new `public/audio/aliens/**/*.mp3` files. Vercel will serve them as static assets — no runtime cost, no API calls per playback.
