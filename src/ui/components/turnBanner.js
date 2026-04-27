import { game, currentTeam } from '../../core/state.js';

export function renderTurnBanner(container) {
  if (!container) return;
  if (!game.started || game.huntWinner) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }
  container.style.display = '';
  const team = currentTeam();
  const turnNum = game.moves.length + 1;
  const round = game.match?.currentRound ?? 1;
  const huntIdx = game.match?.huntIndex ?? 1;
  const totalHunts = game.match?.totalHunts ?? 1;
  container.innerHTML = `
    <div class="turn-banner">
      <div class="turn-num">HUNT ${huntIdx}/${totalHunts} · R${round} · T${turnNum}</div>
      <div class="team-name">${escape(team ? team.name : '—')}</div>
      <div class="turn-sub">your turn — ask a question</div>
    </div>
  `;
}

function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}
