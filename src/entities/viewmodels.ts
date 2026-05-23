import * as THREE from 'three';
import type { WeaponId } from '../types';

// Procedurale våben-viewmodeller, der monteres på kameraet (nederst til højre).
// Piben peger i -Z (kameraets "fremad"). muzzle markerer hvor flash/tracer starter.

export interface ViewModel {
  group: THREE.Group;
  muzzle: THREE.Object3D;
}

function metalPart(w: number, h: number, d: number, color: number, metalness = 0.6): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness, flatShading: true }),
  );
  return m;
}

function finish(group: THREE.Group, muzzleZ: number, muzzleY = 0): ViewModel {
  group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = false;
  });
  // Placering i kamera-rummet (nederst-højre, lidt fremad)
  group.position.set(0.34, -0.32, -0.55);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, muzzleY, muzzleZ);
  group.add(muzzle);
  return { group, muzzle };
}

function buildPistol(color: number): ViewModel {
  const g = new THREE.Group();
  const grip = metalPart(0.12, 0.26, 0.14, 0x202024);
  grip.position.set(0, -0.16, 0.06);
  grip.rotation.x = 0.25;
  g.add(grip);
  const slide = metalPart(0.13, 0.13, 0.5, color);
  slide.position.set(0, 0, -0.15);
  g.add(slide);
  const barrel = metalPart(0.05, 0.05, 0.18, 0x111114);
  barrel.position.set(0, 0, -0.42);
  g.add(barrel);
  return finish(g, -0.55);
}

function buildShotgun(color: number): ViewModel {
  const g = new THREE.Group();
  const stock = metalPart(0.1, 0.16, 0.4, 0x3a2516);
  stock.position.set(0, -0.06, 0.34);
  g.add(stock);
  const body = metalPart(0.14, 0.16, 0.5, color);
  body.position.set(0, 0, 0);
  g.add(body);
  for (const dx of [-0.04, 0.04]) {
    const barrel = metalPart(0.06, 0.06, 0.7, 0x15110c);
    barrel.position.set(dx, 0.02, -0.5);
    g.add(barrel);
  }
  return finish(g, -0.88);
}

function buildRifle(color: number): ViewModel {
  const g = new THREE.Group();
  const stock = metalPart(0.09, 0.15, 0.34, 0x1c2228);
  stock.position.set(0, -0.05, 0.36);
  g.add(stock);
  const body = metalPart(0.12, 0.16, 0.55, color);
  g.add(body);
  const mag = metalPart(0.1, 0.26, 0.14, 0x14181c);
  mag.position.set(0, -0.2, 0.1);
  mag.rotation.x = -0.15;
  g.add(mag);
  const barrel = metalPart(0.05, 0.05, 0.6, 0x0f1216);
  barrel.position.set(0, 0.02, -0.55);
  g.add(barrel);
  const sight = metalPart(0.03, 0.06, 0.1, 0x0f1216);
  sight.position.set(0, 0.11, -0.05);
  g.add(sight);
  return finish(g, -0.86, 0.02);
}

function buildRocket(color: number): ViewModel {
  const g = new THREE.Group();
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.9, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.4, flatShading: true }),
  );
  tube.rotation.x = Math.PI / 2;
  tube.position.set(0, 0, -0.1);
  g.add(tube);
  const back = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.25, 12),
    new THREE.MeshStandardMaterial({ color: 0x222218, flatShading: true }),
  );
  back.rotation.x = -Math.PI / 2;
  back.position.set(0, 0, 0.42);
  g.add(back);
  const sight = metalPart(0.03, 0.1, 0.06, 0x111108);
  sight.position.set(0, 0.16, -0.1);
  g.add(sight);
  return finish(g, -0.58);
}

function buildSmg(color: number): ViewModel {
  const g = new THREE.Group();
  const body = metalPart(0.11, 0.14, 0.42, color);
  g.add(body);
  const barrel = metalPart(0.05, 0.05, 0.3, 0x141414);
  barrel.position.set(0, 0.02, -0.36);
  g.add(barrel);
  const mag = metalPart(0.08, 0.22, 0.1, 0x161616);
  mag.position.set(0, -0.18, 0.04);
  g.add(mag);
  const grip = metalPart(0.09, 0.18, 0.1, 0x202024);
  grip.position.set(0, -0.16, 0.16);
  grip.rotation.x = 0.2;
  g.add(grip);
  return finish(g, -0.62);
}

