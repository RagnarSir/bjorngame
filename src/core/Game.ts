import * as THREE from 'three';
import type { SceneSetup } from './SceneSetup';
import type { AssetLoader } from './AssetLoader';
import { Input } from './Input';
import { TouchControls, isTouchDevice } from './TouchControls';
import { AudioManager } from './Audio';
import { Player } from '../entities/Player';
import { Arsenal } from '../entities/Weapon';
import { Combat } from '../systems/Combat';
import { WaveManager } from '../systems/WaveManager';
import { Economy } from '../systems/Economy';
import { HUD } from '../ui/HUD';
import { Menu } from '../ui/Menu';
import { Shop } from '../ui/Shop';
import { VAABEN_RAEKKEFOELGE } from '../data/weapons';
import type { GameState } from '../types';
import {
  COIN_VACUUM_RADIUS,
  COIN_COLLECT_RADIUS,
  COIN_VACUUM_SPEED,
  AIM_FOV,
  AIM_SENS_FACTOR,
  MOUSE_SENSITIVITY,
  TOUCH_LOOK_SENS,
} from '../config';

interface Coin {
  mesh: THREE.Mesh;
  value: number;
  phase: number;
}

export class Game {
  private state: GameState = 'menu';
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  private input = new Input();
  private touch = isTouchDevice();
  private touchControls?: TouchControls;
  private audio = new AudioManager();
  private player: Player;
  private arsenal: Arsenal;
  private combat: Combat;
  private wave: WaveManager;
  private economy = new Economy();
  private hud: HUD;
  private menu: Menu;
  private shop: Shop;

