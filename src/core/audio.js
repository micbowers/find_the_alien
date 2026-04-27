// Audio manager for SFX (synthesized via Web Audio API) and alien voice MP3s.
//
// - One global mute affecting both channels; persisted to localStorage.
// - AudioContext is created lazily on first interaction (iOS Safari's
//   autoplay policy requires a user gesture).
// - SFX are synthesized in code so we ship zero binary assets for them.
// - Alien voice MP3s live at /audio/aliens/<lower-name>/{yes,no,found_me}.mp3
//   and are preloaded only for the current hunt's secret alien.

const STORAGE_KEY = 'findthealien:muted';

let ctx = null;
let muted = readMuted();
const muteListeners = new Set();
let unlocked = false;

const alienAudioCache = new Map(); // key: `${alienName}:${type}` -> HTMLAudioElement

function readMuted() {
  try { return localStorage.getItem(STORAGE_KEY) === 'on'; } catch { return false; }
}

function writeMuted(m) {
  try { localStorage.setItem(STORAGE_KEY, m ? 'on' : 'off'); } catch { /* ignore */ }
}

export function isMuted() { return muted; }

export function setMuted(m) {
  muted = !!m;
  writeMuted(muted);
  for (const cb of muteListeners) {
    try { cb(muted); } catch { /* ignore */ }
  }
  // When muting mid-utterance, stop any playing alien clips immediately.
  if (muted) {
    for (const audio of alienAudioCache.values()) {
      try { audio.pause(); audio.currentTime = 0; } catch { /* ignore */ }
    }
  }
}

export function toggleMuted() { setMuted(!muted); }

export function subscribeMute(cb) {
  muteListeners.add(cb);
  try { cb(muted); } catch { /* ignore */ }
  return () => muteListeners.delete(cb);
}

// Lazy AudioContext singleton. Returns null if creation fails (very old browsers).
function ensureCtx() {
  if (ctx) return ctx;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}

// Call on the first user gesture. Resumes a suspended context (Safari/iOS).
// Idempotent — safe to call repeatedly.
export function unlockAudio() {
  if (unlocked) return;
  const c = ensureCtx();
  if (c && c.state === 'suspended') {
    c.resume().catch(() => { /* ignore */ });
  }
  unlocked = true;
}

// ============================================================
// SFX — synthesized in Web Audio
// ============================================================

const SFX = {
  eliminate: playEliminate,
  'reveal-yes': playRevealYes,
  'reveal-no': playRevealNo,
  'hunt-won': playHuntWon,
  'match-done': playMatchDone,
};

export function playSFX(name) {
  if (muted) return;
  const fn = SFX[name];
  if (!fn) return;
  const c = ensureCtx();
  if (!c) return;
  try { fn(c); } catch { /* ignore */ }
}

