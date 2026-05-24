import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import type { Input } from '../core/Input';
import type { Obstacle } from '../types';
import { resolveObstacles } from '../systems/collision';
import {
  ARENA_HALF,
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  PLAYER_SPRINT,
  PLAYER_MAX_HEALTH,
  MOUSE_SENSITIVITY,
  JUMP_SPEED,
  GRAVITY,
} from '../config';

export class Player {
  readonly controls: PointerLockControls;
  health = PLAYER_MAX_HEALTH;
  maxHealth = PLAYER_MAX_HEALTH;

  private camera: THREE.PerspectiveCamera;
  private bobTime = 0;
  private vy = 0;
  private onGround = true;
  private lookEuler = new THREE.Euler(0, 0, 0, 'YXZ');

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    private obstacles: Obstacle[] = [],
  ) {
    this.camera = camera;
    this.controls = new PointerLockControls(camera, domElement);
    this.controls.pointerSpeed = MOUSE_SENSITIVITY;
    this.spawn();
  }

  get isLocked(): boolean {
    return this.controls.isLocked;
  }

  lock(): void {
    this.controls.lock();
  }

  unlock(): void {
    this.controls.unlock();
  }

  get position(): THREE.Vector3 {
    return this.camera.position;
  }

  get dead(): boolean {
    return this.health <= 0;
  }

  spawn(): void {
    this.camera.position.set(0, PLAYER_HEIGHT, 0);
    this.camera.rotation.set(0, 0, 0);
    this.health = PLAYER_MAX_HEALTH;
    this.maxHealth = PLAYER_MAX_HEALTH;
    this.bobTime = 0;
    this.vy = 0;
    this.onGround = true;
  }

  /** Drej kameraet via touch-træk (samme matematik som PointerLockControls). */
  applyTouchLook(dx: number, dy: number, sensitivity: number): void {
    if (dx === 0 && dy === 0) return;
    this.lookEuler.setFromQuaternion(this.camera.quaternion);
    this.lookEuler.y -= dx * sensitivity;
    this.lookEuler.x -= dy * sensitivity;
    const lim = Math.PI / 2 - 0.02;
    this.lookEuler.x = THREE.MathUtils.clamp(this.lookEuler.x, -lim, lim);
    this.camera.quaternion.setFromEuler(this.lookEuler);
  }

  update(dt: number, input: Input): void {
    let forward: number;
    let right: number;
    let sprint: boolean;
    if (input.usingTouch) {
      // Analog joystick – fart følger udsving (magnitude ≤ 1).
      forward = input.moveY;
      right = input.moveX;
      sprint = input.sprinting;
    } else {
      forward = (input.isHeld('KeyW') ? 1 : 0) - (input.isHeld('KeyS') ? 1 : 0);
      right = (input.isHeld('KeyD') ? 1 : 0) - (input.isHeld('KeyA') ? 1 : 0);
      if (forward !== 0 && right !== 0) {
        const inv = 1 / Math.sqrt(2);
        forward *= inv;
        right *= inv;
      }
      sprint = input.isHeld('ShiftLeft') || input.isHeld('ShiftRight');
    }
    const speed = sprint ? PLAYER_SPRINT : PLAYER_SPEED;

    this.controls.moveForward(forward * speed * dt);
    this.controls.moveRight(right * speed * dt);

    resolveObstacles(this.camera.position, PLAYER_RADIUS, this.obstacles);

    const lim = ARENA_HALF - 1.5;
    this.camera.position.x = THREE.MathUtils.clamp(this.camera.position.x, -lim, lim);
    this.camera.position.z = THREE.MathUtils.clamp(this.camera.position.z, -lim, lim);

    // Hop og tyngdekraft
    if (input.wasPressed('Space') && this.onGround) {
      this.vy = JUMP_SPEED;
      this.onGround = false;
    }
    if (!this.onGround) {
      this.vy -= GRAVITY * dt;
      this.camera.position.y += this.vy * dt;
      if (this.camera.position.y <= PLAYER_HEIGHT) {
        this.camera.position.y = PLAYER_HEIGHT;
        this.vy = 0;
        this.onGround = true;
      }
    } else if (forward !== 0 || right !== 0) {
      this.bobTime += dt * speed;
      this.camera.position.y = PLAYER_HEIGHT + Math.sin(this.bobTime * 1.2) * 0.06;
    } else {
      this.camera.position.y += (PLAYER_HEIGHT - this.camera.position.y) * Math.min(1, dt * 8);
    }
  }

  /** Returnerer true hvis spilleren netop døde. */
  takeDamage(amount: number): boolean {
    if (this.dead) return false;
    this.health = Math.max(0, this.health - amount);
    return this.health <= 0;
  }

  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }
}
