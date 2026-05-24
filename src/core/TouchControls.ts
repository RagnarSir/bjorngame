import type { Input } from './Input';

// Skærm-styring til touch-enheder (iPad m.fl.). Pointer-lock findes ikke på iOS,
// så her er en virtuel joystick til at gå med, et træk-felt til at kigge med, og
// store knapper til skyd/sigt/hop/genlad/våben/pause. Alt skrives ind i Input,
// så resten af spillet kører uændret.

/** iPad/tablet/telefon: berøring til stede og primær-peger er "grov" (finger). */
export function isTouchDevice(): boolean {
  const hasTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const noPointerLock = !('requestPointerLock' in HTMLElement.prototype);
  return hasTouch && (coarse || noPointerLock);
}

interface TouchCallbacks {
  onPause: () => void;
  onWeaponCycle: (dir: number) => void;
}

const JOY_RADIUS = 60; // px – maksimalt udsving for joysticken

export class TouchControls {
  readonly root: HTMLDivElement;
  private input: Input;
  private cb: TouchCallbacks;

  private joyBase: HTMLDivElement;
  private joyKnob: HTMLDivElement;
  private aimBtn: HTMLButtonElement;
  private weaponBtn: HTMLButtonElement;

  // Aktive pegere (multitouch): styres via pointerId.
  private movePointer: number | null = null;
  private moveOrigin = { x: 0, y: 0 };
  private lookPointer: number | null = null;
  private lookLast = { x: 0, y: 0 };
  private aimOn = false;

  constructor(parent: HTMLElement, input: Input, cb: TouchCallbacks) {
    this.input = input;
    this.cb = cb;
    input.usingTouch = true;

    this.root = div('');
    this.root.id = 'touch-controls';

    // Bevægelses- og kig-felter (halv skærm hver). Knapperne ligger ovenpå som
    // søskende, så et tryk på en knap aldrig starter joystick/kig.
    const moveZone = div('touch-zone touch-move-zone');
    const lookZone = div('touch-zone touch-look-zone');

    this.joyBase = div('touch-joy-base');
    this.joyKnob = div('touch-joy-knob');
    this.joyBase.appendChild(this.joyKnob);

    const fireBtn = button('touch-btn touch-fire', '🔫');
    this.aimBtn = button('touch-btn touch-aim', '🎯');
    const jumpBtn = button('touch-btn touch-jump', '⤒');
    const reloadBtn = button('touch-btn touch-reload', '⟳');
    this.weaponBtn = button('touch-btn touch-weapon', 'Weapon');
    const pauseBtn = button('touch-btn touch-pause', '⏸');

    this.root.append(
      moveZone,
      lookZone,
      this.joyBase,
      fireBtn,
      this.aimBtn,
      jumpBtn,
      reloadBtn,
      this.weaponBtn,
      pauseBtn,
    );
    parent.appendChild(this.root);

    // ---- Bevægelse (joystick) ----
    moveZone.addEventListener('pointerdown', (e) => this.startMove(e, moveZone), { passive: false });
    moveZone.addEventListener('pointermove', (e) => this.moveMove(e), { passive: false });
    moveZone.addEventListener('pointerup', (e) => this.endMove(e));
    moveZone.addEventListener('pointercancel', (e) => this.endMove(e));

    // ---- Kig (træk) ----
    lookZone.addEventListener('pointerdown', (e) => this.startLook(e, lookZone), { passive: false });
    lookZone.addEventListener('pointermove', (e) => this.moveLook(e), { passive: false });
    lookZone.addEventListener('pointerup', (e) => this.endLook(e));
    lookZone.addEventListener('pointercancel', (e) => this.endLook(e));

    // ---- Knapper ----
    // Skyd: holdt nede = automatisk ild; et tryk = ét skud for semi-auto.
    this.holdButton(fireBtn, () => {
      this.input.mouseHeld = true;
      this.input.mouseClickedThisFrame = true;
    }, () => {
      this.input.mouseHeld = false;
    });

    // Sigt/zoom: skift til/fra (frigør tommelfingeren).
    this.tapButton(this.aimBtn, () => {
      this.aimOn = !this.aimOn;
      this.input.rightHeld = this.aimOn;
      this.aimBtn.classList.toggle('active', this.aimOn);
    });

    this.tapButton(jumpBtn, () => this.input.pressVirtual('Space'));
    this.tapButton(reloadBtn, () => this.input.pressVirtual('KeyR'));
    this.tapButton(this.weaponBtn, () => this.cb.onWeaponCycle(1));
    this.tapButton(pauseBtn, () => this.cb.onPause());

    this.setVisible(false);
  }