function buildSniper(color: number): ViewModel {
  const g = new THREE.Group();
  const stock = metalPart(0.09, 0.15, 0.42, 0x20251c);
  stock.position.set(0, -0.05, 0.42);
  g.add(stock);
  const body = metalPart(0.11, 0.15, 0.6, color);
  g.add(body);
  const barrel = metalPart(0.045, 0.045, 0.85, 0x0e120a);
  barrel.position.set(0, 0.02, -0.75);
  g.add(barrel);
  const scope = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.32, 10),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0.7, roughness: 0.4, flatShading: true }),
  );
  scope.rotation.x = Math.PI / 2;
  scope.position.set(0, 0.17, -0.05);
  g.add(scope);
  const mount = metalPart(0.03, 0.09, 0.06, 0x0a0a0a);
  mount.position.set(0, 0.1, -0.05);
  g.add(mount);
  return finish(g, -1.1, 0.02);
}

function buildMinigun(color: number): ViewModel {
  const g = new THREE.Group();
  const body = metalPart(0.2, 0.2, 0.5, color);
  body.position.set(0, 0, 0.06);
  g.add(body);
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x15171a, metalness: 0.7, roughness: 0.4, flatShading: true });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.72, 8), barrelMat);
    b.rotation.x = Math.PI / 2;
    b.position.set(Math.cos(a) * 0.07, Math.sin(a) * 0.07, -0.45);
    g.add(b);
  }
  const grip = metalPart(0.1, 0.2, 0.12, 0x202024);
  grip.position.set(0, -0.2, 0.2);
  g.add(grip);
  return finish(g, -0.86);
}

function buildFlamethrower(color: number): ViewModel {
  const g = new THREE.Group();
  const body = metalPart(0.12, 0.16, 0.4, color);
  g.add(body);
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.34, 10),
    new THREE.MeshStandardMaterial({ color: 0x7a2a1a, metalness: 0.5, roughness: 0.5, flatShading: true }),
  );
  tank.rotation.z = Math.PI / 2;
  tank.position.set(0, 0.15, 0.08);
  g.add(tank);
  const nozzle = metalPart(0.05, 0.05, 0.4, 0x141414);
  nozzle.position.set(0, 0, -0.4);
  g.add(nozzle);
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.07, 0.13, 8),
    new THREE.MeshStandardMaterial({ color: 0x222222, flatShading: true }),
  );
  tip.rotation.x = -Math.PI / 2;
  tip.position.set(0, 0, -0.63);
  g.add(tip);
  const grip = metalPart(0.09, 0.18, 0.1, 0x202024);
  grip.position.set(0, -0.16, 0.12);
  grip.rotation.x = 0.2;
  g.add(grip);
  return finish(g, -0.72);
}

function buildGrenadeLauncher(color: number): ViewModel {
  const g = new THREE.Group();
  const body = metalPart(0.12, 0.16, 0.45, color);
  g.add(body);
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.5, 10),
    new THREE.MeshStandardMaterial({ color: 0x2a2a22, metalness: 0.6, roughness: 0.5, flatShading: true }),
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.4);
  g.add(barrel);
  const muzzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.1, 10),
    new THREE.MeshStandardMaterial({ color: 0x15150f, flatShading: true }),
  );
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, 0.02, -0.66);
  g.add(muzzle);
  const stock = metalPart(0.09, 0.15, 0.3, 0x33301f);
  stock.position.set(0, -0.04, 0.34);
  g.add(stock);
  const grip = metalPart(0.09, 0.17, 0.1, 0x202024);
  grip.position.set(0, -0.15, 0.05);
  grip.rotation.x = 0.2;
  g.add(grip);
  return finish(g, -0.72, 0.02);
}

export function buildViewModel(id: WeaponId, color: number): ViewModel {
  switch (id) {
    case 'pistol':
      return buildPistol(color);
    case 'maskinpistol':
      return buildSmg(color);
    case 'haglgevaer':
      return buildShotgun(color);
    case 'snigskytte':
      return buildSniper(color);
    case 'riffel':
      return buildRifle(color);
    case 'flammekaster':
      return buildFlamethrower(color);
    case 'granatkaster':
      return buildGrenadeLauncher(color);
    case 'raketkaster':
      return buildRocket(color);
    case 'minigun':
      return buildMinigun(color);
  }
}
