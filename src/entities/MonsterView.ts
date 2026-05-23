import * as THREE from 'three';
import type { MonsterId, MonsterStats } from '../types';
import { buildCreature, type CreatureRig } from './creatures';
import { MODEL_CONFIG, type MonsterModelConfig } from '../data/models';
import type { AssetLoader, ModelInstance } from '../core/AssetLoader';

// En "view" styrer dyrets udseende + lokomotion/angreb/død-animation.
// Tre implementeringer: animeret GLB, statisk GLB (kode-bevægelse), procedural.
export interface MonsterView {
  object: THREE.Object3D;
  materials: THREE.Material[];
  removable: boolean;
  move(dt: number, speed: number): void;
  idle(dt: number): void;
  attack(): void;
  die(): void;
  update(dt: number): void;
}

// Robust bounding box, der tager højde for skelet-deformation (skinned meshes).
// THREE.Box3.setFromObject måler skinned meshes forkert (bruger ikke skelettets pose),
// hvilket giver helt forkerte mål for fx Quaternius-modeller med armature-scale 100.
function measureBox(object: THREE.Object3D): THREE.Box3 {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const tmp = new THREE.Box3();
  object.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    if (mesh.isSkinnedMesh) {
      mesh.computeBoundingBox();
      if (mesh.boundingBox) {
        tmp.copy(mesh.boundingBox).applyMatrix4(mesh.matrixWorld);
        box.union(tmp);
      }
    } else {
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      if (mesh.geometry.boundingBox) {
        tmp.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
        box.union(tmp);
      }
    }
  });
  return box;
}

function collectMaterials(root: THREE.Object3D, out: THREE.Material[]): void {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      const mat = m.material;
      if (Array.isArray(mat)) out.push(...mat);
      else if (mat) out.push(mat);
    }
  });
}

// ---- Procedural (fallback) ----
class ProceduralView implements MonsterView {
  object: THREE.Object3D;
  materials: THREE.Material[] = [];
  removable = false;
  private rig: CreatureRig;
  private bodyBaseY: number;
  private headBaseZ: number;
  private walkPhase = Math.random() * Math.PI * 2;
  private lunge = 0;
  private dying = false;
  private deathTime = 0;

  constructor(stats: MonsterStats) {
    this.rig = buildCreature(stats.id);
    this.object = this.rig.group;
    this.object.scale.setScalar(stats.skala);
    this.bodyBaseY = this.rig.body.position.y;
    this.headBaseZ = this.rig.head.position.z;
    collectMaterials(this.object, this.materials);
  }

  move(dt: number, speed: number): void {
    this.walkPhase += dt * speed * 1.6;
    const amp = 0.6;
    for (let i = 0; i < this.rig.legs.length; i++) {
      const off = i % 2 === 0 ? 0 : Math.PI;
      this.rig.legs[i].rotation.x = Math.sin(this.walkPhase + off) * amp;
    }
    this.rig.body.position.y = this.bodyBaseY + Math.abs(Math.sin(this.walkPhase)) * 0.08;
  }

  idle(_dt: number): void {
    for (const leg of this.rig.legs) leg.rotation.x *= 0.8;
  }

  attack(): void {
    this.lunge = 1;
  }

  die(): void {
    this.dying = true;
    this.deathTime = 0;
  }

  update(dt: number): void {
    if (this.lunge > 0) {
      this.lunge = Math.max(0, this.lunge - dt * 4);
      this.rig.head.position.z = this.headBaseZ + Math.sin((1 - this.lunge) * Math.PI) * 0.4;
    }
    if (this.dying) {
      this.deathTime += dt;
      const t = Math.min(1, this.deathTime / 0.45);
      this.object.rotation.z = -t * (Math.PI / 2);
      this.object.position.y = -t * 0.3;
      if (this.deathTime > 1.6) {
        this.object.position.y -= dt * 1.5;
        if (this.deathTime > 2.2) this.removable = true;
      }
    }
  }
}

// ---- GLB (animeret eller statisk) ----
type ActionMap = {
  idle?: THREE.AnimationAction;
  walk?: THREE.AnimationAction;
  run?: THREE.AnimationAction;
  attack?: THREE.AnimationAction;
  death?: THREE.AnimationAction;
};

class GltfView implements MonsterView {
  object: THREE.Object3D;
  materials: THREE.Material[] = [];
  removable = false;

  private animated: boolean;
  private mixer: THREE.AnimationMixer | null = null;
  private actions: ActionMap = {};
  private current: THREE.AnimationAction | null = null;
  private groundY = 0;
  private baseX = 0;
  private baseZ = 0;
  private phase = Math.random() * Math.PI * 2;
  private lunge = 0;
  private attackLock = 0;
  private dying = false;
  private deathTime = 0;
  private deathDur = 1.0;

