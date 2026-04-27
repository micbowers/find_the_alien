import { game } from '../../core/state.js';
import { renderAlienHTML } from '../../data/aliens.js';

// Render the 24-alien grid into `container`.
// opts:
//   previewMatchIds: Set<string> — names to highlight (split preview)
//   revealSecret: boolean — true when hunt is over; highlight the secret alien
export function renderAlienGrid(container, opts = {}) {
  if (!container) return;
  const { previewMatchIds, revealSecret } = opts;
  container.innerHTML = '';
  for (const alien of game.board) {
    const card = document.createElement('div');
    card.className = 'alien-card';
    if (!game.alive.has(alien.name)) card.classList.add('eliminated');
    if (previewMatchIds && previewMatchIds.has(alien.name)) card.classList.add('preview-match');
    if (revealSecret && game.secretAlien && game.secretAlien.name === alien.name) {
      card.classList.add('reveal-secret');
    }
    card.innerHTML = `
      <div class="alien-svg-wrap">${renderAlienHTML(alien)}</div>
      <div class="alien-name">${alien.name}</div>
    `;
    container.appendChild(card);
  }
}
