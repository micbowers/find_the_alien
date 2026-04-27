const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);

// In-memory list of typed team names. Persisted to local state by the app
// controller when the user clicks Start.
export function renderSetupScreen(container, { teamNames, onChange, onBack, onStart }) {
  // Defensive copy
  const names = [...teamNames];

  function paint() {
    const huntCount = Math.max(names.length, 1);
    const huntLabel = names.length === 0
      ? 'Add at least one team to start.'
      : (names.length === 1
          ? 'You\'ll play 1 hunt (with 1 team, the same team starts every hunt).'
          : `You'll play <b>${huntCount} hunts</b> — one for each team to start.`);

    container.innerHTML = `
      <div class="panel">
        <h2><span class="step-num">1</span>Add teams</h2>
        <p class="panel-tip">Type a team name and press Add. You can play with 1 team if you just want to practice.</p>
        <div class="form-group">
          <label>New team name</label>
          <div style="display:flex;gap:8px;">
            <input type="text" id="su-input" placeholder="e.g., Maya & Priya" autocomplete="off">
            <button class="btn" id="su-add">Add team</button>
          </div>
        </div>
        <div id="su-list"></div>
      </div>
      <div class="panel">
        <h2><span class="step-num">2</span>Start the match</h2>
        <p class="panel-tip">${huntLabel} The computer picks the secret alien for each hunt.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn big" id="su-start" ${names.length === 0 ? 'disabled' : ''}>▶ Start Match</button>
          <button class="btn outline" id="su-back">← Back to home</button>
        </div>
      </div>
    `;
    const list = container.querySelector('#su-list');
    list.innerHTML = '';
    names.forEach((name, i) => {
      const row = document.createElement('div');
      row.className = 'team-row';
      row.innerHTML = `
        <div class="team-idx">#${i + 1}</div>
        <input type="text" data-idx="${i}" value="${escape(name)}">
        <button class="btn outline remove-btn" data-remove="${i}" title="Remove">×</button>
      `;
      list.appendChild(row);
    });

    container.querySelector('#su-add').addEventListener('click', () => {
      const input = container.querySelector('#su-input');
      const v = input.value.trim();
      names.push(v || `Team ${names.length + 1}`);
      input.value = '';
      onChange && onChange(names);
      paint();
      container.querySelector('#su-input').focus();
    });
    container.querySelector('#su-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        container.querySelector('#su-add').click();
      }
    });
    list.querySelectorAll('input[data-idx]').forEach(inp => {
      inp.addEventListener('input', e => {
        const i = +e.target.dataset.idx;
        names[i] = e.target.value;
        onChange && onChange(names);
      });
    });
    list.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', e => {
        const i = +e.currentTarget.dataset.remove;
        names.splice(i, 1);
        onChange && onChange(names);
        paint();
      });
    });
    container.querySelector('#su-start').addEventListener('click', () => onStart && onStart(names));
    container.querySelector('#su-back').addEventListener('click', () => onBack && onBack());
  }

  paint();
}
