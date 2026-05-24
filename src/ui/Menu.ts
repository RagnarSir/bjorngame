// Start-, pause- og game over-skærme (dansk).
export class Menu {
  onStart?: () => void;
  onResume?: () => void;
  onRestartFromPause?: () => void;
  onRestart?: () => void;

  private startOverlay: HTMLDivElement;
  private pauseOverlay: HTMLDivElement;
  private overOverlay: HTMLDivElement;
  private overStats: HTMLDivElement;

  constructor(parent: HTMLElement) {
    // ---- Start ----
    this.startOverlay = overlay();
    const startPanel = panel();
    startPanel.innerHTML = `
      <div class="title">ANIMAL HUNT</div>
      <div class="subtitle">Survive waves of wild animals in the wilderness</div>
    `;
    const startBtn = button('Start Game', 'btn');
    startBtn.onclick = () => this.onStart?.();
    startPanel.appendChild(startBtn);
    startPanel.appendChild(controlsHint());
    startPanel.appendChild(touchHint());
    this.startOverlay.appendChild(startPanel);

    // ---- Pause ----
    this.pauseOverlay = overlay();
    this.pauseOverlay.classList.add('hidden');
    const pausePanel = panel();
    pausePanel.innerHTML = `<div class="title" style="font-size:42px">Paused</div>`;
    const resumeBtn = button('Resume', 'btn');
    resumeBtn.onclick = () => this.onResume?.();
    const restartBtn = button('Restart', 'btn secondary');
    restartBtn.onclick = () => this.onRestartFromPause?.();
    pausePanel.append(resumeBtn, restartBtn);
    pausePanel.appendChild(controlsHint());
    this.pauseOverlay.appendChild(pausePanel);

    // ---- Game over ----
    this.overOverlay = overlay();
    this.overOverlay.classList.add('hidden');
    const overPanel = panel();
    overPanel.innerHTML = `<div class="title" style="color:#c0392b">You got eaten!</div>`;
    this.overStats = document.createElement('div');
    this.overStats.className = 'subtitle';
    overPanel.appendChild(this.overStats);
    const againBtn = button('Play Again', 'btn');
    againBtn.onclick = () => this.onRestart?.();
    overPanel.appendChild(againBtn);
    this.overOverlay.appendChild(overPanel);

    parent.append(this.startOverlay, this.pauseOverlay, this.overOverlay);
  }

  showStart(): void {
    this.startOverlay.classList.remove('hidden');
  }
  hideStart(): void {
    this.startOverlay.classList.add('hidden');
  }

  showPause(): void {
    this.pauseOverlay.classList.remove('hidden');
  }
  hidePause(): void {
    this.pauseOverlay.classList.add('hidden');
  }

  showGameOver(wave: number, kills: number, coins: number): void {
    this.overStats.innerHTML = `
      You reached <b style="color:#6ab04c">wave ${wave}</b><br>
      Animals killed: <b style="color:#ffcf4d">${kills}</b><br>
      Coins earned: <b style="color:#ffcf4d">${coins}</b>
    `;
    this.overOverlay.classList.remove('hidden');
  }
  hideGameOver(): void {
    this.overOverlay.classList.add('hidden');
  }

  hideAll(): void {
    this.hideStart();
    this.hidePause();
    this.hideGameOver();
  }
}

function overlay(): HTMLDivElement {
  const o = document.createElement('div');
  o.className = 'overlay';
  return o;
}

function panel(): HTMLDivElement {
  const p = document.createElement('div');
  p.className = 'panel';
  return p;
}

function button(text: string, className: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = className;
  b.textContent = text;
  return b;
}

function controlsHint(): HTMLDivElement {
  const d = document.createElement('div');
  d.className = 'controls-hint';
  d.innerHTML = `
    <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> move ·
    <kbd>Mouse</kbd> look · <kbd>Left-click</kbd> shoot · <kbd>Right-click</kbd> aim/zoom<br>
    <kbd>Space</kbd> jump · <kbd>R</kbd> reload · <kbd>1-9</kbd> switch weapon ·
    <kbd>Shift</kbd> sprint · <kbd>Esc</kbd> pause
  `;
  return d;
}

// Vises kun på touch-enheder (CSS: .controls-hint-touch).
function touchHint(): HTMLDivElement {
  const d = document.createElement('div');
  d.className = 'controls-hint controls-hint-touch';
  d.innerHTML = `
    <b>Left side</b> drag to move · <b>Right side</b> drag to look<br>
    🔫 shoot · 🎯 aim · ⤒ jump · ⟳ reload · weapon button to switch · ⏸ pause
  `;
  return d;
}
