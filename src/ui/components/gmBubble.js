import { subscribe, next as gmNext } from '../../core/gm.js';

const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);

// Mounts a GM speech-bubble into `host`. Subscribes to gm.js — every time
// the GM's current line changes, rerenders. The bubble is dismissable
// (click anywhere) which advances the queue.
//
// Returns an unsubscribe function for cleanup if needed.
export function mountGMBubble(host) {
  if (!host) return () => {};

  function render(line) {
    if (!line) {
      host.innerHTML = '';
      host.classList.remove('gm-bubble-visible');
      return;
    }
    host.classList.add('gm-bubble-visible');
    host.innerHTML = `
      <div class="gm-bubble" role="status" aria-live="polite">
        <div class="gm-bubble-avatar" aria-hidden="true">👽</div>
        <div class="gm-bubble-text">${escape(line)}</div>
        <button class="gm-bubble-dismiss" aria-label="Dismiss">×</button>
      </div>
    `;
    const bubble = host.querySelector('.gm-bubble');
    const dismiss = host.querySelector('.gm-bubble-dismiss');
    if (bubble) bubble.addEventListener('click', (e) => {
      if (e.target === dismiss) return; // handled below
      gmNext();
    });
    if (dismiss) dismiss.addEventListener('click', (e) => {
      e.stopPropagation();
      gmNext();
    });
  }

  const unsub = subscribe(render);
  return unsub;
}
