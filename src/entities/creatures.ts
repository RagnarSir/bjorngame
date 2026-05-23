import * as THREE from 'three';
import type { MonsterId } from '../types';

// Procedurale low-poly dyr bygget af primitiver. Hver returnerer en "rig" med
// referencer til ben/hoved, så Monster kan animere gang, angreb og død.
// Lokalt forward = +Z (snude peger mod +Z).

export interface CreatureRig {
  group: THREE.Group;
  legs: THREE.Object3D[]; // ben-pivoter (svinger i gang)
  head: THREE.Object3D; // hoved (lunger ved angreb)
  body: THREE.Object3D; // krop (bobber i gang)
  height: number; // ca. højde til helbredsbjælke
}

function box(w: number, h: number, d: number, color: number): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }),
  );
  m.castShadow = true;
  return m;
}

function makeLeg(len: number, thick: number, color: number): THREE.Group {
  const pivot = new THREE.Group();
  const mesh = box(thick, len, thick, color);
  mesh.position.y = -len / 2;
  pivot.add(mesh);
  return pivot;
}

// Placerer fire ben ved kroppens hjørner; pivot sidder i hofte-højde (= benlængde).
function addLegs(group: THREE.Group, opts: {
  legLen: number; legThick: number; color: number;
  spanX: number; spanZ: number;
}): THREE.Object3D[] {
  const legs: THREE.Object3D[] = [];
  const corners: [number, number][] = [
    [-opts.spanX, opts.spanZ],
    [opts.spanX, opts.spanZ],
    [-opts.spanX, -opts.spanZ],
    [opts.spanX, -opts.spanZ],
  ];
  for (const [x, z] of corners) {
    const leg = makeLeg(opts.legLen, opts.legThick, opts.color);
    leg.position.set(x, opts.legLen, z);
    group.add(leg);
    legs.push(leg);
  }
  return legs;
}

function buildWolf(): CreatureRig {
  const group = new THREE.Group();
  const fur = 0x6f6f72;
  const dark = 0x3a3a3d;
  const legLen = 0.6;

  const body = box(0.62, 0.55, 1.5, fur);
  body.position.y = legLen + 0.32;
  group.add(body);

  const head = new THREE.Group();
  head.position.set(0, legLen + 0.55, 0.85);
  const skull = box(0.45, 0.45, 0.5, fur);
  head.add(skull);
  const snout = box(0.22, 0.22, 0.35, dark);
  snout.position.set(0, -0.08, 0.38);
  head.add(snout);
  for (const sx of [-0.16, 0.16]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 4), new THREE.MeshStandardMaterial({ color: dark, flatShading: true }));
    ear.position.set(sx, 0.32, -0.05);
    ear.castShadow = true;
    head.add(ear);
  }
  group.add(head);

  const tail = box(0.16, 0.16, 0.6, fur);
  tail.position.set(0, legLen + 0.45, -0.85);
  tail.rotation.x = -0.6;
  group.add(tail);

  const legs = addLegs(group, { legLen, legThick: 0.16, color: dark, spanX: 0.22, spanZ: 0.55 });
  return { group, legs, head, body, height: 1.5 };
}

function buildBoar(): CreatureRig {
  const group = new THREE.Group();
  const fur = 0x4a3526;
  const dark = 0x2e2017;
  const ivory = 0xe8e0d0;
  const legLen = 0.5;

  const body = box(0.8, 0.72, 1.5, fur);
  body.position.y = legLen + 0.42;
  group.add(body);
  const hump = box(0.7, 0.4, 0.7, dark); // skulderpukkel
  hump.position.set(0, legLen + 0.82, 0.25);
  group.add(hump);

  const head = new THREE.Group();
  head.position.set(0, legLen + 0.45, 0.9);
  const skull = box(0.55, 0.5, 0.55, fur);
  head.add(skull);
  const snout = box(0.3, 0.28, 0.3, dark);
  snout.position.set(0, -0.1, 0.35);
  head.add(snout);
  for (const sx of [-0.14, 0.14]) {
    const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 4), new THREE.MeshStandardMaterial({ color: ivory, flatShading: true }));
    tusk.position.set(sx, -0.14, 0.5);
    tusk.rotation.x = Math.PI * 0.85;
    tusk.castShadow = true;
    head.add(tusk);
  }
  group.add(head);

  const legs = addLegs(group, { legLen, legThick: 0.18, color: dark, spanX: 0.28, spanZ: 0.52 });
  return { group, legs, head, body, height: 1.5 };
}

function buildBear(): CreatureRig {
  const group = new THREE.Group();
  const fur = 0x3b2a1c;
  const dark = 0x241811;
  const legLen = 0.85;

  const body = box(1.1, 1.0, 2.0, fur);
  body.position.y = legLen + 0.55;
  group.add(body);

  const head = new THREE.Group();
  head.position.set(0, legLen + 0.85, 1.05);
  const skull = box(0.75, 0.7, 0.7, fur);
  head.add(skull);
  const snout = box(0.35, 0.32, 0.35, dark);
  snout.position.set(0, -0.12, 0.45);
  head.add(snout);
  for (const sx of [-0.28, 0.28]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), new THREE.MeshStandardMaterial({ color: dark, flatShading: true }));
    ear.position.set(sx, 0.42, 0);
    ear.castShadow = true;
    head.add(ear);
  }
  group.add(head);

  const legs = addLegs(group, { legLen, legThick: 0.3, color: dark, spanX: 0.4, spanZ: 0.7 });
  return { group, legs, head, body, height: 2.4 };
}

export function buildCreature(id: MonsterId): CreatureRig {
  switch (id) {
    case 'ulv':
    case 'raev': // ræv: ulve-form i fallback (rigtig model bruges normalt)
    case 'hjort': // hjort: ulve-form i fallback
      return buildWolf();
    case 'vildsvin':
      return buildBoar();
    case 'tyr': // tyr: bjørne-form i fallback
    case 'bjorn':
      return buildBear();
  }
}
