export function renderHomeScreen(container, { onStartTeam, onStartSolo }) {
  container.innerHTML = `
    <div class="home-modes">
      <div class="home-mode-card" data-mode="team">
        <h3>Team Match</h3>
        <p>Two or more teams take turns asking questions. The team with the most eliminations wins. Whoever narrows the alien down to one wins the Detective trophy.</p>
      </div>
      <div class="home-mode-card" data-mode="solo">
        <h3>Solo Score-Attack</h3>
        <p>Find the alien on your own. Score is the number of questions you needed. Beat your personal best.</p>
      </div>
    </div>
  `;
  container.querySelector('[data-mode="team"]').addEventListener('click', () => onStartTeam && onStartTeam());
  container.querySelector('[data-mode="solo"]').addEventListener('click', () => onStartSolo && onStartSolo());
}
