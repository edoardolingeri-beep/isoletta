// Abitanti che passeggiano sull'isola. Toccandoli saltano e salutano.
import * as THREE from 'three';
import type { Disc } from '../../config/zones';
import { animate, ease, popIn } from '../../fx/tween';
import { groundHeight, onLand } from '../island';
import { createModel } from '../models/registry';

const PHRASES = ['Ciao!', 'Che bel sole!', 'Evviva!', 'Ho fame di pesce…', 'Mi piace qui!', 'Altre palme!', 'Che pace…', 'Andiamo al mare?', 'Buongiorno!', 'Wow!'];
const NIGHT_PHRASES = ['Che sonno…', 'Guarda le lucciole!', 'Buonanotte!', 'Che stelle!'];

interface Rig { legL: THREE.Object3D; legR: THREE.Object3D; armL: THREE.Object3D; armR: THREE.Object3D; body: THREE.Object3D; head: THREE.Object3D }

export class Villager {
  readonly obj: THREE.Object3D;
  private rig: Rig;
  private target = new THREE.Vector3();
  private idle = 0;
  private walkPhase = Math.random() * 10;
  private hop = 0;
  private speed = 1 + Math.random() * 0.5;
  /** Uscita da un edificio, per i nuovi arrivati. */
  constructor(seed: number, start: THREE.Vector3) {
    this.obj = createModel('char.villager', seed);
    this.rig = this.obj.userData.rig as Rig;
    this.obj.position.copy(start);
    this.target.copy(start);
    this.idle = Math.random() * 2;
    this.obj.userData.baseScale = this.obj.scale.x;
  }

  appear(): void {
    popIn(this.obj, 0.6);
  }

  jump(): void {
    animate(0.55, (k) => (this.hop = Math.sin(k * Math.PI) * 0.7), { ease: ease.linear, owner: this });
  }

  phrase(night: boolean): string {
    const list = night ? NIGHT_PHRASES : PHRASES;
    return list[Math.floor(Math.random() * list.length)];
  }

  update(dt: number, discs: Disc[], obstacles: THREE.Vector3[]): void {
    const p = this.obj.position;
    const dx = this.target.x - p.x, dz = this.target.z - p.z;
    const dist = Math.hypot(dx, dz);
    let walking = false;
    if (this.idle > 0) {
      this.idle -= dt;
    } else if (dist < 0.1) {
      this.idle = 1 + Math.random() * 3;
      this.pickTarget(discs, obstacles);
    } else {
      walking = true;
      const step = Math.min(dist, this.speed * dt);
      p.x += (dx / dist) * step;
      p.z += (dz / dist) * step;
      const want = Math.atan2(dx, dz);
      let diff = want - this.obj.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.obj.rotation.y += diff * Math.min(1, dt * 10);
    }
    p.y = groundHeight(p.x, p.z, discs) + this.hop;

    // animazione camminata "a molla"
    const r = this.rig;
    if (walking) {
      this.walkPhase += dt * 11 * this.speed;
      const s = Math.sin(this.walkPhase);
      r.legL.rotation.x = s * 0.7;
      r.legR.rotation.x = -s * 0.7;
      r.armL.rotation.x = -s * 0.8;
      r.armR.rotation.x = s * 0.8;
      r.body.position.y = Math.abs(Math.cos(this.walkPhase)) * 0.06;
      r.body.rotation.z = s * 0.06;
    } else {
      const k = Math.min(1, dt * 8);
      for (const o of [r.legL, r.legR, r.armL, r.armR]) o.rotation.x *= 1 - k;
      r.body.position.y = Math.sin(this.walkPhase + performance.now() * 0.003) * 0.015;
      r.body.rotation.z *= 1 - k;
      if (this.hop > 0.05) {
        r.armL.rotation.z = -2.4;
        r.armR.rotation.z = 2.4;
      } else {
        r.armL.rotation.z *= 1 - k;
        r.armR.rotation.z *= 1 - k;
      }
    }
  }

  private pickTarget(discs: Disc[], obstacles: THREE.Vector3[]): void {
    const p = this.obj.position;
    for (let tries = 0; tries < 12; tries++) {
      const d = discs[Math.floor(Math.random() * discs.length)];
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * (d.r - 0.8);
      const x = d.x + Math.cos(a) * rr, z = d.z + Math.sin(a) * rr;
      if (obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < 1.3)) continue;
      // il percorso deve restare sulla terraferma
      let ok = true;
      for (let s = 1; s <= 8 && ok; s++) {
        const t = s / 8;
        ok = onLand(p.x + (x - p.x) * t, p.z + (z - p.z) * t, discs, 0.5);
      }
      if (!ok) continue;
      this.target.set(x, 0, z);
      return;
    }
  }
}
