import { game, loadState, resetEverything, wasV0Wiped } from '../core/state.js';
import { startMatch } from '../core/engine.js';
import { renderHomeScreen } from './screens/home.js';
import { renderSetupScreen } from './screens/setup.js';
import { renderPlayScreen, setPlayMode } from './screens/play.js';
import { renderMatchDoneScreen } from './screens/matchDone.js';

let screenContainer;
let bannerHost;
let currentScreen = 'home';
let teamNamesDraft = [];
let bannerDismissed = false;

let rootElRef = null;

function updateHeaderCount() {
  if (!rootElRef) return;
  const el = rootElRef.querySelector('#hdr-alive-count');
  if (el) el.textContent = game.alive.size || game.board.length || 24;
}

function paint() {
  if (!screenContainer) return;
  paintBanner();
  updateHeaderCount();
  if (currentScreen === 'home') {
    renderHomeScreen(screenContainer, {
      onStartTeam: () => {
        teamNamesDraft = [];
        currentScreen = 'setup';
        paint();
      },
      onStartSolo: null, // disabled until Phase 5
    });
  } else if (currentScreen === 'setup') {
    renderSetupScreen(screenContainer, {
      teamNames: teamNamesDraft,
      onChange: (names) => { teamNamesDraft = names; },
      onBack: () => { currentScreen = 'home'; paint(); },
      onStart: (names) => {
        // Filter out empty names; require at least 1.
        const cleaned = names.map(n => (n || '').trim()).filter(Boolean);
        if (cleaned.length === 0) return;
        startMatch(cleaned);
        setPlayMode('idle');
        currentScreen = 'play';
        paint();
      },
    });
  } else if (currentScreen === 'play') {
    renderPlayScreen(screenContainer, {
      onMatchDone: () => {
        currentScreen = 'match-done';
        paint();
      },
      onResetMatch: () => {
        resetEverything();
        currentScreen = 'home';
        paint();
      },
    });
  } else if (currentScreen === 'match-done') {
    renderMatchDoneScreen(screenContainer, {
      onPlayAgain: () => {
        // Keep team names; restart match with same teams.
        const names = game.teams.map(t => t.name);
        resetEverything();
        startMatch(names);
        setPlayMode('idle');
        currentScreen = 'play';
        paint();
      },
      onHome: () => {
        resetEverything();
        currentScreen = 'home';
        paint();
      },
    });
  }
}

function paintBanner() {
  if (!bannerHost) return;
  if (wasV0Wiped() && !bannerDismissed) {
    bannerHost.innerHTML = `
      <div class="migration-banner">
        <span>Saved game from the previous version was cleared — this is a new build of Find The Alien.</span>
        <button id="banner-dismiss" title="Dismiss">×</button>
      </div>
    `;
    bannerHost.querySelector('#banner-dismiss').addEventListener('click', () => {
      bannerDismissed = true;
      paintBanner();
    });
  } else {
    bannerHost.innerHTML = '';
  }
}

export function mountApp(rootEl) {
  rootEl.innerHTML = `
    <div class="app-shell">
      <header class="brand-header">
        <div>
          <div class="brand">Sparkworks</div>
          <h1 class="title">Find The Alien</h1>
          <div class="subtitle">Ask good questions. Eliminate the impossible.</div>
        </div>
        <div class="count">
          ALIENS<b id="hdr-alive-count">24</b>
        </div>
      </header>

      <div id="banner-host"></div>

      <main id="screen-container" class="screen"></main>

      <footer class="brand-footer">
        <span class="footer-brand">A Sparkworks game</span>
        <span>Think Through Anything</span>
      </footer>
    </div>
  `;

  rootElRef = rootEl;
  screenContainer = rootEl.querySelector('#screen-container');
  bannerHost = rootEl.querySelector('#banner-host');

  // Restore persisted state if available; route accordingly.
  const restored = loadState();
  if (restored && game.started && game.match) {
    if (game.match.huntIndex > game.match.totalHunts) {
      currentScreen = 'match-done';
    } else {
      currentScreen = 'play';
      // Reasonable default play-mode after refresh; if a reveal was in flight,
      // re-enter reveal mode so the user can continue from where they left off.
      setPlayMode(game.pendingReveal ? 'reveal' : (game.huntWinner ? 'between-hunts' : 'idle'));
    }
  } else {
    currentScreen = 'home';
  }

  paint();
}
