import * as THREE from 'three';
import type { ShotSpec } from '../entities/Weapon';
import type { Monster } from '../entities/Monster';
import type { WeaponStats } from '../types';
import type { AudioManager } from '../core/Audio';

const Y_UP = new THREE.Vector3(0, 1, 0);
const X_UP = new THREE.Vector3(1, 0, 0);

// Spreder en retning inden for en kegle (radianer).
function coneSpread(dir: THREE.Vector3, spread: number): void {
  const up = Math.abs(dir.y) < 0.99 ? Y_UP : X_UP;
  const right = new THREE.Vector3().crossVectors(dir, up).normalize();
  const realUp = new THREE.Vector3().crossVectors(right, dir).normalize();
  const ang = Math.random() * Math.PI * 2;
  const rad = Math.tan(spread) * Math.sqrt(Math.random());
  dir.addScaledVector(right, Math.cos(ang) * rad).addScaledVector(realUp, Math.sin(ang) * rad).normalize();
}

interface Effect {
  obj: THREE.Object3D;
  life: number;
  max: number;
  tick: (e: Effect) => void;
}

// Håndterer hitscan-skud, område-skade og visuelle effekter (tracers, træf, eksplosioner).
export class Combat {
  private raycaster = new THREE.Raycaster();
  private effects: Effect[] = [];

  constructor(private scene: THREE.Scene, private audio: AudioManager) {}

  /** Affyr ét skud. Returnerer dræbte monstre og om noget blev ramt (til hitmarkør). */
  resolveShot(spec: ShotSpec, monsters: Monster[]): { killed: Monster[]; hit: boolean } {
    const killed: Monster[] = [];
    let hit = false;
    const s = spec.stats;
    const groups = monsters.map((m) => m.group);

    const spread = s.spredning * spec.spreadMul;
    const isFlame = s.effekt === 'flamme';
    for (let p = 0; p < s.projektilerPerSkud; p++) {
      const dir = spec.dir.clone();
      if (spread > 0) coneSpread(dir, spread);

      this.raycaster.set(spec.origin, dir);
      this.raycaster.far = s.raekkevidde;
      const hits = this.raycaster.intersectObjects(groups, true);
      const res = this.firstMonster(hits);
      const endPoint = res ? res.point : spec.origin.clone().addScaledVector(dir, s.raekkevidde);

      if (!isFlame) this.spawnTracer(spec.origin, endPoint);

      if (s.splash > 0) {
        if (this.explosionAt(endPoint, s, monsters, killed)) hit = true;
      } else if (res) {
        if (!isFlame) {
          hit = true;
          this.audio.hit();
          this.spawnImpact(endPoint);
        }
        if (res.monster.takeDamage(s.skade)) killed.push(res.monster);
      }
    }
    if (isFlame) this.spawnFlame(spec.origin, spec.dir, s.raekkevidde);
    return { killed, hit };
  }

  private firstMonster(hits: THREE.Intersection[]): { monster: Monster; point: THREE.Vector3 } | null {
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o) {
        const m = o.userData.monster as Monster | undefined;
        if (m) {
          if (m.alive) return { monster: m, point: h.point.clone() };
          break;
        }
        o = o.parent;
      }
    }
    return null;
  }

  private explosionAt(point: THREE.Vector3, stats: WeaponStats, monsters: Monster[], killed: Monster[]): boolean {
    this.audio.explosion();
    this.spawnExplosion(point, stats.splash);
    let any = false;
    for (const m of monsters) {
      if (!m.alive) continue;
      const d = m.group.position.distanceTo(point);
      if (d <= stats.splash) {
        any = true;
        const falloff = 1 - d / stats.splash;
        if (m.takeDamage(stats.skade * (0.4 + 0.6 * falloff))) killed.push(m);
      }
    }
    return any;
  }

  private spawnTracer(a: THREE.Vector3, b: THREE.Vector3): void {
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    const mat = new THREE.LineBasicMaterial({
      color: 0xffe08a,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.effects.push({
      obj: line,
      life: 0.06,
      max: 0.06,
      tick: (e) => {
        mat.opacity = 0.9 * (e.life / e.max);
      },
    });
  }

  private spawnImpact(p: THREE.Vector3): void {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffd27a,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), mat);
    mesh.position.copy(p);
    this.scene.add(mesh);
    this.effects.push({
      obj: mesh,
      life: 0.18,
      max: 0.18,
      tick: (e) => {
        const t = 1 - e.life / e.max;
        mesh.scale.setScalar(1 + t * 3);
        mat.opacity = 1 - t;
      },
    });
  }

  private spawnExplosion(p: THREE.Vector3, radius: number): void {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff8030,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 12), mat);
    mesh.position.copy(p);
    this.scene.add(mesh);
    this.effects.push({
      obj: mesh,
      life: 0.4,
      max: 0.4,
      tick: (e) => {
        const t = 1 - e.life / e.max;
        mesh.scale.setScalar(0.5 + t * radius * 1.4);
        mat.opacity = 0.95 * (1 - t);
      },
    });

    const light = new THREE.PointLight(0xff7020, 8, radius * 4, 2);
    light.position.copy(p);
    this.scene.add(light);
    this.effects.push({
      obj: light,
      life: 0.3,
      max: 0.3,
      tick: (e) => {
        light.intensity = 8 * (e.life / e.max);
      },
    });
  }

  private spawnFlame(origin: THREE.Vector3, dir: THREE.Vector3, range: number): void {
    for (let k = 0; k < 2; k++) {
      const dist = range * (0.25 + Math.random() * 0.7);
      const p = origin.clone().addScaledVector(dir, dist);
      p.x += (Math.random() - 0.5) * 1.6;
      p.y += (Math.random() - 0.5) * 1.0;
      p.z += (Math.random() - 0.5) * 1.6;
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.02 + Math.random() * 0.08, 1, 0.5),
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 6), mat);
      mesh.position.copy(p);
      const s0 = 0.5 + Math.random() * 0.5;
      mesh.scale.setScalar(s0);
      this.scene.add(mesh);
      this.effects.push({
        obj: mesh,
        life: 0.3,
        max: 0.3,
        tick: (e) => {
          const t = 1 - e.life / e.max;
          mesh.scale.setScalar(s0 * (1 + t * 1.8));
          mat.opacity = 0.75 * (1 - t);
        },
      });
    }
  }

  update(dt: number): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.life -= dt;
      if (e.life <= 0) {
        this.scene.remove(e.obj);
        const mesh = e.obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = (mesh as THREE.Mesh).material;
        if (mat) {
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else (mat as THREE.Material).dispose();
        }
        this.effects.splice(i, 1);
      } else {
        e.tick(e);
      }
    }
  }

  clear(): void {
    for (const e of this.effects) this.scene.remove(e.obj);
    this.effects.length = 0;
  }
}
