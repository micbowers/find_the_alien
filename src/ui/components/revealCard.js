import { game } from '../../core/state.js';
import { renderAlienHTML } from '../../data/aliens.js';

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
  container.innerHTML = `
    <div class="answer-reveal ${cls}">
      <div class="answer-word">${word}</div>
      <div class="answer-sub">${escape(move.questionText)}</div>
      <div class="answer-sub">${elimLine}</div>
    </div>
  `;
}

function renderCelebration(container, move) {
  const secret = game.secretAlien;
  const huntIdx = game.match?.huntIndex ?? 1;
  const questionsThisHunt = game.moves.filter(m => m.type === 'ask').length;

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
        <b>${escape(move.teamName)}</b> cracked Hunt ${huntIdx}!
      </div>
      <div class="celebration-sub">
        ${questionsThisHunt} question${questionsThisHunt === 1 ? '' : 's'} to find the alien.
      </div>
    </div>
  `;
}

function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}
