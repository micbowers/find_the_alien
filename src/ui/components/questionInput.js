import { game } from '../../core/state.js';
import { QUESTIONS } from '../../data/questions.js';
import { interpret } from '../../core/llm.js';

const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);

// Filter the catalog down to "live" questions — ones that would split the
// alive pool. Used by the canned picker.
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

// PUBLIC API. Renders the hybrid free-form-first picker.
//   onSelect(questionId) — called when the player commits a question
//   onPreview(questionId | null) — called when the highlighted/typed selection
//                                  changes (drives the split preview + grid)
export function renderQuestionPicker(container, { onSelect, onPreview }) {
  let missCount = 0;
  let cannedRendered = false;

  container.innerHTML = `
    <div class="question-card">
      <div class="form-group qp-text-form">
        <label>Ask your question</label>
        <div style="display:flex;gap:8px;">
          <input type="text" id="qp-text"
            placeholder="e.g., is it greenish? does its name start with K?"
            autocomplete="off" autocapitalize="off" autocorrect="off">
          <button class="btn" id="qp-submit" type="button">Ask</button>
        </div>
        <div class="qp-tip">Type a yes/no question, or pick from the list below.</div>
      </div>

      <div id="qp-status"></div>

      <details id="qp-list-toggle" class="qp-list-toggle">
        <summary class="qp-list-summary">📋 Pick from the list of questions</summary>
        <div id="qp-list-host"></div>
      </details>
    </div>
  `;

  const textEl = container.querySelector('#qp-text');
  const submitEl = container.querySelector('#qp-submit');
  const statusEl = container.querySelector('#qp-status');
  const listToggle = container.querySelector('#qp-list-toggle');
  const listHost = container.querySelector('#qp-list-host');

  function ensureCannedRendered() {
    if (cannedRendered) return;
    cannedRendered = true;
    renderCannedPicker(listHost, {
      onSelect: (qid) => { commit(qid); },
      onPreview: (qid) => { if (onPreview) onPreview(qid); },
    });
  }

  listToggle.addEventListener('toggle', () => {
    if (listToggle.open) ensureCannedRendered();
  });

  function commit(qid) {
    missCount = 0;
    if (onSelect) onSelect(qid);
  }

  function recordMissAndMaybeAutoOpen() {
    missCount += 1;
    if (missCount >= 3 && !listToggle.open) {
      listToggle.open = true;
      ensureCannedRendered();
      const summary = listToggle.querySelector('.qp-list-summary');
      if (summary) summary.textContent = '📋 Pick from the list (opened for you)';
    }
  }

  async function submitText() {
    const text = textEl.value.trim();
    if (!text) return;
    setStatusLoading();
    submitEl.disabled = true;
    textEl.disabled = true;
    let resp;
    try {
      resp = await interpret(text);
    } catch (err) {
      const msg = errorMessageFor(err);
      renderErrorStatus(msg);
      submitEl.disabled = false;
      textEl.disabled = false;
      ensureCannedRendered();
      listToggle.open = true;
      recordMissAndMaybeAutoOpen();
      return;
    }
    submitEl.disabled = false;
    textEl.disabled = false;
    dispatch(resp);
  }

  function dispatch(resp) {
    if (resp.interpretation === 'matched' && resp.questionId) {
      renderMatched(resp);
      if (onPreview) onPreview(resp.questionId);
    } else if (resp.interpretation === 'ambiguous' && Array.isArray(resp.candidates) && resp.candidates.length > 0) {
      renderAmbiguous(resp);
      // No auto-preview here — the user must hover a candidate to see its
      // split. Picking the first as a default was arbitrary and confusing.
      if (onPreview) onPreview(null);
      recordMissAndMaybeAutoOpen();
    } else {
      renderOffTopic(resp);
      if (onPreview) onPreview(null);
      recordMissAndMaybeAutoOpen();
    }
  }

  function setStatusLoading() {
    statusEl.innerHTML = `<div class="qp-loading">🔮 Thinking…</div>`;
  }

  function renderMatched(resp) {
    const text = resp.rephrased || lookupText(resp.questionId) || 'that';
    statusEl.innerHTML = `
      <div class="qp-matched">
        <div class="qp-matched-line">I think you're asking: <b>${escape(text)}</b></div>
        <div class="qp-actions">
          <button class="btn teal" id="qp-confirm" type="button">Yes — ask that</button>
          <button class="btn outline" id="qp-edit" type="button">Edit</button>
        </div>
      </div>
    `;
    statusEl.querySelector('#qp-confirm').addEventListener('click', () => {
      commit(resp.questionId);
    });
    statusEl.querySelector('#qp-edit').addEventListener('click', () => {
      statusEl.innerHTML = '';
      if (onPreview) onPreview(null);
      textEl.focus();
      textEl.select();
    });
  }

  function renderAmbiguous(resp) {
    const buttons = resp.candidates.map(qid => {
      const q = QUESTIONS.find(x => x.id === qid);
      return `<button class="btn outline qp-candidate" data-qid="${escape(qid)}" type="button">${escape(q ? q.text : qid)}</button>`;
    }).join('');
    statusEl.innerHTML = `
      <div class="qp-ambiguous">
        <div class="qp-ambiguous-line">Did you mean one of these?</div>
        <div class="qp-candidates">${buttons}</div>
        <button class="btn outline qp-edit-back" id="qp-edit2" type="button">None of these — edit my question</button>
      </div>
    `;
    statusEl.querySelectorAll('.qp-candidate').forEach(btn => {
      btn.addEventListener('mouseover', () => { if (onPreview) onPreview(btn.dataset.qid); });
      btn.addEventListener('focusin', () => { if (onPreview) onPreview(btn.dataset.qid); });
      btn.addEventListener('click', () => { commit(btn.dataset.qid); });
    });
    const candidatesContainer = statusEl.querySelector('.qp-candidates');
    if (candidatesContainer) {
      candidatesContainer.addEventListener('mouseleave', () => {
        if (onPreview) onPreview(null);
      });
      candidatesContainer.addEventListener('focusout', () => {
        if (onPreview) onPreview(null);
      });
    }
    statusEl.querySelector('#qp-edit2').addEventListener('click', () => {
      statusEl.innerHTML = '';
      if (onPreview) onPreview(null);
      textEl.focus();
      textEl.select();
    });
  }

  function renderOffTopic(resp) {
    const why = resp.rationale ? ` (${escape(resp.rationale)})` : '';
    statusEl.innerHTML = `
      <div class="qp-offtopic">
        <div class="qp-offtopic-line">I can't answer that kind of question${why}.</div>
        <div class="qp-tip">Try asking about colors, body features (eyes, horns, antennae, tail, stripes, spots, fangs), the smile, the number of heads, or letters in the alien's name.</div>
        <button class="btn outline" id="qp-edit3" type="button">Try again</button>
      </div>
    `;
    statusEl.querySelector('#qp-edit3').addEventListener('click', () => {
      statusEl.innerHTML = '';
      textEl.focus();
      textEl.select();
    });
  }

  function renderErrorStatus(msg) {
    statusEl.innerHTML = `
      <div class="qp-error">
        <div class="qp-error-line">${escape(msg)}</div>
        <div class="qp-tip">Pick from the list below to keep playing.</div>
      </div>
    `;
  }

  // Wire input handlers
  submitEl.addEventListener('click', submitText);
  textEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submitText(); }
  });
  // Focus the input on mount for a fast typing flow
  setTimeout(() => textEl.focus(), 0);
}

