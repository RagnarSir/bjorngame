import type * as THREE from 'three';
import type { Obstacle } from '../types';

// Skubber en position ud af alle forhindringer den overlapper (cirkel mod cirkel).
// Bruges af både spiller og dyr, så ingen kan gå gennem træer/sten.
export function resolveObstacles(pos: THREE.Vector3, radius: number, obstacles: Obstacle[]): void {
  for (const o of obstacles) {
    const dx = pos.x - o.x;
    const dz = pos.z - o.z;
    const minD = o.r + radius;
    const d2 = dx * dx + dz * dz;
    if (d2 < minD * minD && d2 > 1e-6) {
      const d = Math.sqrt(d2);
      const push = (minD - d) / d;
      pos.x += dx * push;
      pos.z += dz * push;
    }
  }
}
