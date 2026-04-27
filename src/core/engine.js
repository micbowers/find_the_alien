import { game, saveState, currentTeam, resetEverything } from './state.js';
import { sampleAliens } from '../data/aliens.js';
import { QUESTIONS, QUESTIONS_BY_ID } from '../data/questions.js';

// ============================================================
// MATCH LIFECYCLE
// ============================================================

// Start a new match.
//   teamNames: array of strings
//   opts.mode: 'team' | 'solo' (default 'team')
// Initializes board (24 random aliens), picks secret, sets up match state.
export function startMatch(teamNames, opts = {}) {
  if (!teamNames || teamNames.length === 0) {
    throw new Error('startMatch requires at least one team name');
  }
  game.board = sampleAliens(game.pool, 24);
  game.alive = new Set(game.board.map(a => a.name));
  game.moves = [];
  game.started = true;
  game.huntWinner = null;
  game.pendingReveal = null;
  game.currentTeamIndex = 0;
  game.mode = opts.mode === 'solo' ? 'solo' : 'team';

  game.teams = teamNames.map((name, i) => ({
    id: 't' + (i + 1) + '_' + Date.now(),
    name: name.trim() || `Team ${i + 1}`,
    elim: 0,
    totalElim: 0,
    totalTurns: 0,
    detectiveCount: 0,
  }));

  game.match = {
    huntIndex: 1,
    totalHunts: game.teams.length,
    currentRound: 1,
    detectiveTrophies: [],
  };

  // Computer picks the first secret from the board.
  const idx = Math.floor(Math.random() * game.board.length);
  game.secretAlien = game.board[idx];

  saveState();
}

// Start a solo score-attack match. Wraps startMatch with a single
// implicit "You" team and mode='solo'. Match ends after a single hunt
// because totalHunts = teams.length = 1.
export function startSoloMatch() {
  startMatch(['You'], { mode: 'solo' });
}

// Restart the current match keeping the same team names. Wipes all scores
// and progress. Used by the play-screen "Restart match → Keep teams" flow
// and the match-done screen "Play again — same teams" button.
export function restartMatchKeepTeams() {
  const names = game.teams.map(t => t.name);
  const mode = game.mode;
  resetEverything();
  if (names.length > 0) {
    startMatch(names, { mode });
  }
}

// ============================================================
// TURN MECHANICS
// ============================================================

// commitAsk: a team asks a question; compute answer from the secret and
// eliminate aliens that don't match. If the pool narrows to 1, that team
// wins the Detective trophy for this hunt.
export function commitAsk(questionId) {
  const team = currentTeam();
  if (!team) throw new Error('No active team');
  const q = QUESTIONS_BY_ID[questionId];
  if (!q) throw new Error(`Unknown question: ${questionId}`);
  if (game.huntWinner) throw new Error('Hunt already won — call endHunt before asking again');

  const answer = q.check(game.secretAlien);

  // Aliens that match the answer survive; the rest are eliminated.
  const before = game.alive.size;
  const newAlive = new Set();
  for (const alien of game.board) {
    if (!game.alive.has(alien.name)) continue;
    if (q.check(alien) === answer) newAlive.add(alien.name);
  }
  const eliminated = before - newAlive.size;
  const wonHuntByElimination = (newAlive.size === 1);

  const move = {
    team: team.id,
    teamName: team.name,
    type: 'ask',
    questionId: q.id,
    questionText: q.text,
    answer,
    eliminated,
    wonHuntByElimination,
    huntIndex: game.match.huntIndex,
    round: game.match.currentRound,
  };
  game.moves.push(move);
  team.elim += eliminated;
  team.totalTurns += 1;
  game.alive = newAlive;
  if (wonHuntByElimination) {
    game.huntWinner = team.id;
  }
  game.pendingReveal = { ...move, kind: 'ask' };
  saveState();
  return move;
}

// Called after the reveal screen is dismissed. If the hunt was won,
// transitions to between-hunts (or match-done). Otherwise advances the turn.
// Returns one of: 'continue' | 'between-hunts' | 'match-done'.
export function continueAfterReveal() {
  game.pendingReveal = null;
  if (game.huntWinner) {
    return endHunt();
  }
  advanceTurn();
  saveState();
  return 'continue';
}

