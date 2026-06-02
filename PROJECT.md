# Find The Alien — project handbook

A Sparkworks deduction game. The web port of the classroom game; the computer is the game master. Live at **https://findthealien.sparkworks.kids**.

> This is the per-game project handbook (a reference doc, not an agent — there is no CLAUDE.md here). The owning agent is **Sparkworks Web Games** at `../../CLAUDE.md` (the umbrella, two levels up) — read that for org-wide config, interaction protocols with other Cairn agents, and the shared web-game conventions. This file is the game-specific reference.

## What it is

Two play modes:
- **Team Match** — multiple teams take turns asking yes/no questions about a hidden alien. Two trophies per match: **🏆 Eliminator Champion** (most cumulative eliminations) and **🕵️ Detective** (per-hunt prize for the team that narrowed the pool to 1).
- **Solo Score-Attack** — one player, one alien, fewest questions wins. Personal best in localStorage.

The pedagogical core: **kids learn by eliminating possibilities efficiently**. There is no "guess the alien" mechanic — the only path is elimination.

## Game model & terminology

Four nested levels — match, hunt, round, turn. The naming matters:

- **Match** — one game session. N hunts where N = number of teams (auto-derived).
- **Hunt** — one secret-alien pursuit. Continues round-by-round until the alive pool narrows to 1.
- **Round** — one cycle through all teams. Each team asks one question per round.
- **Turn** — one team's action (always: ask a question).

Solo collapses to 1 team / 1 hunt; the same engine handles it.

## Tech stack

- **Vanilla JS + Vite** for the front-end. No React. ES modules across `src/`.
- **Vercel** for hosting + serverless functions + custom domain + analytics.
- **Claude Haiku 4.5** (via the Anthropic SDK in a Vercel function) maps free-form player questions to the canned attribute catalog.
- **OpenAI gpt-4o-mini-tts** (run locally, one-off) generates kid-aged cartoon-alien voice MP3s shipped as static assets.
- **Web Audio API** for synthesized SFX (no MP3 assets for those).
- **localStorage** for game state restore + Elimination Coach toggle + mute + solo personal best.

## Directory map

```
FindAlienApp/
├── PROJECT.md, README, package.json, vite.config.js, vercel.json, .env.example, .gitignore
├── public/
│   ├── aliens/              # 39 alien PNGs, served at /aliens/<file>.png
│   └── audio/aliens/<name>/ # 16 voice clips per alien
├── src/
│   ├── main.js              # entry: imports CSS, injects analytics, mounts app
│   ├── styles/              # tokens, base, layout, components, theatrics
│   ├── data/
│   │   ├── aliens.js        # EMBEDDED_ALIENS — 39 aliens, canonical attribute data
│   │   └── questions.js     # buildQuestionBank() — ~75 yes/no questions w/ check() preds
│   ├── core/
│   │   ├── state.js         # `game` store + load/save (localStorage v1 schema)
│   │   ├── engine.js        # startMatch, startSoloMatch, commitAsk, endHunt, etc.
│   │   ├── prefs.js, audio.js, gm.js, llm.js
│   └── ui/
│       ├── app.js           # Top-level controller, screen routing
│       ├── screens/         # home, setup, play, matchDone, soloDone
│       └── components/      # alienGrid, evidenceRail, scoreboard, etc.
├── api/
│   └── interpret.js         # POST /api/interpret — Claude Haiku 4.5 question mapper
├── lib/                     # imported by api/: prompts.js, rateLimit.js, cors.js
├── tools/                   # Local content-generation scripts (alien voice gen)
├── archive/findthealien-v0.html
└── workflows/               # (Reserved for content-generation SOPs; minimal today.)
```

## Run / build / deploy

```bash
npm install                  # one-time
npm run dev                  # vite dev server at localhost:5173
                             # /api/interpret won't work without `vercel dev`;
                             # the client falls back to the canned question list
npm run build                # production build to dist/
git push                     # Vercel auto-deploys main → findthealien.sparkworks.kids
```

Env vars (set in Vercel project settings, NOT committed):
- `ANTHROPIC_API_KEY` — used by the Vercel function. Required in production. Org-wide key per `env.shared.example`.
- `OPENAI_API_KEY` — used only by `tools/generate_alien_voices.py` locally. Goes in `.env`.

## Common tasks

**Regenerate alien voice MP3s** (e.g. after changing a line in `tools/alien_voice_lines.json`):
```bash
python tools/generate_alien_voices.py --force
python tools/generate_alien_voices.py --only Zorp --force
```
Cost: ~$0.55 to regenerate the full 624-clip corpus via gpt-4o-mini-tts.

**Tweak the LLM interpreter prompt**: edit `lib/prompts.js`. The question catalog is generated at runtime from `src/data/questions.js`, so prompt and runtime checks can never drift.

> **Color design note:** the only alien colors are **teal, orange, purple** — there is no blue or green attribute. The teal aliens read as blue on some screens and green on others, so the prompt deliberately maps **blue / green / teal** (and cyan, turquoise, aqua, etc.) all to `color_teal`. Don't add a separate blue or green question; keep the synonym merge in `lib/prompts.js` (orange/purple have their own synonym groups there too).

**Add or remove an alien attribute**: requires changes in three places:
1. Add the field to every entry in `src/data/aliens.js`.
2. Add a question (with a `check()` predicate) in `src/data/questions.js`.
3. Add a language hint in `lib/prompts.js` so the LLM maps casual phrasings to the new question id.

**Change the audio mix**: SFX synthesized in `src/core/audio.js` (Web Audio API — no MP3s). Alien voices are pre-rendered MP3s.

**Adjust quality-bucket thresholds for alien commentary**: edit the `fraction >= 0.40 ? 'great_move' : ...` ladder in `src/ui/screens/play.js`.

## Secret-integrity property

The Vercel function never knows which alien is the secret. It only maps free-form text → question id (`color_teal`, `eyes_2`, etc.). The browser computes YES/NO locally by running the canned `check()` predicate against `game.secretAlien`. So sniffed network traffic shows "player asked about teal" but never reveals which alien anyone is hunting. The function is also stateless.

## Defenses on /api/interpret

- **Rate limit**: 30 calls per IP per 5 minutes (in-memory; per-instance, best-effort).
- **CORS / Origin guard**: only requests from the production domain, Vercel previews, or localhost.
- **Input validation**: 200-char max, JSON only, response parsed + validated server-side (unknown ids dropped, fields clamped).
- **Output ceiling**: 400 max tokens per call (~$0.001 each).
- **Anthropic spending cap**: set in the Anthropic console.

This is the reference defense pattern for the Sparkworks Web Games umbrella — sibling games adding any `/api/*` function with LLM or external-API calls should match it.

## Conventions when changing this code

- **Don't break the secret-integrity property.** The Vercel function must never receive `game.secretAlien` or compute the answer.
- **Keep the engine pure-logic.** UI events fire `commitAsk(qid)` etc.; the engine doesn't know about DOM. Audio/animation hooks live in `src/ui/screens/play.js` after the engine call.
- **localStorage schema changes need a migration.** The current schema key is `findthealien:state:v1`. Bump to v2 and wipe v1 if you change the shape.
- **No new top-level dependencies without a reason.** The whole app is ~57 KB JS gzipped + ~5 KB CSS. React would 4× the bundle.
