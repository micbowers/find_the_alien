import { game } from '../../core/state.js';
import { renderAlienHTML } from '../../data/aliens.js';
import { getCoachOn } from '../../core/prefs.js';

// Render either the standard YES/NO answer card OR, when the move ended the
// hunt (wonHuntByElimination), the big celebration card. Phase 4 will layer
// SFX, alien voice "YOU FOUND ME!", and confetti on top of this layout.
//
// move: { questionText, answer, eliminated, wonHuntByElimination, teamName }
export function renderRevealCard(container, move) {
  if (!container || !move) return;

  if (move.wonHuntByElimination) {
    renderCelebration(container, move);
    return;
  }

  const cls = move.answer ? 'yes' : 'no';
  const word = move.answer ? 'YES' : 'NO';
  const elimLine = move.eliminated > 0
    ? `<span class="elim-count">${move.eliminated}</span> alien${move.eliminated === 1 ? '' : 's'} eliminated`
    : 'No new eliminations';

  // Coach quality line — same 0.40 / 0.15 thresholds as the alien voice
  // ladder in play.js so the spoken and written feedback stay in sync.
  // aliveBefore reconstructs from current alive + this move's eliminations
  // (commitAsk has already shrunk game.alive by move.eliminated).
  let coachLine = '';
  if (getCoachOn()) {
    const aliveBefore = game.alive.size + move.eliminated;
    const fraction = aliveBefore > 0 ? move.eliminated / aliveBefore : 0;
    const pct = Math.round(fraction * 100);
    let qualityText;
    if (move.eliminated === 0) {
      qualityText = `That didn't help — no aliens eliminated.`;
    } else if (fraction >= 0.40) {
      qualityText = `Excellent move! You eliminated ${pct}% of the aliens.`;
    } else if (fraction >= 0.15) {
      qualityText = `Decent move — you eliminated ${pct}% of the aliens.`;
    } else {
      qualityText = `Not a great question — you only eliminated ${pct}% of the aliens.`;
    }
    coachLine = `<div class="answer-coach">${qualityText}</div>`;
  }

  container.innerHTML = `
    <div class="answer-reveal ${cls}">
      <div class="answer-word">${word}</div>
      <div class="answer-sub">${escape(move.questionText)}</div>
      <div class="answer-sub">${elimLine}</div>
      ${coachLine}
    </div>
  `;
}

function renderCelebration(container, move) {
  const secret = game.secretAlien;
  const huntIdx = game.match?.huntIndex ?? 1;
  const questionsThisHunt = game.moves.filter(m => m.type === 'ask').length;
  const isSolo = game.mode === 'solo';

  if (isSolo) {
    // Solo: simple celebration, no detective/leader chrome — those framings
    // imply competition. The SoloDone screen takes over with score + PB next.
    container.innerHTML = `
      <div class="celebration-card">
        <div class="celebration-headline">YOU FOUND ME!</div>
        <div class="celebration-alien">
          <div class="alien-card celebration-alien-card">
            <div class="alien-svg-wrap">${secret ? renderAlienHTML(secret) : ''}</div>
            <div class="alien-name">${escape(secret?.name ?? '?')}</div>
          </div>
        </div>
        <div class="celebration-line">
          Found ${escape(secret?.name ?? 'the alien')} in <b>${questionsThisHunt}</b> question${questionsThisHunt === 1 ? '' : 's'}!
        </div>
      </div>
    `;
    return;
  }

  // Team mode: full Detective trophy framing + running Eliminator Champion.
  // Identify the running Eliminator Champion (most cumulative elims so far,
  // INCLUDING this hunt's eliminations which haven't yet been folded into
  // totalElim — endHunt does that on Continue).
  const runningElims = game.teams.map(t => ({
    team: t,
    elim: t.totalElim + (t.elim || 0),
  }));
  runningElims.sort((a, b) => b.elim - a.elim);
  const top = runningElims[0];
  const championLine = top && top.elim > 0
    ? `<div class="celebration-champion">🏆 Match leader: <b>${escape(top.team.name)}</b> with ${top.elim} eliminations</div>`
    : '';

  container.innerHTML = `
    <div class="celebration-card">
      <div class="celebration-trophy-label">🕵️ HUNT ${huntIdx} DETECTIVE TROPHY</div>
      <div class="celebration-headline">YOU FOUND ME!</div>
      <div class="celebration-alien">
        <div class="alien-card celebration-alien-card">
          <div class="alien-svg-wrap">${secret ? renderAlienHTML(secret) : ''}</div>
          <div class="alien-name">${escape(secret?.name ?? '?')}</div>
        </div>
      </div>
      <div class="celebration-line">
        <b>${escape(move.teamName)}</b> cracked Hunt ${huntIdx}!
      </div>
      <div class="celebration-sub">
        ${questionsThisHunt} question${questionsThisHunt === 1 ? '' : 's'} to find the alien.
      </div>
      ${championLine}
    </div>
  `;
}

function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}
