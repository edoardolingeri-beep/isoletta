// Particelle 3D (un solo draw call): schegge, coriandoli, sabbia, foglie...
import * as THREE from 'three';

const MAX = 400;

interface P { life: number; max: number; pos: THREE.Vector3; vel: THREE.Vector3; rot: THREE.Euler; spin: THREE.Vector3; size: number; gravity: number }

export class Particles {
  readonly mesh: THREE.InstancedMesh;
  private ps: P[] = [];
  private free: number[] = [];
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();

  constructor(scene: THREE.Scene) {
    const geo = new THREE.IcosahedronGeometry(0.1, 0);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.5, flatShading: true });
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    for (let i = 0; i < MAX; i++) {
      this.ps.push({ life: 0, max: 1, pos: new THREE.Vector3(), vel: new THREE.Vector3(), rot: new THREE.Euler(), spin: new THREE.Vector3(), size: 1, gravity: 9 });
      this.free.push(i);
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, this.color.set('#ffffff'));
    }
    scene.add(this.mesh);
  }

  /** Esplosione di particelle colorate. */
  burst(at: THREE.Vector3, colors: string[], count = 14, opts: { speed?: number; up?: number; size?: number; gravity?: number; life?: number } = {}): void {
    const speed = opts.speed ?? 3, up = opts.up ?? 4;
    for (let n = 0; n < count; n++) {
      const i = this.free.pop();
      if (i === undefined) return;
      const p = this.ps[i];
      p.max = p.life = (opts.life ?? 0.9) * (0.7 + Math.random() * 0.6);
      p.pos.copy(at);
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      p.vel.set(Math.cos(a) * s, up * (0.6 + Math.random() * 0.7), Math.sin(a) * s);
      p.rot.set(Math.random() * 6, Math.random() * 6, 0);
      p.spin.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, 0);
      p.size = (opts.size ?? 1) * (0.6 + Math.random() * 0.8);
      p.gravity = opts.gravity ?? 11;
      this.mesh.setColorAt(i, this.color.set(colors[n % colors.length]));
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt: number): void {
    let dirty = false;
    for (let i = 0; i < MAX; i++) {
      const p = this.ps[i];
      if (p.life <= 0) continue;
      dirty = true;
      p.life -= dt;
      p.vel.y -= p.gravity * dt;
      p.pos.addScaledVector(p.vel, dt);
      if (p.pos.y < 0.05 && p.vel.y < 0) {
        p.pos.y = 0.05;
        p.vel.multiplyScalar(0.4);
        p.vel.y *= -0.5;
      }
      p.rot.x += p.spin.x * dt;
      p.rot.y += p.spin.y * dt;
      const k = Math.max(0, p.life / p.max);
      this.dummy.position.copy(p.pos);
      this.dummy.rotation.copy(p.rot);
      this.dummy.scale.setScalar(p.life > 0 ? p.size * Math.min(1, k * 2.5) : 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      if (p.life <= 0) this.free.push(i);
    }
    if (dirty) this.mesh.instanceMatrix.needsUpdate = true;
  }
}
