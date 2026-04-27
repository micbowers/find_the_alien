import { game } from '../../core/state.js';
import { renderAlienHTML } from '../../data/aliens.js';

const PB_KEY = 'findthealien:solo-best';

const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);

function readPB() {
  try {
    const raw = localStorage.getItem(PB_KEY);
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch { return null; }
}

function writePB(n) {
  try { localStorage.setItem(PB_KEY, String(n)); } catch { /* ignore */ }
}

export function renderSoloDoneScreen(container, { onPlayAgain, onHome }) {
  const score = game.teams[0]?.totalTurns ?? 0;
  const secret = game.secretAlien;
  const previousPB = readPB();
  const isFirstWin = previousPB == null;
  const isNewPB = !isFirstWin && score < previousPB;

  // Persist if new best (or first win).
  if (isFirstWin || isNewPB) writePB(score);

  let pbHtml;
  if (isFirstWin) {
    pbHtml = `
      <div class="solo-pb-badge is-new">
        🎯 First win recorded — your personal best is now <b>${score}</b>!
      </div>
    `;
  } else if (isNewPB) {
    pbHtml = `
      <div class="solo-pb-badge is-new">
        🏆 New personal best! Beat your previous of <b>${previousPB}</b> by <b>${previousPB - score}</b>.
      </div>
    `;
  } else if (score === previousPB) {
    pbHtml = `
      <div class="solo-pb-badge">
        Tied your personal best of <b>${previousPB}</b>.
      </div>
    `;
  } else {
    pbHtml = `
      <div class="solo-pb-badge">
        Personal best: <b>${previousPB}</b> · this run: <b>${score}</b>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="panel solo-done-card">
      <div class="solo-done-headline">🎯 You found ${escape(secret?.name ?? 'the alien')}!</div>

      <div class="solo-done-alien">
        <div class="alien-card celebration-alien-card">
          <div class="alien-svg-wrap">${secret ? renderAlienHTML(secret) : ''}</div>
          <div class="alien-name">${escape(secret?.name ?? '?')}</div>
        </div>
      </div>

      <div class="solo-result-stack">
        <div class="solo-score">
          <div class="solo-score-label">QUESTIONS ASKED</div>
          <div class="solo-score-value">${score}</div>
        </div>

        ${pbHtml}
      </div>

      <div class="solo-done-actions">
        <button class="btn big" id="sd-again">▶ Play again</button>
        <button class="btn outline" id="sd-home">← Home</button>
      </div>
    </div>
  `;

  container.querySelector('#sd-again').addEventListener('click', () => onPlayAgain && onPlayAgain());
  container.querySelector('#sd-home').addEventListener('click', () => onHome && onHome());
}
