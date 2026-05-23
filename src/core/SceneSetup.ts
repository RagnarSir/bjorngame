import * as THREE from 'three';
import { ARENA_HALF, BASE_FOV } from '../config';
import type { Obstacle } from '../types';

// Procedural græs-tekstur tegnet på et canvas (ingen billed-filer nødvendige).
function makeGroundTexture(): THREE.Texture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#3f5a2a';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const shade = 30 + Math.random() * 60;
    const g = Math.floor(60 + Math.random() * 70);
    ctx.fillStyle = `rgb(${Math.floor(shade)}, ${g}, ${Math.floor(shade * 0.6)})`;
    ctx.fillRect(x, y, 2, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 24);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeTree(): THREE.Group {
  const tree = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5b3a21, roughness: 0.9 });
  const trunkH = 2.2 + Math.random() * 1.6;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, trunkH, 6), trunkMat);
  trunk.position.y = trunkH / 2;
  trunk.castShadow = true;
  tree.add(trunk);

  const leafColor = new THREE.Color().setHSL(0.28 + Math.random() * 0.06, 0.5, 0.28 + Math.random() * 0.1);
  const leafMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 1, flatShading: true });
  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const r = 2.4 - i * 0.55;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, 2.0, 7), leafMat);
    cone.position.y = trunkH + i * 1.1;
    cone.castShadow = true;
    tree.add(cone);
  }
  tree.rotation.y = Math.random() * Math.PI * 2;
  return tree;
}

function makeRock(): THREE.Mesh {
  const r = 0.6 + Math.random() * 1.4;
  const geo = new THREE.DodecahedronGeometry(r, 0);
  const rock = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: 0x6b6b70, roughness: 1, flatShading: true }),
  );
  rock.scale.y = 0.6 + Math.random() * 0.4;
  rock.position.y = r * 0.3;
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  rock.castShadow = true;
  rock.receiveShadow = true;
  return rock;
}

export class SceneSetup {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly sun: THREE.DirectionalLight;
  readonly obstacles: Obstacle[] = [];

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const sky = new THREE.Color(0x8fb6e0);
    this.scene.background = sky;
    this.scene.fog = new THREE.Fog(0x9ec1e6, 40, ARENA_HALF * 2.4);

    this.camera = new THREE.PerspectiveCamera(BASE_FOV, window.innerWidth / window.innerHeight, 0.1, 600);

    // Lys
    const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x47502f, 0.85);
    this.scene.add(hemi);

    this.sun = new THREE.DirectionalLight(0xfff2d6, 1.6);
    this.sun.position.set(40, 70, 25);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const s = ARENA_HALF + 10;
    this.sun.shadow.camera.left = -s;
    this.sun.shadow.camera.right = s;
    this.sun.shadow.camera.top = s;
    this.sun.shadow.camera.bottom = -s;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 200;
    this.sun.shadow.bias = -0.0004;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.buildArena();
    window.addEventListener('resize', this.onResize);
  }

  private buildArena(): void {
    // Jord
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(ARENA_HALF * 2.6, ARENA_HALF * 2.6),
      new THREE.MeshStandardMaterial({ map: makeGroundTexture(), roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Skov-væg af træer rundt om arenaen
    const ringR = ARENA_HALF + 2;
    const trees = new THREE.Group();
    const count = 90;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const jitter = (Math.random() - 0.5) * 6;
      const rr = ringR + (Math.random() - 0.5) * 5;
      const t = makeTree();
      t.position.set(Math.cos(a) * rr + jitter, 0, Math.sin(a) * rr + jitter);
      const sc = 0.9 + Math.random() * 0.8;
      t.scale.setScalar(sc);
      trees.add(t);
    }
    // Spredte træer og sten inde i arenaen (dekoration/dækning), ikke i midten
    for (let i = 0; i < 14; i++) {
      const t = makeTree();
      const p = this.randomInnerSpot(8, ARENA_HALF - 6);
      t.position.set(p.x, 0, p.y);
      t.scale.setScalar(0.8 + Math.random() * 0.5);
      trees.add(t);
      this.obstacles.push({ x: p.x, z: p.y, r: 1.0 });
    }
    this.scene.add(trees);

    const rocks = new THREE.Group();
    for (let i = 0; i < 18; i++) {
      const r = makeRock();
      const p = this.randomInnerSpot(5, ARENA_HALF - 3);
      r.position.x = p.x;
      r.position.z = p.y;
      rocks.add(r);
      this.obstacles.push({ x: p.x, z: p.y, r: 1.3 });
    }
    this.scene.add(rocks);

    // Sol-skive på himlen
    const sunDisc = new THREE.Mesh(
      new THREE.SphereGeometry(8, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff6d0 }),
    );
    sunDisc.position.copy(this.sun.position).multiplyScalar(2.5);
    this.scene.add(sunDisc);
  }

  private randomInnerSpot(min: number, max: number): THREE.Vector2 {
    const a = Math.random() * Math.PI * 2;
    const r = min + Math.random() * (max - min);
    return new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r);
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
