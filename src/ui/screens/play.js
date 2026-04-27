import { game, currentTeam } from '../../core/state.js';
import { commitAsk, continueAfterReveal, startNextHunt, undoLastMove, restartMatchKeepTeams } from '../../core/engine.js';
import { getCoachOn, setCoachOn } from '../../core/prefs.js';
import { gmSpeak, clear as gmClear } from '../../core/gm.js';
import { playSFX, playAlienVoice, preloadAlienVoice, pruneAlienVoiceCacheExcept } from '../../core/audio.js';
import { renderAlienGrid } from '../components/alienGrid.js';
import { renderEvidenceRail } from '../components/evidenceRail.js';
import { renderScoreboard } from '../components/scoreboard.js';
import { renderSplitPreview, computeSplit } from '../components/splitPreview.js';
import { renderQuestionPicker } from '../components/questionInput.js';
import { renderRevealCard } from '../components/revealCard.js';
import { renderTurnBanner } from '../components/turnBanner.js';

const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);

// playMode:
//   'idle'           — turn banner + Ask button
//   'asking'         — question picker + split preview
//   'reveal'         — answer reveal card + Continue button
//   'between-hunts'  — hunt-complete summary + start-next-hunt button
let playMode = 'idle';
let previewedQid = null;

export function setPlayMode(mode) {
  playMode = mode;
  previewedQid = null;
}
export function getPlayMode() {
  return playMode;
}

