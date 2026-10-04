import './style.css';
import { Game } from './game/game';
import { preloadModels } from './scene/models/registry';

async function start() {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const ui = document.getElementById('ui') as HTMLElement;
  await preloadModels();
  const game = new Game(canvas, ui);
  (window as unknown as { game: Game }).game = game; // per il debug da console

  let last = performance.now();
  const loop = (now: number) => {
    game.update((now - last) / 1000);
    last = now;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  const loading = document.getElementById('loading');
  setTimeout(() => {
    loading?.classList.add('hide');
    setTimeout(() => loading?.remove(), 600);
    game.checkOffline();
  }, 350);
}

start().catch((err) => {
  console.error(err);
  const loading = document.getElementById('loading');
  if (loading) loading.innerHTML = `<div class="loading-logo" style="font-size:22px;max-width:80%;text-align:center">Ops! Qualcosa è andato storto.<br/>Ricarica la pagina.</div>`;
});
