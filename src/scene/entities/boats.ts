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

  /**
   * La barca attraversa la scena in linea retta passando vicino all'isola.
   * `isWater` scarta le rotte che toccherebbero terra o nebbia.
   */
  constructor(seed: number, center: THREE.Vector3, isWater: (x: number, z: number) => boolean) {
    this.obj = createModel('vehicle.boat', seed);
    let dirA = 0;
    const dir = new THREE.Vector3(), perp = new THREE.Vector3();
    // prova rotte sempre più larghe finché una resta tutta in acqua
    for (let tries = 0; tries < 40; tries++) {
      dirA = Math.random() * Math.PI * 2;
      dir.set(Math.cos(dirA), 0, Math.sin(dirA));
      perp.set(-dir.z, 0, dir.x);
      const off = (8.5 + tries * 0.2 + Math.random() * 2) * (Math.random() < 0.5 ? -1 : 1);
      this.from.copy(center).addScaledVector(perp, off).addScaledVector(dir, -28);
      this.to.copy(center).addScaledVector(perp, off).addScaledVector(dir, 28);
      let ok = true;
      for (let s = 0; s <= 40 && ok; s++) {
        const p = new THREE.Vector3().lerpVectors(this.from, this.to, s / 40);
        ok = isWater(p.x, p.z);
      }
      if (ok) break;
    }
    // più lente di prima: c'è tempo per toccarle
    this.dur = 56 / (1.4 + Math.random() * 0.5);
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
