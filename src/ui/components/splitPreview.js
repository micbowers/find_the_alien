import { game } from '../../core/state.js';
import { QUESTIONS_BY_ID } from '../../data/questions.js';
import { getCoachOn } from '../../core/prefs.js';

// Compute the split (alive aliens that would answer YES vs NO) for a question
// and return both the data and a Set of names that would answer YES (for grid highlight).
export function computeSplit(questionId) {
  const q = QUESTIONS_BY_ID[questionId];
  if (!q) return null;
  const yesNames = new Set();
  let yes = 0, no = 0;
  for (const alien of game.board) {
    if (!game.alive.has(alien.name)) continue;
    if (q.check(alien)) { yes++; yesNames.add(alien.name); } else { no++; }
  }
  const alive = yes + no;
  // If the answer is YES, the YES branch survives -> NO branch eliminated.
  // If the answer is NO,  the NO branch survives -> YES branch eliminated.
  return {
    alive,
    yesLeft: yes,   yesElim: no,
    noLeft: no,     noElim: yes,
    yesNames,
  };
}

export function renderSplitPreview(container, questionId) {
  if (!container) return;
  // Elimination Coach OFF: don't render the panel.
  if (!getCoachOn()) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }
  if (!questionId) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }
  const split = computeSplit(questionId);
  if (!split || split.alive < 2) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }
  container.style.display = '';

  // Quality label
  const minBranch = Math.min(split.yesLeft, split.noLeft);
  const minFrac = minBranch / split.alive;
  let quality = '', qclass = '';
  if (minBranch === 0) {
    quality = '⚠ eliminates nothing'; qclass = 'bad';
  } else if (minFrac >= 0.4) {
    quality = '★ great split!'; qclass = 'good';
  } else if (minFrac >= 0.2) {
    quality = 'ok split'; qclass = 'okay';
  } else {
    quality = 'lopsided'; qclass = 'bad';
  }

  const yesPct = (split.yesLeft / split.alive) * 100;
  const noPct = 100 - yesPct;

  container.innerHTML = `
    <div class="split-preview">
      <div class="split-preview-header">
        <span class="split-preview-title">IF ANSWERED…</span>
        <span class="split-preview-quality ${qclass}">${quality}</span>
      </div>
      <div class="split-preview-row">
        <div class="split-preview-cell yes">
          <div class="split-preview-label">YES</div>
          <div class="split-preview-stats">
            <span class="split-preview-big">-${split.yesElim}</span>
            <span class="split-preview-small">eliminated · ${split.yesLeft} left</span>
          </div>
        </div>
        <div class="split-preview-cell no">
          <div class="split-preview-label">NO</div>
          <div class="split-preview-stats">
            <span class="split-preview-big">-${split.noElim}</span>
            <span class="split-preview-small">eliminated · ${split.noLeft} left</span>
          </div>
        </div>
      </div>
      <div class="split-preview-bar">
        <div class="split-preview-bar-yes" style="flex-basis:${yesPct}%"></div>
        <div class="split-preview-bar-no"  style="flex-basis:${noPct}%"></div>
      </div>
    </div>
  `;
}
