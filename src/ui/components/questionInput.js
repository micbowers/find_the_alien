import { game } from '../../core/state.js';
import { QUESTIONS } from '../../data/questions.js';

const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);

// Filter questions to "live" ones — those that would split the alive pool.
export function filterLiveQuestions() {
  const aliveAliens = game.board.filter(a => game.alive.has(a.name));
  const live = [];
  const dead = [];
  for (const q of QUESTIONS) {
    if (aliveAliens.length === 0) { live.push(q); continue; }
    let yes = 0, no = 0;
    for (const a of aliveAliens) {
      if (q.check(a)) yes++; else no++;
      if (yes > 0 && no > 0) break;
    }
    if (yes > 0 && no > 0) live.push(q);
    else dead.push(q);
  }
  return { live, dead };
}

// Renders the canned question picker (search box + scrollable pill list).
//
// onSelect(questionId) is called when the user clicks/keyboards a pill.
// onPreview(questionId|null) is called when the highlighted/typed selection
// changes (used to drive the split preview + grid highlight).
export function renderQuestionPicker(container, { onSelect, onPreview }) {
  if (!container) return;
  const { live, dead } = filterLiveQuestions();

  container.innerHTML = `
    <div class="question-card">
      <div class="form-group question-search">
        <label>Search questions <span style="color:var(--gray);font-weight:400;letter-spacing:0">(${live.length} useful${dead.length ? `; ${dead.length} hidden` : ''})</span></label>
        <input type="text" id="qp-search" placeholder="e.g. eyes, color, starts with k">
      </div>
      <div class="question-list" id="qp-list"></div>
    </div>
  `;
  const search = container.querySelector('#qp-search');
  const list = container.querySelector('#qp-list');
  let liveQuestions = live;

  function paint() {
    const raw = (search.value || '').toLowerCase().trim();
    const words = raw.split(/\s+/).filter(Boolean);
    const visible = !words.length ? liveQuestions : liveQuestions.filter(q => {
      const text = q.text.toLowerCase();
      const id = q.id.toLowerCase();
      return words.every(w => text.includes(w) || id.includes(w));
    });
    list.innerHTML = '';
    for (const q of visible) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'question-pill';
      btn.dataset.qid = q.id;
      btn.textContent = q.text;
      list.appendChild(btn);
    }
    // Notify the preview of the first visible question (if any) so the split
    // panel updates as the user types.
    if (onPreview) onPreview(visible.length ? visible[0].id : null);
  }

  search.addEventListener('input', paint);
  list.addEventListener('mouseover', e => {
    const btn = e.target.closest('.question-pill');
    if (btn && onPreview) onPreview(btn.dataset.qid);
  });
  list.addEventListener('focusin', e => {
    const btn = e.target.closest('.question-pill');
    if (btn && onPreview) onPreview(btn.dataset.qid);
  });
  list.addEventListener('click', e => {
    const btn = e.target.closest('.question-pill');
    if (btn && onSelect) onSelect(btn.dataset.qid);
  });
  paint();
}
