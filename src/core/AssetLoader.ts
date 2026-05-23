import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

export interface LoadedModel {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

export interface ModelInstance {
  object: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  clips: THREE.AnimationClip[];
}

// Indlæser valgfrie GLB-modeller fra public/models/. Mangler en model, bruger
// spillet automatisk de procedurale dyr/våben i stedet (graceful fallback).
export class AssetLoader {
  private loader = new GLTFLoader();
  private models = new Map<string, LoadedModel>();

  async tryLoad(id: string, file: string): Promise<boolean> {
    const url = `${import.meta.env.BASE_URL}models/${file}`;
    try {
      const gltf = await this.loader.loadAsync(url);
      this.models.set(id, { scene: gltf.scene as unknown as THREE.Group, animations: gltf.animations });
      return true;
    } catch {
      return false;
    }
  }

  has(id: string): boolean {
    return this.models.has(id);
  }

  /** Klon en indlæst model (inkl. skelet) klar til brug, eller null hvis den mangler. */
  instantiate(id: string): ModelInstance | null {
    const m = this.models.get(id);
    if (!m) return null;
    const object = cloneSkinned(m.scene);
    object.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        // Klon materialer pr. instans, så hit-flash (emissive) ikke smitter af
        // på alle andre dyr der deler det samme materiale.
        if (Array.isArray(mesh.material)) mesh.material = mesh.material.map((mat) => mat.clone());
        else if (mesh.material) mesh.material = mesh.material.clone();
      }
    });
    return { object, mixer: new THREE.AnimationMixer(object), clips: m.animations };
  }
}