  private kills = 0;
  private baseFov: number;
  private coins: Coin[] = [];
  private coinGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.06, 12);
  private coinMat = new THREE.MeshStandardMaterial({
    color: 0xffcf4d,
    metalness: 0.7,
    roughness: 0.3,
    emissive: 0x4d3a00,
    emissiveIntensity: 0.5,
  });

  constructor(setup: SceneSetup, assets?: AssetLoader) {
    this.scene = setup.scene;
    this.camera = setup.camera;
    this.baseFov = this.camera.fov;
    const dom = setup.renderer.domElement;

    this.player = new Player(this.camera, dom, setup.obstacles);
    this.arsenal = new Arsenal(this.camera);
    this.combat = new Combat(this.scene, this.audio);
    this.wave = new WaveManager(this.scene, setup.obstacles, assets);

    const ui = document.getElementById('app') ?? document.body;
    this.hud = new HUD(ui);
    this.menu = new Menu(ui);
    this.shop = new Shop(ui, this.economy, this.arsenal, this.player, this.audio);

    if (this.touch) {
      document.body.classList.add('touch');
      this.touchControls = new TouchControls(ui, this.input, {
        onPause: () => this.pauseTouch(),
        onWeaponCycle: (dir) => {
          this.arsenal.cycle(dir);
          this.touchControls?.setWeaponLabel(this.arsenal.stats.navn);
        },
      });
    }

    this.hud.setVisible(false);
    this.input.attach();
    this.wireEvents();
    this.menu.showStart();
  }

  private wireEvents(): void {
    this.menu.onStart = () => this.startGame();
    this.menu.onResume = () => this.resume();
    this.menu.onRestartFromPause = () => this.startGame();
    this.menu.onRestart = () => this.startGame();
    this.shop.onNextWave = () => this.nextWave();

    this.wave.onWaveCleared = () => this.openShop();
    this.wave.onPlayerDamage = (n) => this.damagePlayer(n);

    this.player.controls.addEventListener('lock', () => {
      // Lås opnået → spil kører
      if (this.state === 'playing' || this.state === 'paused') {
        this.state = 'playing';
        this.menu.hidePause();
      }
    });
    this.player.controls.addEventListener('unlock', () => {
      // Mistede lås (fx Esc) midt i spil → pause
      if (this.state === 'playing') {
        this.state = 'paused';
        this.input.clear();
        this.menu.showPause();
      }
    });
  }

  // ---- tilstandsovergange ----

  private startGame(): void {
    this.audio.resume();
    this.menu.hideAll();
    this.shop.hide();
    this.clearCoins();
    this.economy.reset();
    this.arsenal.reset();
    this.wave.reset();
    this.kills = 0;
    this.player.spawn();
    this.hud.setVisible(true);
    this.state = 'playing';
    this.touchControls?.setWeaponLabel(this.arsenal.stats.navn);
    this.enterPlay();
    this.wave.startWave(1);
    this.hud.showBanner('WAVE 1', 'Get ready!');
    this.audio.waveStart();
  }

  private resume(): void {
    this.audio.resume();
    if (this.touch) {
      this.state = 'playing';
      this.menu.hidePause();
      this.touchControls?.setVisible(true);
    } else {
      this.player.lock();
    }
  }

  private openShop(): void {
    this.state = 'shop';
    this.input.clear();
    this.exitPlay();
    this.audio.waveStart();
    this.shop.show(this.wave.wave + 1);
  }

  private nextWave(): void {
    const next = this.wave.wave + 1;
    this.state = 'playing';
    this.enterPlay();
    this.wave.startWave(next);
    this.hud.showBanner(`WAVE ${next}`, 'Watch out!');
    this.audio.waveStart();
  }

  private gameOver(): void {
    this.state = 'gameover';
    this.input.clear();
    this.exitPlay();
    this.audio.gameOver();
    this.menu.showGameOver(this.wave.wave, this.kills, this.economy.totalEarned);
  }

  /** Pause via skærm-knappen (touch har ingen pointer-lock/Esc). */
  private pauseTouch(): void {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.input.clear();
    this.touchControls?.setVisible(false);
    this.menu.showPause();
  }

  /** Gå ind i spil: vis touch-knapper eller lås musen. */
  private enterPlay(): void {
    if (this.touch) this.touchControls?.setVisible(true);
    else this.player.lock();
  }

  /** Forlad spil: skjul touch-knapper eller slip musen. */
  private exitPlay(): void {
    if (this.touch) this.touchControls?.setVisible(false);
    else this.player.unlock();
  }

  // ---- kamp / mønter ----

  private damagePlayer(amount: number): void {
    if (this.state !== 'playing') return;
    const died = this.player.takeDamage(amount);
    this.audio.playerHurt();
    this.hud.flashDamage();
    if (died) this.gameOver();
  }

  private spawnCoin(pos: THREE.Vector3, value: number): void {
    const mesh = new THREE.Mesh(this.coinGeo, this.coinMat);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(pos.x, 0.7, pos.z);
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.coins.push({ mesh, value, phase: Math.random() * Math.PI * 2 });
  }

  private updateCoins(dt: number): void {
    const p = this.player.position;
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.phase += dt * 4;
      c.mesh.rotation.y += dt * 3;
      const dx = p.x - c.mesh.position.x;
      const dz = p.z - c.mesh.position.z;
      const d = Math.hypot(dx, dz) || 0.0001;
      if (d < COIN_VACUUM_RADIUS) {
        const step = COIN_VACUUM_SPEED * dt;
        c.mesh.position.x += (dx / d) * step;
        c.mesh.position.z += (dz / d) * step;
      } else {
        c.mesh.position.y = 0.7 + Math.sin(c.phase) * 0.12;
      }
      if (d < COIN_COLLECT_RADIUS) {
        this.economy.add(c.value);
        this.audio.coin();
        this.scene.remove(c.mesh);
        this.coins.splice(i, 1);
      }
    }
  }

  private clearCoins(): void {
    for (const c of this.coins) this.scene.remove(c.mesh);
    this.coins.length = 0;
  }

  private handleShooting(): void {
    const s = this.arsenal.stats;
    const want = s.automatisk ? this.input.mouseHeld : this.input.mouseClickedThisFrame;
    if (!want) return;
    const shot = this.arsenal.tryFire();
    if (!shot) return;
    this.audio.shoot(s.lyd);
    const { killed, hit } = this.combat.resolveShot(shot, this.wave.monsters);
    if (hit) this.hud.showHitmarker();
    for (const m of killed) {
      this.kills++;
      this.audio.monsterDeath();
      this.spawnCoin(m.group.position, m.stats.moenter);
    }
  }

  private handleInput(): void {
    if (this.input.wasPressed('KeyR')) this.arsenal.reload();
    if (this.input.wasPressed('KeyM')) this.audio.toggleMute();
    for (let i = 0; i < VAABEN_RAEKKEFOELGE.length; i++) {
      if (this.input.wasPressed(`Digit${i + 1}`)) {
        this.arsenal.equip(VAABEN_RAEKKEFOELGE[i]);
      }
    }
  }

  // ---- hovedloop ----

  update(dt: number): void {
    // Sigte/zoom (højre museknap / sigte-knap) – kun under spil
    const aiming = this.state === 'playing' && this.input.rightHeld;
    this.arsenal.setAiming(aiming);

    // Touch-kig: anvend ophobet træk-delta (langsommere når man sigter)
    if (this.touch && this.state === 'playing') {
      const look = this.input.consumeLook();
      this.player.applyTouchLook(look.x, look.y, TOUCH_LOOK_SENS * (aiming ? AIM_SENS_FACTOR : 1));
    }

    if (this.state === 'playing') {
      this.handleInput();
      this.handleShooting();
      this.player.update(dt, this.input);
      this.arsenal.update(dt);
      this.wave.update(dt, this.player.position);
      this.combat.update(dt);
      this.updateCoins(dt);

      this.hud.setHealth(this.player.health, this.player.maxHealth);
      this.hud.setCoins(this.economy.coins);
      this.hud.setWave(this.wave.wave, this.wave.remaining);
      this.hud.setWeapon(this.arsenal.stats.navn, this.arsenal.ammoText(), this.arsenal.reloading);
      this.touchControls?.setWeaponLabel(this.arsenal.stats.navn);
    }

    // Blød zoom + langsommere kig når man sigter (nulstilles uden for spil)
    const targetFov = aiming ? AIM_FOV : this.baseFov;
    if (Math.abs(this.camera.fov - targetFov) > 0.01) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 14);
      this.camera.updateProjectionMatrix();
    }
    this.player.controls.pointerSpeed = aiming ? MOUSE_SENSITIVITY * AIM_SENS_FACTOR : MOUSE_SENSITIVITY;

    this.hud.setReload(this.state === 'playing' && this.arsenal.reloading, this.arsenal.reloadProgress);
    this.hud.update(dt);
    this.input.endFrame();
  }
}