  setVisible(v: boolean): void {
    this.root.classList.toggle('visible', v);
    if (!v) this.reset();
  }

  setWeaponLabel(name: string): void {
    this.weaponBtn.textContent = name;
  }

  /** Nulstil al aktiv touch-tilstand (fx ved pause/skift af spiltilstand). */
  reset(): void {
    this.movePointer = null;
    this.lookPointer = null;
    this.aimOn = false;
    this.aimBtn.classList.remove('active');
    this.joyBase.classList.remove('active');
    this.input.moveX = 0;
    this.input.moveY = 0;
    this.input.sprinting = false;
  }

  // ---- joystick ----

  private startMove(e: PointerEvent, zone: HTMLElement): void {
    if (this.movePointer !== null) return;
    e.preventDefault();
    this.movePointer = e.pointerId;
    zone.setPointerCapture(e.pointerId);
    this.moveOrigin = { x: e.clientX, y: e.clientY };
    this.joyBase.style.left = `${e.clientX}px`;
    this.joyBase.style.top = `${e.clientY}px`;
    this.joyBase.classList.add('active');
    this.updateJoy(0, 0);
  }

  private moveMove(e: PointerEvent): void {
    if (e.pointerId !== this.movePointer) return;
    e.preventDefault();
    this.updateJoy(e.clientX - this.moveOrigin.x, e.clientY - this.moveOrigin.y);
  }

  private endMove(e: PointerEvent): void {
    if (e.pointerId !== this.movePointer) return;
    this.movePointer = null;
    this.joyBase.classList.remove('active');
    this.input.moveX = 0;
    this.input.moveY = 0;
    this.input.sprinting = false;
  }

  private updateJoy(dx: number, dy: number): void {
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, JOY_RADIUS);
    const nx = dist > 0 ? dx / dist : 0;
    const ny = dist > 0 ? dy / dist : 0;
    const mag = clamped / JOY_RADIUS;
    this.joyKnob.style.transform = `translate(${nx * clamped}px, ${ny * clamped}px)`;
    this.input.moveX = nx * mag; // + = højre
    this.input.moveY = -ny * mag; // skærm-y nedad → frem er negativ
    this.input.sprinting = mag > 0.92; // pres helt ud for at spurte
  }

  // ---- kig ----

  private startLook(e: PointerEvent, zone: HTMLElement): void {
    if (this.lookPointer !== null) return;
    e.preventDefault();
    this.lookPointer = e.pointerId;
    zone.setPointerCapture(e.pointerId);
    this.lookLast = { x: e.clientX, y: e.clientY };
  }

  private moveLook(e: PointerEvent): void {
    if (e.pointerId !== this.lookPointer) return;
    e.preventDefault();
    this.input.lookDX += e.clientX - this.lookLast.x;
    this.input.lookDY += e.clientY - this.lookLast.y;
    this.lookLast = { x: e.clientX, y: e.clientY };
  }

  private endLook(e: PointerEvent): void {
    if (e.pointerId !== this.lookPointer) return;
    this.lookPointer = null;
  }

  // ---- knap-hjælpere ----

  /** Knap der reagerer på tryk-ned og slip (til "hold for at skyde"). */
  private holdButton(btn: HTMLElement, down: () => void, up: () => void): void {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      btn.setPointerCapture(e.pointerId);
      btn.classList.add('pressed');
      down();
    }, { passive: false });
    const release = (e: PointerEvent): void => {
      e.preventDefault();
      btn.classList.remove('pressed');
      up();
    };
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
  }

  /** Knap der udløser én gang ved tryk-ned. */
  private tapButton(btn: HTMLElement, action: () => void): void {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      btn.classList.add('pressed');
      action();
    }, { passive: false });
    const release = (): void => btn.classList.remove('pressed');
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('pointerleave', release);
  }
}

function div(className: string): HTMLDivElement {
  const e = document.createElement('div');
  e.className = className;
  return e;
}

function button(className: string, label: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = className;
  b.textContent = label;
  return b;
}
