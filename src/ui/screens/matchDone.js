import { game } from '../../core/state.js';

const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);

export function renderMatchDoneScreen(container, { onPlayAgain, onHome }) {
  // Eliminator Champion: most cumulative elims (tiebreak: fewest turns)
  const ranked = [...game.teams].sort((a, b) => {
    if (b.totalElim !== a.totalElim) return b.totalElim - a.totalElim;
    return a.totalTurns - b.totalTurns;
  });
  const champion = ranked[0];

  // Detective leaderboard
  const detectiveOrder = [...game.teams].sort((a, b) => (b.detectiveCount || 0) - (a.detectiveCount || 0));
  const topDetective = detectiveOrder[0];
  const detectiveCount = topDetective ? topDetective.detectiveCount : 0;

  // Per-hunt detective trophy log
  const trophies = (game.match?.detectiveTrophies || []).map((trophy, i) => {
    const t = game.teams.find(x => x.id === trophy.teamId);
    return `<li><b>Hunt ${trophy.huntIndex}:</b> ${t ? escape(t.name) : '—'} <span style="color:var(--gray);">(${escape(trophy.secretAlienName || '?')})</span></li>`;
  }).join('');

  container.innerHTML = `
    <div class="panel">
      <h2 style="font-size:14px;color:var(--steel);text-transform:uppercase;">Match complete</h2>
      <p class="panel-tip">Two trophies, one for each skill the game teaches: efficient elimination and final detection.</p>

      <div class="trophy-layout">
        <div class="trophy-card eliminator">
          <div class="trophy-label">★ ELIMINATOR CHAMPION</div>
          <div class="trophy-winner">${champion ? escape(champion.name) : '—'}</div>
          <div class="trophy-detail">
            ${champion ? `eliminated <b>${champion.totalElim}</b> aliens across ${game.match.totalHunts} hunts` : ''}
          </div>
        </div>
        <div class="trophy-card detective">
          <div class="trophy-label">★ DETECTIVE</div>
          <div class="trophy-winner">${topDetective && detectiveCount > 0 ? escape(topDetective.name) : '—'}</div>
          <div class="trophy-detail">
            ${detectiveCount > 0 ? `cracked <b>${detectiveCount}</b> hunt${detectiveCount === 1 ? '' : 's'}` : 'no detective trophies awarded'}
          </div>
        </div>
      </div>

      <h3 style="font-size:11px;letter-spacing:0.2em;color:var(--gray);margin-top:24px;">PER-HUNT DETECTIVES</h3>
      <ul style="margin:8px 0 16px;padding-left:20px;font-size:14px;line-height:1.6;">
        ${trophies}
      </ul>

      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn big" id="md-again">▶ Play again — same teams</button>
        <button class="btn outline" id="md-home">Choose new teams</button>
      </div>
    </div>
  `;

  container.querySelector('#md-again').addEventListener('click', () => onPlayAgain && onPlayAgain());
  container.querySelector('#md-home').addEventListener('click', () => onHome && onHome());
}