export function renderPlayScreen(container, { onMatchDone, onResetMatch }) {
  // Build the layout shell once per render — components paint into named slots.
  const huntIdx = game.match?.huntIndex ?? 1;
  const totalHunts = game.match?.totalHunts ?? 1;

  container.innerHTML = `
    <div class="play-split">
      <div class="play-grid-col">
        <div class="panel">
          <h2 id="play-grid-title">Alien field — Hunt ${huntIdx} of ${totalHunts}</h2>
          <div class="alien-grid" id="play-grid"></div>
        </div>
      </div>
      <div class="play-controls-col">
        <div class="stats-row">
          <div class="stat alive">
            <div class="label">ALIVE</div>
            <div class="value" id="stat-alive">${game.alive.size}</div>
            <div class="sub">of 24</div>
          </div>
          <div class="stat elim">
            <div class="label">QUESTIONS</div>
            <div class="value" id="stat-questions">${game.moves.filter(m => m.type === 'ask').length}</div>
            <div class="sub">this hunt</div>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;">
          <button class="coach-toggle" id="play-coach-toggle" type="button">
            <span>🎓 Elimination Coach</span>
            <span class="coach-state" id="play-coach-state">ON</span>
          </button>
        </div>

        <div id="play-turn-banner"></div>
        <div id="play-panel-main"></div>
        <div id="play-scoreboard" class="panel"></div>
        <div id="play-evidence-rail" class="evidence-rail"></div>

        <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
          <button class="btn outline" id="play-undo">↶ Undo last</button>
          <button class="btn outline" id="play-restart">⟲ Restart match</button>
        </div>
      </div>
    </div>
    <div id="play-modal-host"></div>
  `;

  const gridEl = container.querySelector('#play-grid');
  const bannerEl = container.querySelector('#play-turn-banner');
  const mainEl = container.querySelector('#play-panel-main');
  const sbEl = container.querySelector('#play-scoreboard');
  const evidenceEl = container.querySelector('#play-evidence-rail');

  function paintMainPanel() {
    if (playMode === 'idle') {
      const team = currentTeam();
      mainEl.innerHTML = `
        <div class="panel">
          <h2>Your move</h2>
          <p class="panel-tip">${team ? escape(team.name) : 'Someone'}, pick a question that splits the remaining aliens roughly in half. Good questions eliminate the most.</p>
          <button class="btn big" id="btn-ask">Ask a question</button>
        </div>
      `;
      mainEl.querySelector('#btn-ask').addEventListener('click', () => {
        setPlayMode('asking');
        repaint();
      });
    } else if (playMode === 'asking') {
      mainEl.innerHTML = `
        <div class="panel">
          <h2>Pick a question</h2>
          <div id="split-slot"></div>
          <div id="picker-slot"></div>
          <div style="display:flex;gap:8px;margin-top:12px;">
            <button class="btn outline" id="btn-cancel-ask">Back</button>
          </div>
        </div>
      `;
      const splitSlot = mainEl.querySelector('#split-slot');
      const pickerSlot = mainEl.querySelector('#picker-slot');
      renderQuestionPicker(pickerSlot, {
        onSelect: (qid) => {
          // Snapshot alive count BEFORE the question; commitAsk mutates game.alive.
          const aliveBefore = game.alive.size;
          commitAsk(qid);
          const move = game.pendingReveal;
          const secretName = game.secretAlien?.name;

          // SFX always: tonal blip for YES/NO + a poof if anyone got eliminated.
          if (move) {
            playSFX(move.answer ? 'reveal-yes' : 'reveal-no');
            if (move.eliminated > 0) playSFX('eliminate');
          }

          if (game.huntWinner) {
            // Hunt won — skip move-quality commentary and play the climactic
            // "you found me" line over the win fanfare instead.
            const winner = game.teams.find(t => t.id === game.huntWinner);
            gmSpeak('detective_won_hunt', {
              team: winner?.name ?? '—',
              n: game.match?.huntIndex ?? 1,
              alien: game.secretAlien?.name ?? '?',
            });
            playSFX('hunt-won');
            if (secretName) setTimeout(() => playAlienVoice(secretName, 'found_me'), 700);
          } else if (move && secretName) {
            // Hunt continues — alien comments on the player's move quality.
            // Buckets mirror the Elimination Coach split-quality labels.
            const fraction = aliveBefore > 0 ? move.eliminated / aliveBefore : 0;
            const bucket = fraction >= 0.40 ? 'great_move'
                         : fraction >= 0.15 ? 'okay_move'
                         : 'bad_move';
            setTimeout(() => playAlienVoice(secretName, bucket), 220);
          }

          setPlayMode('reveal');
          repaint();
        },
        onPreview: (qid) => {
          previewedQid = qid;
          renderSplitPreview(splitSlot, qid);
          // Re-highlight the alien grid
          const split = qid ? computeSplit(qid) : null;
          renderAlienGrid(gridEl, {
            previewMatchIds: split ? split.yesNames : null,
          });
        },
      });
      mainEl.querySelector('#btn-cancel-ask').addEventListener('click', () => {
        setPlayMode('idle');
        repaint();
      });
    } else if (playMode === 'reveal') {
      const move = game.pendingReveal;
      mainEl.innerHTML = `
        <div class="panel">
          <h2>Result</h2>
          <div id="reveal-slot"></div>
          <button class="btn big" id="btn-continue" style="margin-top:8px;">Continue ▶</button>
        </div>
      `;
      renderRevealCard(mainEl.querySelector('#reveal-slot'), move);
      mainEl.querySelector('#btn-continue').addEventListener('click', () => {
        const next = continueAfterReveal();
        if (next === 'between-hunts') {
          setPlayMode('between-hunts');
          repaint();
        } else if (next === 'match-done') {
          if (onMatchDone) onMatchDone();
        } else {
          setPlayMode('idle');
          repaint();
        }
      });
    } else if (playMode === 'between-hunts') {
      const winnerTeam = game.teams.find(t => t.id === game.huntWinner);
      const secretName = game.secretAlien?.name ?? '—';
      const nextHunt = (game.match?.huntIndex ?? 1) + 1;
      // After endHunt the team rotation hasn't happened yet; the first team in
      // teams[] is still the previous starter. The next starter will be teams[1]
      // (which becomes teams[0] after startNextHunt's shift/push).
      const nextStarter = game.teams.length > 1 ? game.teams[1] : game.teams[0];
      mainEl.innerHTML = `
        <div class="panel">
          <h2>★ Hunt ${game.match.huntIndex} complete</h2>
          <p class="panel-tip">
            ${winnerTeam ? `<b>${escape(winnerTeam.name)}</b> cracked it — the alien was <b>${escape(secretName)}</b>.` : `The alien was <b>${escape(secretName)}</b>.`}
            ${nextStarter ? ` <b>${escape(nextStarter.name)}</b> starts Hunt ${nextHunt}.` : ''}
          </p>
          <button class="btn big" id="btn-next-hunt">▶ Start Hunt ${nextHunt} of ${game.match.totalHunts}</button>
        </div>
      `;
      mainEl.querySelector('#btn-next-hunt').addEventListener('click', () => {
        startNextHunt();
        // Preload the new hunt's secret alien voice clips; drop the previous.
        const newSecret = game.secretAlien?.name;
        pruneAlienVoiceCacheExcept(newSecret);
        if (newSecret) preloadAlienVoice(newSecret);
        gmSpeak('hunt_start', {
          n: game.match?.huntIndex ?? 1,
          total: game.match?.totalHunts ?? 1,
          starter: game.teams[0]?.name ?? '—',
        });
        setPlayMode('idle');
        repaint();
      });
    }
  }

  function repaint() {
    const huntIdxNow = game.match?.huntIndex ?? 1;
    const totalHuntsNow = game.match?.totalHunts ?? 1;
    container.querySelector('#play-grid-title').textContent =
      `Alien field — Hunt ${huntIdxNow} of ${totalHuntsNow}`;
    container.querySelector('#stat-alive').textContent = game.alive.size;
    container.querySelector('#stat-questions').textContent = game.moves.filter(m => m.type === 'ask').length;

    // Show grid with reveal-secret highlight only when between hunts (hunt is over)
    const revealSecret = playMode === 'between-hunts';
    renderAlienGrid(gridEl, { revealSecret });

    renderTurnBanner(bannerEl);
    paintMainPanel();
    sbEl.innerHTML = '';
    renderScoreboard(sbEl, {
      highlightDetective: !!game.huntWinner,
      // Keep the Eliminator Champion badge live throughout the match, not
      // just at hunt-end, so the running leader is always visible. Otherwise
      // the Detective badge appears alone during the celebration card and
      // reads like the only winner — but Eliminator Champion is the headline
      // prize.
      highlightLeader: true,
      activeTeamId: playMode === 'idle' ? currentTeam()?.id : null,
    });
    renderEvidenceRail(evidenceEl);
  }

  // Coach toggle
  function paintCoachToggle() {
    const btn = container.querySelector('#play-coach-toggle');
    const stateEl = container.querySelector('#play-coach-state');
    if (!btn || !stateEl) return;
    const on = getCoachOn();
    btn.classList.toggle('on', on);
    btn.classList.toggle('off', !on);
    stateEl.textContent = on ? 'ON' : 'OFF';
    btn.title = on
      ? 'Hide the YES/NO split panel and grid hints'
      : 'Show the YES/NO split panel and grid hints';
  }
  container.querySelector('#play-coach-toggle').addEventListener('click', () => {
    setCoachOn(!getCoachOn());
    paintCoachToggle();
    // Re-render whatever depends on coach state. If we're previewing a question,
    // refresh the split panel + grid.
    if (playMode === 'asking' && previewedQid) {
      const splitSlot = container.querySelector('#split-slot');
      if (splitSlot) renderSplitPreview(splitSlot, previewedQid);
      const split = computeSplit(previewedQid);
      renderAlienGrid(gridEl, {
        previewMatchIds: split ? split.yesNames : null,
      });
    } else if (playMode === 'asking') {
      // No previewed qid yet — clear the panel.
      const splitSlot = container.querySelector('#split-slot');
      if (splitSlot) splitSlot.innerHTML = '';
      renderAlienGrid(gridEl);
    }
  });

  // Restart-match confirmation modal
  container.querySelector('#play-restart').addEventListener('click', () => {
    showRestartModal(container, {
      onKeepTeams: () => {
        restartMatchKeepTeams();
        gmClear();
        const newSecret = game.secretAlien?.name;
        pruneAlienVoiceCacheExcept(newSecret);
        if (newSecret) preloadAlienVoice(newSecret);
        gmSpeak('match_start', {
          hunts: game.match?.totalHunts ?? game.teams.length,
          teams: game.teams.length,
          board: game.board.length,
        });
        gmSpeak('hunt_start', {
          n: 1,
          total: game.match?.totalHunts ?? game.teams.length,
          starter: game.teams[0]?.name ?? '—',
        });
        setPlayMode('idle');
        repaint();
      },
      onChooseNew: () => {
        onResetMatch && onResetMatch();
      },
    });
  });

  // Undo
  container.querySelector('#play-undo').addEventListener('click', () => {
    const ok = undoLastMove();
    if (ok) {
      setPlayMode('idle');
      repaint();
    }
  });

  paintCoachToggle();
  repaint();
}

