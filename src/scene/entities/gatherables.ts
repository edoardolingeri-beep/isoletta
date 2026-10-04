// Oggetti da toccare per raccogliere risorse: palme, alberi, punti di pesca, conchiglie.
import * as THREE from 'three';
import { GATHERABLES, type GatherableDef, type GatherableId } from '../../config/gatherables';
import { animate, ease, popIn } from '../../fx/tween';
import { createModel } from '../models/registry';

let seedCounter = 1;

export class Gatherable {
  readonly def: GatherableDef;
  readonly obj: THREE.Object3D;
  charges: number;
  private regen = 0;
  /** Conchiglie: tempo rimasto prima di ricomparire. */
  respawnIn = 0;

  constructor(readonly type: GatherableId, readonly zone: string) {
    this.def = GATHERABLES[type];
    this.obj = createModel(this.def.model, seedCounter++ * 7 + 3);
    this.obj.userData.baseScale = this.obj.scale.x;
    this.charges = this.def.charges;
  }

  get depleted(): boolean {
    return this.charges <= 0;
  }

  /** Prova a raccogliere: restituisce la quantità ottenuta (0 se esaurito). */
  harvest(): number {
    if (this.charges <= 0) return 0;
    this.charges--;
    if (this.charges === 0) this.setDepletedLook(true);
    return this.def.amount;
  }

  /** Frazione di ricarica per il prossimo tocco (0..1). */
  get regenProgress(): number {
    return this.def.regenSec > 0 ? this.regen / this.def.regenSec : 0;
  }

  update(dt: number, time: number): void {
    if (this.def.regenSec > 0 && this.charges < this.def.charges) {
      this.regen += dt;
      if (this.regen >= this.def.regenSec) {
        this.regen = 0;
        const was = this.charges;
        this.charges++;
        if (was === 0) this.setDepletedLook(false);
      }
    }
    if (this.type === 'fish') this.animateFishSpot(time);
  }

  private setDepletedLook(depleted: boolean): void {
    const crown = this.obj.userData.crown as THREE.Object3D | undefined;
    if (crown) {
      const from = crown.scale.x, to = depleted ? 0.55 : 1;
      animate(0.5, (k) => crown.scale.setScalar(from + (to - from) * k), { ease: depleted ? ease.outQuad : ease.outBack, owner: crown });
    }
    const ripples = this.obj.userData.ripples as THREE.Mesh[] | undefined;
    if (ripples) for (const r of ripples) r.visible = !depleted;
  }

  private animateFishSpot(time: number): void {
    const ripples = this.obj.userData.ripples as THREE.Mesh[];
    ripples.forEach((r, i) => {
      const k = (time * 0.6 + i * 0.5) % 1;
      r.scale.setScalar(0.4 + k * 1.2);
      (r.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - k);
    });
    const buoy = this.obj.userData.buoy as THREE.Object3D;
    buoy.position.y = Math.sin(time * 2) * 0.06;
    buoy.rotation.z = Math.sin(time * 1.6) * 0.12;
    // un pesce salta di tanto in tanto
    const fish = this.obj.userData.fish as THREE.Object3D;
    const cycle = (time % 4.5) / 1.1;
    if (cycle < 1 && !this.depleted) {
      fish.visible = true;
      fish.position.set(-0.6 + cycle * 1.2, Math.sin(cycle * Math.PI) * 0.9 - 0.1, 0.1);
      fish.rotation.z = (0.5 - cycle) * 2.2;
    } else fish.visible = false;
  }

  /** Effetto di "spunto" quando un oggetto (ri)appare. */
  appear(delay = 0): void {
    popIn(this.obj, 0.6, delay);
  }
}
