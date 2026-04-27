import { game } from '../../core/state.js';

const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);

// Renders the cumulative scoreboard.
// opts:
//   highlightDetective: boolean — show ROUND badge for current huntWinner
//   highlightLeader: boolean — show LEADER badge on the team with the most cumulative elims
//   activeTeamId: string|null — show UP NEXT badge on this team
export function renderScoreboard(container, opts = {}) {
  if (!container) return;
  const { highlightDetective, highlightLeader, activeTeamId } = opts;

  // totalTurns is incremented in commitAsk per-ask, so it's a live cumulative count.
  // totalElim is folded in at endHunt; current-hunt eliminations live in t.elim
  // until endHunt, so show totalElim + elim for the running display.
  const rows = game.teams.map(t => ({
    team: t,
    turns: t.totalTurns,
    elim: t.totalElim + (t.elim || 0),
    detective: t.detectiveCount || 0,
  }));

  const topElim = rows.length ? Math.max(...rows.map(r => r.elim)) : 0;

  container.innerHTML = `
    <table class="scoreboard">
      <thead>
        <tr>
          <th>TEAM</th>
          <th>TURNS</th>
          <th>ELIMINATED</th>
          <th>DETECTIVES</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  `;
  const tbody = container.querySelector('tbody');

  for (const row of rows) {
    const isDetective = highlightDetective && game.huntWinner === row.team.id;
    const isLeader = highlightLeader && row.elim === topElim && topElim > 0;
    const isNextUp = !!activeTeamId && row.team.id === activeTeamId && !game.huntWinner;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="team-name">${escape(row.team.name)}
        ${isDetective ? '<span class="badge-detection">★ DETECTIVE</span>' : ''}
        ${isLeader && !isDetective ? '<span class="badge-elimination">★ LEADER</span>' : ''}
        ${isNextUp && !isDetective && !isLeader ? '<span class="badge-detection" style="background:var(--arc);color:white;">UP NEXT</span>' : ''}
      </td>
      <td class="num">${row.team.totalTurns}</td>
      <td class="num elim">${row.elim}</td>
      <td class="num">${row.detective}</td>
    `;
    tbody.appendChild(tr);
  }
}
