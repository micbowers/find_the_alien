import { game } from '../../core/state.js';

const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);

export function renderEvidenceRail(container) {
  if (!container) return;
  container.innerHTML = `
    <h2>Evidence rail</h2>
    <div class="ev-sub">Latest at the top.</div>
    <div class="evidence-list" id="evidence-list"></div>
  `;
  const list = container.querySelector('#evidence-list');
  if (game.moves.length === 0) {
    list.innerHTML = '<div class="ev-empty">No questions yet — ask one to start eliminating.</div>';
    return;
  }
  const reversed = [...game.moves].reverse();
  reversed.forEach((move, i) => {
    const turnNum = game.moves.length - i;
    const div = document.createElement('div');
    div.className = 'ev-item ' + (move.answer ? 'yes' : 'no');
    div.innerHTML = `
      <div class="ev-top">
        <span class="team">${escape(move.teamName)}</span>
        <span>T${turnNum}</span>
        <span class="elim">-${move.eliminated}</span>
      </div>
      <div class="ev-q">${escape(move.questionText)}
        <span class="ev-a">${move.answer ? 'YES' : 'NO'}</span>
      </div>
    `;
    list.appendChild(div);
  });
}
