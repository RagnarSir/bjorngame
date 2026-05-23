import * as THREE from 'three';
import { Monster } from '../entities/Monster';
import { DYR } from '../data/monsters';
import type { MonsterId, MonsterStats } from '../types';
import { ARENA_HALF, FIRST_WAVE_DELAY } from '../config';
import type { AssetLoader } from '../core/AssetLoader';
import type { Obstacle } from '../types';

export type WavePhase = 'idle' | 'spawning' | 'fighting' | 'cleared';

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Styrer bølger af dyr: sammensætning, spawn over tid, skalering og oprydning.
export class WaveManager {
  wave = 0;
  phase: WavePhase = 'idle';
  monsters: Monster[] = [];

  onWaveStarted?: (wave: number) => void;
  onWaveCleared?: (wave: number) => void;
  onPlayerDamage?: (amount: number) => void;

  private spawnQueue: MonsterId[] = [];
  private spawnTimer = 0;
  private spawnInterval = 0.8;
  private startDelay = 0;

  constructor(
    private scene: THREE.Scene,
    private obstacles: Obstacle[] = [],
    private assets?: AssetLoader,
  ) {}

  startWave(n: number): void {
    this.wave = n;
    this.phase = 'spawning';
    this.spawnQueue = this.composition(n);
    this.spawnInterval = Math.max(0.35, 0.9 - n * 0.03);
    this.startDelay = FIRST_WAVE_DELAY;
    this.spawnTimer = 0;
    this.onWaveStarted?.(n);
  }

  startNext(): void {
    this.startWave(this.wave + 1);
  }

  private composition(n: number): MonsterId[] {
    const list: MonsterId[] = [];
    const add = (id: MonsterId, count: number): void => {
      for (let i = 0; i < Math.max(0, count); i++) list.push(id);
    };

    if (n <= 1) {
      // Bølge 1: blød intro med ulve
      add('ulv', 4);
      return shuffle(list);
    }

    // Fra bølge 2 er alle dyr med. De mindre dyr er talrige; de større starter
    // få (1 hver i bølge 2) og bliver gradvist flere for stigende sværhed.
    add('ulv', 2 + Math.floor(n * 0.6));
    add('raev', 2 + Math.floor(n * 0.6));
    add('vildsvin', 1 + Math.floor((n - 2) * 0.7));
    add('hjort', 1 + Math.floor((n - 2) * 0.6));
    add('bjorn', 1 + Math.floor((n - 2) * 0.5));
    add('tyr', 1 + Math.floor((n - 2) * 0.4));
    return shuffle(list);
  }

  private scaledStats(id: MonsterId): MonsterStats {
    const base = DYR[id];
    const w = this.wave - 1;
    return {
      ...base,
      helbred: Math.round(base.helbred * (1 + w * 0.08)),
      skade: Math.round(base.skade * (1 + w * 0.05) * 10) / 10,
      fart: base.fart * (1 + w * 0.02),
    };
  }

  private spawnOne(id: MonsterId): void {
    const m = new Monster(this.scaledStats(id), this.obstacles, this.assets);
    const a = Math.random() * Math.PI * 2;
    const r = ARENA_HALF - 3;
    m.spawnAt(Math.cos(a) * r, Math.sin(a) * r);
    this.scene.add(m.group);
    this.monsters.push(m);
  }

  get aliveCount(): number {
    let c = 0;
    for (const m of this.monsters) if (m.alive) c++;
    return c;
  }

  get remaining(): number {
    return this.spawnQueue.length + this.aliveCount;
  }

  update(dt: number, playerPos: THREE.Vector3): void {
    if (this.phase === 'spawning') {
      if (this.startDelay > 0) {
        this.startDelay -= dt;
      } else if (this.spawnQueue.length > 0) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
          this.spawnOne(this.spawnQueue.shift()!);
          this.spawnTimer = this.spawnInterval;
        }
      } else {
        this.phase = 'fighting';
      }
    }

    this.updateMonsters(dt, playerPos);

    if (this.phase === 'fighting' && this.aliveCount === 0) {
      this.phase = 'cleared';
      this.onWaveCleared?.(this.wave);
    }
  }

  private updateMonsters(dt: number, playerPos: THREE.Vector3): void {
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const m = this.monsters[i];
      m.update(dt, playerPos, (n) => this.onPlayerDamage?.(n));
      if (m.removable) {
        this.scene.remove(m.group);
        m.dispose();
        this.monsters.splice(i, 1);
      }
    }
  }

  reset(): void {
    for (const m of this.monsters) {
      this.scene.remove(m.group);
      m.dispose();
    }
    this.monsters.length = 0;
    this.spawnQueue.length = 0;
    this.wave = 0;
    this.phase = 'idle';
  }
}
