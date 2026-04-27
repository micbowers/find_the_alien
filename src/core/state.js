import { generateAlienPool } from '../data/aliens.js';

const STORAGE_KEY = 'findthealien:state:v1';
const V0_KEY = 'findthealien:state';
const SCHEMA_VERSION = 1;

// game.match shape:
//   { huntIndex, totalHunts, currentRound, detectiveTrophies: [{huntIndex, teamId}] }
// game.teams shape:
//   [{id, name, elim, totalElim, totalTurns, detectiveCount}]
//   - elim         : eliminations during the current hunt (resets each hunt)
//   - totalElim    : eliminations across the whole match (cumulative)
//   - totalTurns   : turns taken across the whole match
//   - detectiveCount: hunts this team has won by narrowing to 1
export const game = {
  pool: [],
  board: [],
  secretAlien: null,
  teams: [],
  alive: new Set(),
  moves: [],
  started: false,
  huntWinner: null,        // team id that won the CURRENT hunt
  pendingReveal: null,
  currentTeamIndex: 0,
  match: null,
};

let v0Wiped = false;

export function wasV0Wiped() {
  return v0Wiped;
}

export function saveState() {
  try {
    const serial = {
      schemaVersion: SCHEMA_VERSION,
      board: game.board,
      secretAlien: game.secretAlien,
      teams: game.teams,
      alive: [...game.alive],
      moves: game.moves,
      started: game.started,
      huntWinner: game.huntWinner,
      pendingReveal: game.pendingReveal,
      currentTeamIndex: game.currentTeamIndex,
      match: game.match,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serial));
  } catch (e) { console.warn('save failed', e); }
}

export function loadState() {
  game.pool = generateAlienPool();

  try {
    if (localStorage.getItem(V0_KEY)) {
      localStorage.removeItem(V0_KEY);
      v0Wiped = true;
    }
  } catch (e) { /* ignore */ }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    if (s.schemaVersion !== SCHEMA_VERSION) return false;
    game.board = s.board || [];
    game.secretAlien = s.secretAlien;
    game.teams = s.teams || [];
    for (const t of game.teams) {
      if (typeof t.elim !== 'number') t.elim = 0;
      if (typeof t.totalElim !== 'number') t.totalElim = 0;
      if (typeof t.totalTurns !== 'number') t.totalTurns = 0;
      if (typeof t.detectiveCount !== 'number') t.detectiveCount = 0;
    }
    game.alive = new Set(s.alive || []);
    game.moves = s.moves || [];
    game.started = !!s.started;
    game.huntWinner = s.huntWinner ?? null;
    game.pendingReveal = s.pendingReveal ?? null;
    game.currentTeamIndex = s.currentTeamIndex ?? 0;
    game.match = s.match || null;
    return true;
  } catch (e) {
    console.warn('load failed', e);
    return false;
  }
}

export function resetEverything() {
  game.pool = generateAlienPool();
  game.board = [];
  game.secretAlien = null;
  game.teams = [];
  game.alive = new Set();
  game.moves = [];
  game.started = false;
  game.huntWinner = null;
  game.pendingReveal = null;
  game.currentTeamIndex = 0;
  game.match = null;
  saveState();
}

export function currentTeam() {
  return game.teams[game.currentTeamIndex] || null;
}