  constructor(inst: ModelInstance, cfg: MonsterModelConfig) {
    this.object = inst.object;
    this.animated = cfg.animated && inst.clips.length > 0;

    // Auto-skalering til ønsket højde + centrér vandret/dybde + fødder på jorden
    const box = measureBox(this.object);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const scale = cfg.targetHeight / (size.y || 1);
    this.object.scale.setScalar(scale);
    this.baseX = -center.x * scale;
    this.baseZ = -center.z * scale;
    this.groundY = -box.min.y * scale;
    this.object.position.set(this.baseX, this.groundY, this.baseZ);
    this.object.rotation.y = cfg.faceForward;

    collectMaterials(this.object, this.materials);

    if (this.animated) {
      this.mixer = inst.mixer;
      const find = (n?: string): THREE.AnimationClip | null => {
        if (!n) return null;
        return (
          inst.clips.find((c) => c.name === n) ??
          inst.clips.find((c) => c.name.endsWith('|' + n)) ??
          inst.clips.find((c) => c.name.toLowerCase().includes(n.toLowerCase())) ??
          null
        );
      };
      const mk = (n?: string): THREE.AnimationAction | undefined => {
        const clip = find(n);
        return clip ? this.mixer!.clipAction(clip) : undefined;
      };
      this.actions = {
        idle: mk(cfg.clips.idle),
        walk: mk(cfg.clips.walk),
        run: mk(cfg.clips.run),
        attack: mk(cfg.clips.attack),
        death: mk(cfg.clips.death),
      };
      const dc = find(cfg.clips.death);
      if (dc) this.deathDur = dc.duration;
      if (this.actions.idle) this.switchTo(this.actions.idle);
      else if (this.actions.walk) this.switchTo(this.actions.walk);
    }
  }

  private switchTo(action?: THREE.AnimationAction, loopOnce = false): void {
    if (!action || action === this.current) return;
    action.reset();
    action.enabled = true;
    action.setEffectiveWeight(1);
    action.setLoop(loopOnce ? THREE.LoopOnce : THREE.LoopRepeat, loopOnce ? 1 : Infinity);
    action.clampWhenFinished = loopOnce;
    action.play();
    if (this.current) action.crossFadeFrom(this.current, 0.2, false);
    this.current = action;
  }

  move(dt: number, speed: number): void {
    if (this.dying) return;
    if (this.animated) {
      if (this.attackLock <= 0) {
        const run = this.actions.run ?? this.actions.walk;
        const walk = this.actions.walk ?? this.actions.run;
        this.switchTo(speed > 4.5 ? run : walk);
      }
    } else {
      this.phase += dt * speed * 1.6;
      this.object.position.y = this.groundY + Math.abs(Math.sin(this.phase)) * 0.12;
      this.object.rotation.z = Math.sin(this.phase) * 0.05;
    }
  }

  idle(dt: number): void {
    if (this.dying) return;
    if (this.animated) {
      if (this.attackLock <= 0) this.switchTo(this.actions.idle);
    } else {
      this.object.position.y += (this.groundY - this.object.position.y) * Math.min(1, dt * 8);
      this.object.rotation.z *= 0.85;
    }
  }

  attack(): void {
    if (this.dying) return;
    if (this.animated && this.actions.attack) {
      this.switchTo(this.actions.attack, true);
      this.attackLock = Math.max(0.4, this.actions.attack.getClip().duration);
    } else {
      this.lunge = 1;
      this.attackLock = 0.4;
    }
  }

  die(): void {
    this.dying = true;
    this.deathTime = 0;
    if (this.animated && this.actions.death) this.switchTo(this.actions.death, true);
  }

  update(dt: number): void {
    if (this.mixer) this.mixer.update(dt);
    if (this.attackLock > 0) this.attackLock -= dt;

    if (this.lunge > 0 && !this.animated) {
      this.lunge = Math.max(0, this.lunge - dt * 4);
      this.object.position.z = this.baseZ + Math.sin((1 - this.lunge) * Math.PI) * 0.4;
    }

    if (this.dying) {
      this.deathTime += dt;
      if (this.animated) {
        if (this.deathTime > this.deathDur + 0.8) {
          this.object.position.y -= dt * 1.5;
          if (this.deathTime > this.deathDur + 1.6) this.removable = true;
        }
      } else {
        const t = Math.min(1, this.deathTime / 0.45);
        this.object.rotation.z = -t * (Math.PI / 2);
        this.object.position.y = this.groundY - t * 0.3;
        if (this.deathTime > 1.6) {
          this.object.position.y -= dt * 1.5;
          if (this.deathTime > 2.2) this.removable = true;
        }
      }
    }
  }
}

export function createMonsterView(stats: MonsterStats, assets?: AssetLoader): MonsterView {
  const cfg = MODEL_CONFIG[stats.id];
  if (assets && cfg && assets.has(stats.id)) {
    const inst = assets.instantiate(stats.id);
    if (inst) return new GltfView(inst, cfg);
  }
  return new ProceduralView(stats);
}
