import { game, loadState, resetEverything, wasV0Wiped } from '../core/state.js';
import { startMatch } from '../core/engine.js';
import { gmSpeak, clear as gmClear } from '../core/gm.js';
import { unlockAudio, playSFX, preloadAlienVoice, pruneAlienVoiceCacheExcept } from '../core/audio.js';
import { mountGMBubble } from './components/gmBubble.js';
import { mountMuteToggle } from './components/muteToggle.js';
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
        gmClear();
        const secretName = game.secretAlien?.name;
        pruneAlienVoiceCacheExcept(secretName);
        if (secretName) preloadAlienVoice(secretName);
        gmSpeak('match_start', {
          hunts: game.match?.totalHunts ?? cleaned.length,
          teams: cleaned.length,
          board: game.board.length,
        });
        gmSpeak('hunt_start', {
          n: 1,
          total: game.match?.totalHunts ?? cleaned.length,
          starter: game.teams[0]?.name ?? '—',
        });
        paint();
      },
    });
  } else if (currentScreen === 'play') {
    renderPlayScreen(screenContainer, {
      onMatchDone: () => {
        currentScreen = 'match-done';
        announceMatchDone();
        paint();
      },
      onResetMatch: () => {
        gmClear();
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
        gmClear();
        const secretName = game.secretAlien?.name;
        pruneAlienVoiceCacheExcept(secretName);
        if (secretName) preloadAlienVoice(secretName);
        gmSpeak('match_start', {
          hunts: game.match?.totalHunts ?? names.length,
          teams: names.length,
          board: game.board.length,
        });
        gmSpeak('hunt_start', {
          n: 1,
          total: game.match?.totalHunts ?? names.length,
          starter: game.teams[0]?.name ?? '—',
        });
        paint();
      },
      onHome: () => {
        gmClear();
        resetEverything();
        currentScreen = 'home';
        paint();
      },
    });
  }
}

function announceMatchDone() {
  playSFX('match-done');
  gmSpeak('match_done', {});
  // Compute Eliminator Champion (most cumulative elims; tiebreak by fewest turns)
  const ranked = [...game.teams].sort((a, b) => {
    if (b.totalElim !== a.totalElim) return b.totalElim - a.totalElim;
    return a.totalTurns - b.totalTurns;
  });
  const top = ranked[0];
  if (top && top.totalElim > 0) {
    gmSpeak('eliminator_champion', {
      team: top.name,
      count: top.totalElim,
      hunts: game.match?.totalHunts ?? game.teams.length,
    });
  } else {
    gmSpeak('no_eliminator_champion', {});
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
        <div class="header-right">
          <div id="hdr-mute"></div>
          <div class="count">
            ALIENS<b id="hdr-alive-count">24</b>
          </div>
        </div>
      </header>

      <div id="banner-host"></div>

      <div id="gm-bubble-host" class="gm-bubble-host"></div>

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

  // Mount the persistent GM speech bubble. It subscribes to gm.js and
  // shows whichever line is currently being narrated.
  mountGMBubble(rootEl.querySelector('#gm-bubble-host'));

  // Mount the mute toggle in the header.
  mountMuteToggle(rootEl.querySelector('#hdr-mute'));

  // First-tap audio unlock for iOS Safari. Any pointer/keydown event on the
  // app shell resumes a suspended AudioContext. Removed after the first hit.
  const unlockOnce = () => {
    unlockAudio();
    rootEl.removeEventListener('pointerdown', unlockOnce, true);
    rootEl.removeEventListener('keydown', unlockOnce, true);
  };
  rootEl.addEventListener('pointerdown', unlockOnce, true);
  rootEl.addEventListener('keydown', unlockOnce, true);

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
      // Preload the current hunt's alien voice clips.
      const secretName = game.secretAlien?.name;
      if (secretName) preloadAlienVoice(secretName);
    }
  } else {
    currentScreen = 'home';
  }

  paint();
}