// Move to the next team's turn. If we wrap back to the hunt's starting
// team (index 0), we've completed a round — increment currentRound.
function advanceTurn() {
  if (game.teams.length === 0) return;
  game.currentTeamIndex = (game.currentTeamIndex + 1) % game.teams.length;
  if (game.currentTeamIndex === 0) {
    game.match.currentRound += 1;
  }
}

// ============================================================
// HUNT LIFECYCLE
// ============================================================

// Hunt is over (someone narrowed pool to 1). Fold round-local elim counts
// into match totals, record the detective trophy, and decide whether the
// match continues or ends.
export function endHunt() {
  if (!game.match || !game.huntWinner) {
    throw new Error('endHunt called without an active hunt-winner');
  }

  // Accumulate elim into match totals (totalTurns is already accumulated per-ask).
  for (const t of game.teams) {
    t.totalElim += t.elim;
  }
  // Detective trophy
  const winnerTeam = game.teams.find(t => t.id === game.huntWinner);
  if (winnerTeam) winnerTeam.detectiveCount += 1;
  game.match.detectiveTrophies.push({
    huntIndex: game.match.huntIndex,
    teamId: game.huntWinner,
    secretAlienName: game.secretAlien?.name ?? null,
  });

  // Reset round-local counters for the next hunt
  for (const t of game.teams) t.elim = 0;
  game.moves = [];

  saveState();

  // Last hunt? Match is done.
  if (game.match.huntIndex >= game.match.totalHunts) {
    return 'match-done';
  }
  return 'between-hunts';
}

// Called when the user clicks "Start next hunt" between hunts.
// Rotates team order by 1 (so a different team starts each hunt),
// refreshes half the board with new aliens, picks a fresh secret.
export function startNextHunt() {
  if (!game.match) throw new Error('No match in progress');
  if (game.match.huntIndex >= game.match.totalHunts) {
    throw new Error('Match already complete');
  }

  // Rotate team order: first team goes to the back. This is the
  // inter-hunt rotation that ensures every team starts exactly one hunt.
  const first = game.teams.shift();
  game.teams.push(first);

  game.huntWinner = null;
  game.pendingReveal = null;
  game.currentTeamIndex = 0;
  game.match.huntIndex += 1;
  game.match.currentRound = 1;

  // Half-board refresh: swap 12 of the 24 aliens for fresh ones from the pool.
  // Kept aliens stay in place, creating visual continuity.
  const swapCount = Math.min(12, game.board.length);
  const positions = Array.from({ length: game.board.length }, (_, i) => i);
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  const swapPositions = new Set(positions.slice(0, swapCount));
  const onBoardNames = new Set(game.board.map(a => a.name));
  const candidates = game.pool.filter(a => !onBoardNames.has(a.name));
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const replacements = candidates.slice(0, swapCount);
  game.board = game.board.map((alien, i) => {
    if (swapPositions.has(i)) return replacements.shift() || alien;
    return alien;
  });

  game.alive = new Set(game.board.map(a => a.name));
  const idx = Math.floor(Math.random() * game.board.length);
  game.secretAlien = game.board[idx];

  saveState();
}

// ============================================================
// UNDO
// ============================================================

// Undoes the most recent ask within the current hunt. Replays remaining
// history from a clean alive set to keep state consistent.
// Cannot undo across hunts (totals are folded in at hunt end).
export function undoLastMove() {
  if (!game.moves.length) return false;
  if (game.huntWinner) return false; // Hunt's already over; would need to undo endHunt too.

  game.moves.pop();
  game.alive = new Set(game.board.map(a => a.name));
  for (const t of game.teams) t.elim = 0;
  game.huntWinner = null;
  // Recompute currentTeamIndex/currentRound from the move log
  game.currentTeamIndex = 0;
  game.match.currentRound = 1;
  // Recompute totalTurns from scratch for this match (kept simple)
  for (const t of game.teams) t.totalTurns = 0;

  for (const m of game.moves) {
    const t = game.teams.find(x => x.id === m.team);
    if (m.type !== 'ask') continue;
    const q = QUESTIONS.find(x => x.id === m.questionId);
    if (!q) continue;
    const newAlive = new Set();
    for (const alien of game.board) {
      if (!game.alive.has(alien.name)) continue;
      if (q.check(alien) === m.answer) newAlive.add(alien.name);
    }
    if (t) {
      t.elim += game.alive.size - newAlive.size;
      t.totalTurns += 1;
    }
    game.alive = newAlive;
    advanceTurn();
  }

  game.pendingReveal = null;
  saveState();
  return true;
}
