import * as THREE from 'three';
import type { WeaponId, WeaponStats } from '../types';
import { VAABEN, STARTVAABEN } from '../data/weapons';
import { AIM_SPREAD_FACTOR } from '../config';
import { buildViewModel, type ViewModel } from './viewmodels';

export interface ShotSpec {
  origin: THREE.Vector3;
  dir: THREE.Vector3;
  stats: WeaponStats;
  spreadMul: number;
}

interface AmmoState {
  mag: number;
  reserve: number;
}

const BASE_VM = new THREE.Vector3(0.34, -0.32, -0.55); // hofte-positur
const ADS_VM = new THREE.Vector3(0.0, -0.13, -0.5); // sigte-positur (centreret)

export class Arsenal {
  owned = new Set<WeaponId>([STARTVAABEN]);
  current: WeaponId = STARTVAABEN;
  reloading = false;
  aiming = false;
  private aimT = 0;

  private ammo = {} as Record<WeaponId, AmmoState>;
  private cooldown = 0;
  private reloadTimer = 0;
  private recoil = 0;
  private camera: THREE.Camera;
  private vm: ViewModel | null = null;
  private vmCache = new Map<WeaponId, ViewModel>();
  private flash: THREE.Mesh;
  private flashTime = 0;

  constructor(camera: THREE.Camera) {
    this.camera = camera;

    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffd56a,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
    this.flash = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), flashMat);
    this.flash.visible = false;
    this.flash.renderOrder = 999;

    this.resetAmmo();
    this.equip(STARTVAABEN);
  }

  private resetAmmo(): void {
    for (const id of Object.keys(VAABEN) as WeaponId[]) {
      const s = VAABEN[id];
      this.ammo[id] = { mag: s.magasin, reserve: s.uendeligAmmo ? Infinity : s.maxReserve };
    }
  }

  get stats(): WeaponStats {
    return VAABEN[this.current];
  }

  private getVM(id: WeaponId): ViewModel {
    let vm = this.vmCache.get(id);
    if (!vm) {
      vm = buildViewModel(id, VAABEN[id].farve);
      this.vmCache.set(id, vm);
    }
    return vm;
  }

  equip(id: WeaponId): void {
    if (!this.owned.has(id)) return;
    if (this.vm) {
      this.camera.remove(this.vm.group);
      this.flash.removeFromParent();
    }
    this.current = id;
    this.vm = this.getVM(id);
    this.vm.group.position.copy(BASE_VM);
    this.camera.add(this.vm.group);
    this.vm.muzzle.add(this.flash);
    this.reloading = false;
    this.reloadTimer = 0;
    this.cooldown = 0;
  }

  /** Forsøg at affyre. Returnerer en ShotSpec, eller null hvis ikke muligt. */
  tryFire(): ShotSpec | null {
    if (this.reloading || this.cooldown > 0) return null;
    const s = this.stats;
    const a = this.ammo[this.current];
    if (a.mag <= 0) {
      this.reload();
      return null;
    }
    a.mag--;
    this.cooldown = 1 / s.skudPerSekund;
    this.recoil = s.rekyl;
    this.triggerFlash();

    const origin = new THREE.Vector3();
    this.camera.getWorldPosition(origin);
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    return { origin, dir, stats: s, spreadMul: this.aiming ? AIM_SPREAD_FACTOR : 1 };
  }

  setAiming(aiming: boolean): void {
    this.aiming = aiming;
  }

  reload(): void {
    const s = this.stats;
    const a = this.ammo[this.current];
    if (this.reloading || a.mag >= s.magasin) return;
    if (!s.uendeligAmmo && a.reserve <= 0) return;
    this.reloading = true;
    this.reloadTimer = s.genladetid;
  }

  private finishReload(): void {
    const s = this.stats;
    const a = this.ammo[this.current];
    const need = s.magasin - a.mag;
    if (s.uendeligAmmo) {
      a.mag = s.magasin;
    } else {
      const take = Math.min(need, a.reserve);
      a.mag += take;
      a.reserve -= take;
    }
    this.reloading = false;
  }

  private triggerFlash(): void {
    this.flash.visible = true;
    this.flashTime = 0.05;
    this.flash.rotation.z = Math.random() * Math.PI;
    const sc = 0.8 + Math.random() * 0.6;
    this.flash.scale.setScalar(sc);
  }

  update(dt: number): void {
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) this.finishReload();
    }
    // Rekyl glider tilbage mod hvile; viewmodel glider mod sigte-positur
    this.recoil *= Math.exp(-dt * 12);
    this.aimT += ((this.aiming ? 1 : 0) - this.aimT) * Math.min(1, dt * 14);
    if (this.vm) {
      const t = this.aimT;
      let px = BASE_VM.x + (ADS_VM.x - BASE_VM.x) * t;
      let py = BASE_VM.y + (ADS_VM.y - BASE_VM.y) * t;
      let pz = BASE_VM.z + (ADS_VM.z - BASE_VM.z) * t + this.recoil;
      let rotZ = 0;
      // Våbnet dykker ned og vippes mens der genlades
      if (this.reloading) {
        const dip = Math.sin(this.reloadProgress * Math.PI);
        py -= dip * 0.22;
        pz += dip * 0.05;
        rotZ = dip * 0.7;
      }
      this.vm.group.position.set(px, py, pz);
      this.vm.group.rotation.set(this.recoil * 1.6, 0, rotZ);
    }
    // Muzzle-flash falmer
    if (this.flashTime > 0) {
      this.flashTime -= dt;
      (this.flash.material as THREE.MeshBasicMaterial).opacity = Math.max(0, this.flashTime / 0.05);
      if (this.flashTime <= 0) this.flash.visible = false;
    }
  }

  // ---- shop / HUD ----

  get magAmmo(): number {
    return this.ammo[this.current].mag;
  }

  get reserveAmmo(): number {
    return this.ammo[this.current].reserve;
  }

  /** Genladnings-fremskridt 0..1 (0 hvis ikke i gang med at genlade). */
  get reloadProgress(): number {
    if (!this.reloading) return 0;
    return 1 - this.reloadTimer / this.stats.genladetid;
  }

  ammoText(): string {
    const a = this.ammo[this.current];
    const res = this.stats.uendeligAmmo ? '∞' : String(a.reserve);
    return `${a.mag} / ${res}`;
  }

  ownsWeapon(id: WeaponId): boolean {
    return this.owned.has(id);
  }

  buyWeapon(id: WeaponId): void {
    this.owned.add(id);
    const s = VAABEN[id];
    this.ammo[id] = { mag: s.magasin, reserve: s.uendeligAmmo ? Infinity : s.maxReserve };
    this.equip(id);
  }

  ammoFull(id: WeaponId): boolean {
    const s = VAABEN[id];
    return s.uendeligAmmo || this.ammo[id].reserve >= s.maxReserve;
  }

  refillAmmo(id: WeaponId): void {
    const s = VAABEN[id];
    if (!s.uendeligAmmo) this.ammo[id].reserve = s.maxReserve;
  }

  reset(): void {
    this.owned = new Set<WeaponId>([STARTVAABEN]);
    this.resetAmmo();
    this.equip(STARTVAABEN);
  }
}
