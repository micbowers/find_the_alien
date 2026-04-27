export function renderHomeScreen(container, { onStartTeam, onStartSolo }) {
  container.innerHTML = `
    <div class="home-modes">
      <div class="home-mode-card" data-mode="team">
        <h3>Team Match</h3>
        <p>Two or more teams take turns asking questions. The team with the most eliminations wins. Whoever narrows the alien down to one wins the Detective trophy.</p>
      </div>
      <div class="home-mode-card disabled" data-mode="solo">
        <h3>Solo Score-Attack</h3>
        <p>Find the alien on your own in as few questions as possible.</p>
        <span class="badge-soon">COMING SOON</span>
      </div>
    </div>
  `;
  container.querySelector('[data-mode="team"]').addEventListener('click', () => onStartTeam && onStartTeam());
  // Solo card stays disabled until Phase 5
  const solo = container.querySelector('[data-mode="solo"]');
  if (onStartSolo) solo.addEventListener('click', () => onStartSolo());
}
