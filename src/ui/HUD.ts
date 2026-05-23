// Spillets HUD bygget som DOM-overlay (dansk).
export class HUD {
  readonly root: HTMLDivElement;
  private healthFill: HTMLDivElement;
  private healthLabel: HTMLDivElement;
  private coinsEl: HTMLDivElement;
  private waveEl: HTMLDivElement;
  private weaponName: HTMLDivElement;
  private weaponAmmo: HTMLDivElement;
  private hitmarker: HTMLDivElement;
  private vignette: HTMLDivElement;
  private banner: HTMLDivElement;
  private bannerTimer = 0;
  private reloadEl: HTMLDivElement;
  private reloadFill: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.root = el('div', 'hud');

    this.root.appendChild(el('div', 'crosshair'));
    this.hitmarker = el('div', 'hitmarker');
    this.root.appendChild(this.hitmarker);

    const top = el('div', 'hud-top');
    this.waveEl = el('div', 'wave-info');
    this.coinsEl = el('div', 'coins');
    top.append(this.waveEl, this.coinsEl);
    this.root.appendChild(top);

    const bottom = el('div', 'hud-bottom');
    const health = el('div', 'healthbar');
    this.healthLabel = el('div', 'healthbar-label');
    this.healthLabel.textContent = 'HEALTH';
    const track = el('div', 'healthbar-track');
    this.healthFill = el('div', 'healthbar-fill');
    track.appendChild(this.healthFill);
    health.append(this.healthLabel, track);

    const weapon = el('div', 'weapon-info');
    this.weaponName = el('div', 'weapon-name');
    this.weaponAmmo = el('div', 'weapon-ammo');
    weapon.append(this.weaponName, this.weaponAmmo);

    bottom.append(health, weapon);
    this.root.appendChild(bottom);

    this.vignette = el('div', 'damage-vignette');
    this.vignette.style.transition = 'opacity 0.45s';
    this.root.appendChild(this.vignette);

    this.banner = el('div', 'wave-banner');
    this.root.appendChild(this.banner);

    this.reloadEl = el('div', 'reload-indicator');
    const reloadLabel = el('div', 'reload-label');
    reloadLabel.textContent = 'RELOADING';
    const reloadTrack = el('div', 'reload-track');
    this.reloadFill = el('div', 'reload-fill');
    reloadTrack.appendChild(this.reloadFill);
    this.reloadEl.append(reloadLabel, reloadTrack);
    this.root.appendChild(this.reloadEl);

    parent.appendChild(this.root);
  }

  setVisible(v: boolean): void {
    this.root.style.display = v ? 'block' : 'none';
  }

  setHealth(cur: number, max: number): void {
    const pct = Math.max(0, (cur / max) * 100);
    this.healthFill.style.width = `${pct}%`;
    const hue = Math.round((pct / 100) * 120); // rød → grøn
    this.healthFill.style.background = `linear-gradient(90deg, hsl(${hue},65%,42%), hsl(${hue},60%,55%))`;
    this.healthLabel.textContent = `HEALTH  ${Math.ceil(cur)}`;
  }

  setCoins(n: number): void {
    this.coinsEl.textContent = `🪙 ${n}`;
  }

  setWave(n: number, enemies: number): void {
    this.waveEl.innerHTML = `WAVE ${n} <span>· ${enemies} left</span>`;
  }

  setWeapon(name: string, ammoText: string, reloading: boolean): void {
    this.weaponName.textContent = name;
    if (reloading) {
      this.weaponAmmo.textContent = 'RELOADING…';
      this.weaponAmmo.classList.add('reloading');
    } else {
      this.weaponAmmo.textContent = ammoText;
      this.weaponAmmo.classList.remove('reloading');
    }
  }

  setReload(active: boolean, progress: number): void {
    this.reloadEl.classList.toggle('active', active);
    this.reloadFill.style.width = `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%`;
  }

  showHitmarker(): void {
    this.hitmarker.classList.add('show');
    window.setTimeout(() => this.hitmarker.classList.remove('show'), 90);
  }

  flashDamage(): void {
    this.vignette.style.opacity = '0.85';
    window.setTimeout(() => {
      this.vignette.style.opacity = '0';
    }, 70);
  }

  showBanner(title: string, sub = ''): void {
    this.banner.innerHTML = sub ? `${title}<small>${sub}</small>` : title;
    this.banner.style.opacity = '1';
    this.bannerTimer = 2.0;
  }

  update(dt: number): void {
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.banner.style.opacity = '0';
    }
  }
}

function el(tag: string, className: string): HTMLDivElement {
  const e = document.createElement(tag) as HTMLDivElement;
  e.className = className;
  return e;
}
