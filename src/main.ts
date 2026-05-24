import './ui/ui.css';
import { SceneSetup } from './core/SceneSetup';
import { AssetLoader } from './core/AssetLoader';
import { Game } from './core/Game';
import { MODEL_CONFIG } from './data/models';
import type { MonsterId } from './types';

const app = document.getElementById('app');
if (!app) throw new Error('Mangler #app element');

const setup = new SceneSetup(app);

// Loading-overlay mens dyremodellerne hentes
const loading = document.createElement('div');
loading.className = 'overlay';
loading.innerHTML =
  '<div class="panel"><div class="title" style="font-size:42px">🐾 Animal Hunt</div>' +
  '<div class="subtitle">Loading animal models…</div></div>';
app.appendChild(loading);

const assets = new AssetLoader();

async function init(): Promise<void> {
  const ids = Object.keys(MODEL_CONFIG) as MonsterId[];
  await Promise.all(ids.map((id) => assets.tryLoad(id, MODEL_CONFIG[id]!.file)));
  loading.remove();

  const game = new Game(setup, assets);
  let last = performance.now();
  function loop(now: number): void {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.update(dt);
    setup.render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

void init();

// PWA: registrér service worker (offline + installérbar). './sw.js' løses relativt
// til siden, så scope passer både på localhost og GitHub Pages-undermappen.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* SW er en progressiv forbedring – ignorér fejl (fx file://) */
    });
  });
}
