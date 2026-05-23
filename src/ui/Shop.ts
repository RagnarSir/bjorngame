import { VAABEN, VAABEN_RAEKKEFOELGE } from '../data/weapons';
import type { Economy } from '../systems/Economy';
import type { Arsenal } from '../entities/Weapon';
import type { Player } from '../entities/Player';
import type { AudioManager } from '../core/Audio';

const HEAL_COST = 120;
const HEAL_AMOUNT = 50;
const ARM_DELAY = 1.2; // sek. før "Næste bølge" kan trykkes (mod fejlklik fra kamp)

// Shop-overlay der vises mellem bølger.
export class Shop {
  onNextWave?: () => void;

  private overlayEl: HTMLDivElement;
  private coinsEl: HTMLDivElement;
  private gridEl: HTMLDivElement;
  private utilsEl: HTMLDivElement;
  private nextWaveLabel = 'NEXT WAVE ▶';
  private nextBtn?: HTMLButtonElement;
  private armReady = false;
  private armRemaining = 0;
  private armTimer?: number;

  constructor(
    parent: HTMLElement,
    private economy: Economy,
    private arsenal: Arsenal,
    private player: Player,
    private audio: AudioManager,
  ) {
    this.overlayEl = document.createElement('div');
    this.overlayEl.className = 'overlay hidden';

    const panel = document.createElement('div');
    panel.className = 'panel';

    const header = document.createElement('div');
    header.className = 'shop-header';
    const h2 = document.createElement('h2');
    h2.textContent = '🛒 Weapon Shop';
    this.coinsEl = document.createElement('div');
    this.coinsEl.className = 'shop-coins';
    header.append(h2, this.coinsEl);

    this.gridEl = document.createElement('div');
    this.gridEl.className = 'shop-grid';

    this.utilsEl = document.createElement('div');
    this.utilsEl.className = 'shop-utils';

    panel.append(header, this.gridEl, this.utilsEl);
    this.overlayEl.appendChild(panel);
    parent.appendChild(this.overlayEl);
  }

  show(nextWave: number): void {
    this.nextWaveLabel = `WAVE ${nextWave} ▶`;
    this.overlayEl.classList.remove('hidden');
    // "Næste bølge" er låst et øjeblik, så man ikke kommer videre ved et fejlklik
    this.armReady = false;
    this.armRemaining = ARM_DELAY;
    this.render();
    if (this.armTimer) window.clearInterval(this.armTimer);
    this.armTimer = window.setInterval(() => {
      this.armRemaining -= 0.1;
      if (this.armRemaining <= 0) {
        this.armReady = true;
        window.clearInterval(this.armTimer);
        this.armTimer = undefined;
      }
      this.updateNextButton();
    }, 100);
  }

  hide(): void {
    this.overlayEl.classList.add('hidden');
    if (this.armTimer) {
      window.clearInterval(this.armTimer);
      this.armTimer = undefined;
    }
  }

  private updateNextButton(): void {
    if (!this.nextBtn) return;
    if (this.armReady) {
      this.nextBtn.disabled = false;
      this.nextBtn.textContent = this.nextWaveLabel;
    } else {
      this.nextBtn.disabled = true;
      this.nextBtn.textContent = `Next wave in ${Math.max(0, this.armRemaining).toFixed(1)}s`;
    }
  }

  private render(): void {
    this.coinsEl.textContent = `🪙 ${this.economy.coins}`;
    this.gridEl.innerHTML = '';

    for (const id of VAABEN_RAEKKEFOELGE) {
      const w = VAABEN[id];
      const owned = this.arsenal.ownsWeapon(id);
      const item = document.createElement('div');
      item.className = 'shop-item' + (owned ? ' owned' : '');

      const h3 = document.createElement('h3');
      h3.innerHTML = `<span>${w.navn}</span>` +
        (owned ? `<span class="price" style="color:#6ab04c">OWNED</span>` : `<span class="price">🪙 ${w.pris}</span>`);
      const p = document.createElement('p');
      p.textContent = w.beskrivelse;

      const actions = document.createElement('div');
      actions.className = 'actions';

      if (!owned) {
        const buy = document.createElement('button');
        buy.className = 'shop-btn';
        buy.textContent = `Buy`;
        buy.disabled = !this.economy.canAfford(w.pris);
        buy.onclick = () => {
          if (this.economy.spend(w.pris)) {
            this.arsenal.buyWeapon(id);
            this.audio.buy();
            this.render();
          } else {
            this.deny(item);
          }
        };
        actions.appendChild(buy);
      } else {
        const equip = document.createElement('button');
        const equipped = this.arsenal.current === id;
        equip.className = 'shop-btn ' + (equipped ? 'equipped' : 'equip');
        equip.textContent = equipped ? 'Equipped' : 'Equip';
        equip.disabled = equipped;
        equip.onclick = () => {
          this.arsenal.equip(id);
          this.audio.click();
          this.render();
        };
        actions.appendChild(equip);

        if (!w.uendeligAmmo) {
          const ammo = document.createElement('button');
          ammo.className = 'shop-btn';
          const full = this.arsenal.ammoFull(id);
          ammo.textContent = full ? 'Ammo full' : `Ammo 🪙${w.ammoPris}`;
          ammo.disabled = full || !this.economy.canAfford(w.ammoPris);
          ammo.onclick = () => {
            if (!this.arsenal.ammoFull(id) && this.economy.spend(w.ammoPris)) {
              this.arsenal.refillAmmo(id);
              this.audio.buy();
              this.render();
            } else {
              this.deny(item);
            }
          };
          actions.appendChild(ammo);
        }
      }

      item.append(h3, p, actions);
      this.gridEl.appendChild(item);
    }

    // Hjælpe-køb + næste bølge
    this.utilsEl.innerHTML = '';
    const healBtn = document.createElement('button');
    healBtn.className = 'btn secondary';
    const healFull = this.player.health >= this.player.maxHealth;
    healBtn.textContent = healFull ? 'Full health' : `❤️ +${HEAL_AMOUNT} health (🪙${HEAL_COST})`;
    healBtn.disabled = healFull || !this.economy.canAfford(HEAL_COST);
    healBtn.onclick = () => {
      if (this.player.health < this.player.maxHealth && this.economy.spend(HEAL_COST)) {
        this.player.heal(HEAL_AMOUNT);
        this.audio.buy();
        this.render();
      }
    };

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn';
    nextBtn.onclick = () => {
      if (!this.armReady) return;
      this.audio.click();
      this.hide();
      this.onNextWave?.();
    };
    this.nextBtn = nextBtn;
    this.updateNextButton();

    this.utilsEl.append(healBtn, nextBtn);
  }

  private deny(item: HTMLElement): void {
    this.audio.error();
    item.classList.remove('flash-red');
    void item.offsetWidth; // genstart animation
    item.classList.add('flash-red');
  }
}
