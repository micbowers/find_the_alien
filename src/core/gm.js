// Game-Master narration system.
//
// Public API:
//   gmSpeak(eventKey, vars)  — enqueue a line for the GM to "say"
//   subscribe(callback)      — UI hook; callback(currentLine | null)
//   clear()                  — drop the queue (called at match reset)
//
// Lines are interpolated with the supplied vars: {team}, {hunts}, {n}, etc.
// Each event has 1–3 variant lines; one is picked at random.
//
// In Batch 1 the bubbles are text-only. Batch 2 will add audio (alien voice
// MP3s, SFX, optional pre-recorded GM narration).

const LINES = {
  match_start: [
    "Welcome, Earthlings! {hunts} aliens are hiding among the {board} on this field.",
    "Find {hunts} aliens by elimination — the team with the most kills wins.",
    "{teams} teams. {hunts} hunts. May the sharpest deducer win.",
  ],
  hunt_start: [
    "Hunt {n} of {total}. The alien is hiding…",
    "Round 'em up — Hunt {n} begins. Who can crack it fastest?",
    "{starter}, you start Hunt {n}. The alien is among them somewhere.",
  ],
  detective_won_hunt: [
    "{team} cracks Hunt {n}! The alien was {alien}.",
    "Boom — {team} narrows it down to {alien} on Hunt {n}.",
    "Hunt {n} solved by {team}. The alien was {alien} all along.",
  ],
  hunt_no_progress: [
    "All teams asked — and the alien is still hiding. {survivors} suspects remain. The alien was {alien}.",
  ],
  match_done: [
    "The match is over.",
    "And that's the match.",
  ],
  eliminator_champion: [
    "{team} is your Eliminator Champion — {count} aliens crossed off across {hunts} hunts.",
    "Most ruthless eliminator: {team}, with {count} aliens removed from suspicion.",
  ],
  no_eliminator_champion: [
    "No clear eliminator this match — see the standings below.",
  ],
};

const queue = [];
const listeners = new Set();
let current = null;
let timer = null;

const MIN_DURATION = 2500;
const MAX_DURATION = 6000;
const PER_CHAR_MS = 55;

function durationFor(text) {
  return Math.max(MIN_DURATION, Math.min(MAX_DURATION, text.length * PER_CHAR_MS));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function interpolate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, k) => {
    const v = vars[k];
    return v == null ? `{${k}}` : String(v);
  });
}

function notify() {
  for (const cb of listeners) {
    try { cb(current); } catch (e) { /* swallow */ }
  }
}

function pump() {
  if (current) return;
  if (queue.length === 0) return;
  current = queue.shift();
  notify();
  timer = setTimeout(() => {
    current = null;
    timer = null;
    notify();
    pump();
  }, durationFor(current));
}

export function gmSpeak(eventKey, vars = {}) {
  const variants = LINES[eventKey];
  if (!variants || variants.length === 0) return;
  const text = interpolate(pick(variants), vars);
  queue.push(text);
  pump();
}

export function subscribe(callback) {
  listeners.add(callback);
  // Fire immediately so a late subscriber sees the current line.
  try { callback(current); } catch (e) { /* swallow */ }
  return () => listeners.delete(callback);
}

export function clear() {
  queue.length = 0;
  if (timer) { clearTimeout(timer); timer = null; }
  current = null;
  notify();
}

// Force-advance: drop the current line, show the next (or nothing).
export function next() {
  if (timer) { clearTimeout(timer); timer = null; }
  current = null;
  notify();
  pump();
}