function lookupText(qid) {
  const q = QUESTIONS.find(x => x.id === qid);
  return q ? q.text : null;
}

function errorMessageFor(err) {
  const m = err && err.message ? err.message : '';
  if (m === 'RATE_LIMIT') return 'Too many questions in a row — slow down a sec.';
  if (m === 'TIMEOUT')    return 'The interpreter is taking too long. Try again or pick from the list.';
  if (m === 'NETWORK')    return 'Network glitch. Check your connection or pick from the list.';
  if (m === 'PARSE_ERROR' || m === 'SERVER_ERROR') return 'The interpreter hiccupped. Pick from the list for now.';
  return m || 'Something went wrong. Pick from the list for now.';
}

// ============================================================
// CANNED PICKER (search + scrollable pill list — the Phase 1 UI)
// ============================================================
function renderCannedPicker(container, { onSelect, onPreview }) {
  if (!container) return;
  const { live, dead } = filterLiveQuestions();

  container.innerHTML = `
    <div class="form-group question-search" style="margin-top:10px;">
      <label>Search the list <span style="color:var(--gray);font-weight:400;letter-spacing:0">(${live.length} useful${dead.length ? `; ${dead.length} hidden` : ''})</span></label>
      <input type="text" id="qp-list-search" placeholder="e.g. eyes, color, starts with k" autocomplete="off">
    </div>
    <div class="question-list" id="qp-list-pills"></div>
  `;
  const search = container.querySelector('#qp-list-search');
  const list = container.querySelector('#qp-list-pills');
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
    // Clear any leftover preview from a previous paint — the user must hover
    // a pill to see a split now (the auto-show was misleading because it
    // suggested advice without active engagement).
    if (onPreview) onPreview(null);
  }

  search.addEventListener('input', paint);
  list.addEventListener('mouseover', e => {
    const btn = e.target.closest('.question-pill');
    if (btn && onPreview) onPreview(btn.dataset.qid);
  });
  list.addEventListener('mouseleave', () => {
    if (onPreview) onPreview(null);
  });
  list.addEventListener('focusin', e => {
    const btn = e.target.closest('.question-pill');
    if (btn && onPreview) onPreview(btn.dataset.qid);
  });
  list.addEventListener('focusout', () => {
    if (onPreview) onPreview(null);
  });
  list.addEventListener('click', e => {
    const btn = e.target.closest('.question-pill');
    if (btn && onSelect) onSelect(btn.dataset.qid);
  });
  paint();
}
