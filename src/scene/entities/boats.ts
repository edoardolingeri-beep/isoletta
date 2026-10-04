// Barche di turisti che passano al largo. Toccandole si riceve una mancia.
import * as THREE from 'three';
import { createModel } from '../models/registry';

export class Boat {
  readonly obj: THREE.Object3D;
  private from = new THREE.Vector3();
  private to = new THREE.Vector3();
  private t = 0;
  private dur: number;
  tipped = false;
  hop = 0;
  done = false;

  constructor(seed: number, center: THREE.Vector3) {
    this.obj = createModel('vehicle.boat', seed);
    const dirA = Math.random() * Math.PI * 2;
    const dir = new THREE.Vector3(Math.cos(dirA), 0, Math.sin(dirA));
    const perp = new THREE.Vector3(-dir.z, 0, dir.x);
    const off = (13 + Math.random() * 2.5) * (Math.random() < 0.5 ? -1 : 1);
    this.from.copy(center).addScaledVector(perp, off).addScaledVector(dir, -30);
    this.to.copy(center).addScaledVector(perp, off).addScaledVector(dir, 30);
    this.dur = 60 / (2 + Math.random() * 0.8);
    this.obj.rotation.y = -dirA; // il modello guarda verso +x
    this.obj.position.copy(this.from);
  }

  update(dt: number, time: number): void {
    this.t += dt / this.dur;
    if (this.t >= 1) {
      this.done = true;
      return;
    }
    this.obj.position.lerpVectors(this.from, this.to, this.t);
    this.obj.position.y = Math.sin(time * 2 + this.dur) * 0.08 + this.hop;
    this.obj.rotation.x = Math.sin(time * 1.5 + this.dur) * 0.06;
    this.obj.rotation.z = Math.sin(time * 1.1) * 0.04;
  }
}
