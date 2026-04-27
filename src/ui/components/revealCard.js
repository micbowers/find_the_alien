// Render a YES/NO answer reveal card.
// move: { questionText, answer, eliminated, wonHuntByElimination, teamName }
export function renderRevealCard(container, move) {
  if (!container || !move) return;
  const cls = move.answer ? 'yes' : 'no';
  const word = move.answer ? 'YES' : 'NO';
  const elimLine = move.eliminated > 0
    ? `<span class="elim-count">${move.eliminated}</span> alien${move.eliminated === 1 ? '' : 's'} eliminated`
    : 'No new eliminations';
  const wonLine = move.wonHuntByElimination
    ? `<div class="answer-sub" style="margin-top:8px;font-weight:700;color:var(--yellow);">★ ${escape(move.teamName)} cracked the hunt!</div>`
    : '';
  container.innerHTML = `
    <div class="answer-reveal ${cls}">
      <div class="answer-word">${word}</div>
      <div class="answer-sub">${escape(move.questionText)}</div>
      <div class="answer-sub">${elimLine}</div>
      ${wonLine}
    </div>
  `;
}

function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}
