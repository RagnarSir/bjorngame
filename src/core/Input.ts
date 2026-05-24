// Tastatur- og muse-input. Skelner mellem "holdt nede" og "lige trykket" (edge).
// Touch-styring (iPad m.fl.) skriver ind i de samme felter via de virtuelle
// hjælpemetoder nederst, så resten af spillet er ligeglad med inputkilden.
export class Input {
  private held = new Set<string>();
  private pressedThisFrame = new Set<string>();
  mouseHeld = false;
  mouseClickedThisFrame = false;
  rightHeld = false;

  // --- Touch/analog input ---
  usingTouch = false; // når true bruger Player analog-vektoren i stedet for WASD
  moveX = 0; // analog sidelæns [-1,1] (+ = højre)
  moveY = 0; // analog frem/tilbage [-1,1] (+ = frem)
  sprinting = false;
  lookDX = 0; // ophobet kig-delta i px, tømmes af consumeLook() hvert frame
  lookDY = 0;

  private onKeyDown = (e: KeyboardEvent): void => {
    // Lad browser-genveje med Ctrl/Meta være i fred.
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!this.held.has(e.code)) this.pressedThisFrame.add(e.code);
    this.held.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.held.delete(e.code);
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.mouseHeld = true;
      this.mouseClickedThisFrame = true;
    } else if (e.button === 2) {
      this.rightHeld = true;
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) this.mouseHeld = false;
    else if (e.button === 2) this.rightHeld = false;
  };

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault(); // ingen højreklik-menu under spil
  };

  attach(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('contextmenu', this.onContextMenu);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('contextmenu', this.onContextMenu);
  }

  isHeld(code: string): boolean {
    return this.held.has(code);
  }

  wasPressed(code: string): boolean {
    return this.pressedThisFrame.has(code);
  }

  /** Kaldes sidst i hvert frame for at nulstille edge-tilstande. */
  endFrame(): void {
    this.pressedThisFrame.clear();
    this.mouseClickedThisFrame = false;
  }

  /** Glem alle holdte taster (fx når pointer-lock slippes). */
  clear(): void {
    this.held.clear();
    this.pressedThisFrame.clear();
    this.mouseHeld = false;
    this.mouseClickedThisFrame = false;
    this.rightHeld = false;
    this.moveX = 0;
    this.moveY = 0;
    this.sprinting = false;
    this.lookDX = 0;
    this.lookDY = 0;
  }

  // ---- Virtuelle hjælpere til touch-styring ----

  /** Et enkelt "tryk" (svarer til wasPressed denne frame), fx 'Space' eller 'KeyR'. */
  pressVirtual(code: string): void {
    this.pressedThisFrame.add(code);
  }

  /** Læs og nulstil det ophobede kig-delta (touch). */
  consumeLook(): { x: number; y: number } {
    const d = { x: this.lookDX, y: this.lookDY };
    this.lookDX = 0;
    this.lookDY = 0;
    return d;
  }
}