function playTone(c, freq, dur, opts = {}) {
  const { vol = 0.18, type = 'sine', startOffset = 0, attack = 0.01, decay = null } = opts;
  const t0 = c.currentTime + startOffset;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + attack);
  const decayStart = decay ?? attack;
  gain.gain.linearRampToValueAtTime(0, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function playSweep(c, fromHz, toHz, dur, opts = {}) {
  const { vol = 0.18, type = 'sine', startOffset = 0 } = opts;
  const t0 = c.currentTime + startOffset;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(fromHz, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, toHz), t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.linearRampToValueAtTime(0, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function playNoiseBurst(c, dur, opts = {}) {
  const { vol = 0.2, startOffset = 0, freq = 800 } = opts;
  const t0 = c.currentTime + startOffset;
  // Generate one buffer of white noise on the fly.
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(freq, t0);
  filter.frequency.exponentialRampToValueAtTime(120, t0 + dur);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.005);
  gain.gain.linearRampToValueAtTime(0, t0 + dur);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

function playEliminate(c) {
  playNoiseBurst(c, 0.18, { vol: 0.16, freq: 1200 });
}

function playRevealYes(c) {
  // Major-chord arpeggio: C5 → E5 → G5
  playTone(c, 523.25, 0.10, { type: 'triangle', vol: 0.16 });
  playTone(c, 659.25, 0.10, { type: 'triangle', vol: 0.16, startOffset: 0.07 });
  playTone(c, 783.99, 0.18, { type: 'triangle', vol: 0.18, startOffset: 0.14 });
}

function playRevealNo(c) {
  // Falling minor-third
  playTone(c, 392.00, 0.12, { type: 'square', vol: 0.12 });
  playTone(c, 311.13, 0.22, { type: 'square', vol: 0.14, startOffset: 0.10 });
}

function playHuntWon(c) {
  // Triumphant fanfare
  playTone(c, 523.25, 0.13, { type: 'triangle', vol: 0.18 });
  playTone(c, 659.25, 0.13, { type: 'triangle', vol: 0.18, startOffset: 0.13 });
  playTone(c, 783.99, 0.13, { type: 'triangle', vol: 0.18, startOffset: 0.26 });
  playTone(c, 1046.50, 0.32, { type: 'triangle', vol: 0.20, startOffset: 0.39 });
  playTone(c, 1318.51, 0.32, { type: 'triangle', vol: 0.18, startOffset: 0.39 });
}

function playMatchDone(c) {
  // Longer fanfare with a held final chord
  playTone(c, 523.25, 0.15, { type: 'triangle', vol: 0.18 });
  playTone(c, 659.25, 0.15, { type: 'triangle', vol: 0.18, startOffset: 0.16 });
  playTone(c, 783.99, 0.15, { type: 'triangle', vol: 0.18, startOffset: 0.32 });
  playTone(c, 880.00, 0.15, { type: 'triangle', vol: 0.18, startOffset: 0.48 });
  // Held finish chord
  playTone(c, 1046.50, 0.7, { type: 'triangle', vol: 0.16, startOffset: 0.66 });
  playTone(c, 1318.51, 0.7, { type: 'triangle', vol: 0.14, startOffset: 0.66 });
  playTone(c, 1567.98, 0.7, { type: 'triangle', vol: 0.12, startOffset: 0.66 });
}

// ============================================================
// Alien voice MP3s — preload on hunt start, play on reveal/celebrate
// ============================================================

// MP3 paths are derived from the alien's name (lowercase) and the line key.
// Move-quality buckets have 5 numbered variants each (great_move_1..5);
// found_me is a single un-numbered file.
const VARIANT_BUCKETS = ['great_move', 'okay_move', 'bad_move'];
const VARIANTS_PER_BUCKET = 5;

function urlFor(alienName, fileKey) {
  const safe = (alienName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `/audio/aliens/${safe}/${fileKey}.mp3`;
}

function ensureAudioElement(alienName, fileKey) {
  const key = `${alienName}:${fileKey}`;
  if (alienAudioCache.has(key)) return alienAudioCache.get(key);
  const audio = new Audio();
  audio.preload = 'auto';
  audio.src = urlFor(alienName, fileKey);
  // If load fails (file missing), the element silently sits idle; play() will reject.
  alienAudioCache.set(key, audio);
  return audio;
}

// Preload all line types for one alien (the current hunt's secret).
// 1 found_me + 5 × 3 variants = 16 audio elements.
// Idempotent — re-calling for the same alien is a no-op.
export function preloadAlienVoice(alienName) {
  if (!alienName) return;
  ensureAudioElement(alienName, 'found_me');
  for (const bucket of VARIANT_BUCKETS) {
    for (let i = 1; i <= VARIANTS_PER_BUCKET; i++) {
      ensureAudioElement(alienName, `${bucket}_${i}`);
    }
  }
}

// Drop cached <audio> elements for any alien other than the new secret.
// Called when a new hunt starts so we don't keep stale buffers around.
export function pruneAlienVoiceCacheExcept(alienName) {
  const keep = (alienName || '').toLowerCase();
  for (const key of [...alienAudioCache.keys()]) {
    const [name] = key.split(':');
    if (name.toLowerCase() !== keep) {
      const a = alienAudioCache.get(key);
      try { a.pause(); a.src = ''; } catch { /* ignore */ }
      alienAudioCache.delete(key);
    }
  }
}

// Track the most recently played variant per (alien, bucket) so we don't
// repeat the same line back-to-back. Reset on hunt change implicitly via
// alien-cache pruning, but the small Map below is fine to leave around.
const lastVariantByKey = new Map();

function pickNextVariant(alienName, bucket) {
  const key = `${alienName}:${bucket}`;
  const last = lastVariantByKey.get(key);
  let next;
  if (VARIANTS_PER_BUCKET <= 1) {
    next = 1;
  } else {
    do {
      next = 1 + Math.floor(Math.random() * VARIANTS_PER_BUCKET);
    } while (next === last);
  }
  lastVariantByKey.set(key, next);
  return next;
}

// Play a line for an alien. `type` is one of:
//   'found_me'                           — single-clip
//   'great_move' | 'okay_move' | 'bad_move' — picks one of 5 variants
// No-op when muted or when the file is missing on disk.
export function playAlienVoice(alienName, type) {
  if (muted || !alienName) return;
  let fileKey;
  if (type === 'found_me') {
    fileKey = 'found_me';
  } else if (VARIANT_BUCKETS.includes(type)) {
    const idx = pickNextVariant(alienName, type);
    fileKey = `${type}_${idx}`;
  } else {
    return;
  }
  const audio = ensureAudioElement(alienName, fileKey);
  try {
    audio.currentTime = 0;
    const p = audio.play();
    if (p && typeof p.catch === 'function') p.catch(() => { /* missing or blocked */ });
  } catch { /* ignore */ }
}
