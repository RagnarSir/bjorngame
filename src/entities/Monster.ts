import * as THREE from 'three';
import type { MonsterStats, Obstacle } from '../types';
import { createMonsterView, type MonsterView } from './MonsterView';
import { resolveObstacles } from '../systems/collision';
import type { AssetLoader } from '../core/AssetLoader';

const MONSTER_RADIUS = 0.6;

// Et dyr-monster: AI (jagt + angreb) + helbred. Udseende/animation ligger i view'et,
// som enten er en animeret GLB-model, en statisk GLB-model eller procedural fallback.
export class Monster {
  readonly stats: MonsterStats;
  readonly group: THREE.Group;
  health: number;
  alive = true;
  removable = false;

  private view: MonsterView;
  private attackTimer = 0;
  private hitFlash = 0;
  private dying = false;

  constructor(stats: MonsterStats, private obstacles: Obstacle[] = [], assets?: AssetLoader) {
    this.stats = stats;
    this.health = stats.helbred;
    this.group = new THREE.Group();
    this.view = createMonsterView(stats, assets);
    this.group.add(this.view.object);
    this.group.userData.monster = this;
  }

  spawnAt(x: number, z: number): void {
    this.group.position.set(x, 0, z);
  }

  /** true hvis dyret netop døde af dette skud. */
  takeDamage(amount: number): boolean {
    if (!this.alive) return false;
    this.health -= amount;
    this.hitFlash = 0.12;
    if (this.health <= 0) {
      this.alive = false;
      this.dying = true;
      this.view.die();
      return true;
    }
    return false;
  }

  update(dt: number, playerPos: THREE.Vector3, dealDamage: (n: number) => void): void {
    if (this.hitFlash > 0) {
      this.hitFlash = Math.max(0, this.hitFlash - dt);
      const e = this.hitFlash / 0.12;
      for (const m of this.view.materials) {
        const mm = m as THREE.MeshStandardMaterial;
        if (mm.emissive) mm.emissive.setRGB(e, e * 0.15, e * 0.15);
      }
    }

    if (this.dying) {
      this.view.update(dt);
      if (this.view.removable) this.removable = true;
      return;
    }

    const dx = playerPos.x - this.group.position.x;
    const dz = playerPos.z - this.group.position.z;
    const dist = Math.hypot(dx, dz);
    this.group.rotation.y = Math.atan2(dx, dz);

    if (dist > this.stats.angrebRaekkevidde) {
      const step = this.stats.fart * dt;
      this.group.position.x += (dx / dist) * step;
      this.group.position.z += (dz / dist) * step;
      resolveObstacles(this.group.position, MONSTER_RADIUS, this.obstacles);
      this.view.move(dt, this.stats.fart);
    } else {
      this.view.idle(dt);
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        dealDamage(this.stats.skade);
        this.attackTimer = this.stats.angrebInterval;
        this.view.attack();
      }
    }

    this.view.update(dt);
  }

  dispose(): void {
    this.group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry?.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      }
    });
  }
}