function showRestartModal(container, { onKeepTeams, onChooseNew }) {
  const host = container.querySelector('#play-modal-host');
  if (!host) return;
  const isSolo = game.mode === 'solo';
  // The two button handlers are the same in both modes (onKeepTeams calls
  // restartMatchKeepTeams which preserves mode + names; onChooseNew exits to
  // home). Only the copy changes so solo players don't see "teams".
  const heading = isSolo ? 'Try a new alien?' : 'Restart match?';
  const body = isSolo
    ? 'This drops your current alien and starts fresh. Your personal best is safe.'
    : 'This wipes the current scores and starts a new match. Want to keep your teams or choose new ones?';
  const keepLabel = isSolo ? 'Pick a new alien' : 'Keep these teams';
  const newLabel  = isSolo ? 'Back to home'    : 'Choose new teams';

  host.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal-confirm" role="dialog" aria-modal="true">
        <h3>${heading}</h3>
        <p>${body}</p>
        <div class="modal-buttons">
          <button class="btn" id="modal-keep">${keepLabel}</button>
          <button class="btn outline" id="modal-new">${newLabel}</button>
        </div>
        <button class="modal-cancel" id="modal-cancel">cancel</button>
      </div>
    </div>
  `;
  const close = () => { host.innerHTML = ''; };
  host.querySelector('#modal-backdrop').addEventListener('click', e => {
    if (e.target.id === 'modal-backdrop') close();
  });
  host.querySelector('#modal-cancel').addEventListener('click', close);
  host.querySelector('#modal-keep').addEventListener('click', () => {
    close();
    onKeepTeams && onKeepTeams();
  });
  host.querySelector('#modal-new').addEventListener('click', () => {
    close();
    onChooseNew && onChooseNew();
  });
}
