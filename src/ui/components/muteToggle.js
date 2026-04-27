import { isMuted, toggleMuted, subscribeMute, unlockAudio } from '../../core/audio.js';

// Mounts a small speaker icon button into `host` and keeps it in sync with
// the global mute state. Click toggles mute. The first click also unlocks
// the AudioContext (iOS Safari requires a user gesture).
export function mountMuteToggle(host) {
  if (!host) return () => {};

  function paint(muted) {
    host.innerHTML = `
      <button class="mute-toggle ${muted ? 'is-muted' : 'is-on'}"
              type="button"
              aria-pressed="${muted ? 'true' : 'false'}"
              title="${muted ? 'Unmute audio' : 'Mute audio'}">
        ${muted ? '🔇' : '🔊'}
      </button>
    `;
    host.querySelector('button').addEventListener('click', () => {
      unlockAudio();
      toggleMuted();
    });
  }

  const unsub = subscribeMute(paint);
  paint(isMuted());
  return unsub;
}
