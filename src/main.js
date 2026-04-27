import './styles/tokens.css';
import './styles/base.css';

const app = document.getElementById('app');

app.innerHTML = `
  <div class="app-shell">
    <header class="brand-header">
      <div>
        <div class="brand">Sparkworks</div>
        <h1 class="title">Find The Alien</h1>
        <div class="subtitle">A game of pattern recognition &amp; process of elimination</div>
      </div>
    </header>

    <main class="coming-soon-card">
      <img src="/aliens/29_klax.png" alt="Klax the alien" />
      <h2>Coming soon</h2>
      <p>
        We're rebuilding Find The Alien for the web so anyone can play —
        with the computer as your game master. Stay tuned.
      </p>
    </main>

    <footer class="brand-footer">
      <span class="footer-brand">A Sparkworks game</span>
      <span>Think Through Anything</span>
    </footer>
  </div>
`;
