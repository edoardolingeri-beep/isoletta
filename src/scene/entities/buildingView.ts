// Rappresentazione 3D di un lotto/edificio, con cambio modello a ogni livello.
import * as THREE from 'three';
import { BUILDINGS, type BuildingId } from '../../config/buildings';
import { animate, ease, popIn, squash } from '../../fx/tween';
import { createModel } from '../models/registry';

export class BuildingView {
  readonly root = new THREE.Group();
  private model: THREE.Object3D | null = null;
  level = -1;
  /** Produzione accumulata non ancora consegnata (per i numerini). */
  buffer: Record<string, number> = {};
  deliverTimer = Math.random() * 2;

  constructor(readonly id: BuildingId, x: number, y: number, z: number, rot: number) {
    this.root.position.set(x, y, z);
    this.root.rotation.y = rot;
    this.root.userData.interactive = true;
  }

  get isWaterBuilding(): boolean {
    return this.id === 'dock';
  }

  /** Punto sopra l'edificio dove appaiono marker e numeri. */
  topPoint(out = new THREE.Vector3()): THREE.Vector3 {
    const tall = this.id === 'lighthouse' ? [2.5, 4.4, 5.4, 6.4][this.level] : this.id === 'hut' ? [1.4, 2.4, 2.9, 3.6][this.level] : 1.8;
    const local = this.id === 'dock' ? new THREE.Vector3(1.2, 1.2, 0) : new THREE.Vector3(0, tall, 0);
    return this.root.localToWorld(out.copy(local));
  }

  setLevel(level: number, animated: boolean): void {
    if (level === this.level) return;
    this.level = level;
    const key = level <= 0 ? 'misc.plot' : `${BUILDINGS[this.id].model}.${level}`;
    const next = createModel(key, level + 1);
    next.userData.baseScale = 1;
    if (this.model) this.root.remove(this.model);
    this.model = next;
    this.root.add(next);
    if (animated) {
      popIn(next, 0.7);
      // piccolo salto dal basso
      next.position.y = -0.6;
      animate(0.6, (k) => (next.position.y = -0.6 * (1 - k)), { ease: ease.outBack });
    }
  }

  bounce(): void {
    if (this.model) squash(this.model, 0.12, 0.45);
  }

  update(time: number, night: number): void {
    const m = this.model;
    if (!m) return;
    const beam = m.userData.beam as THREE.Object3D | undefined;
    if (beam) {
      beam.rotation.y = time * 0.9;
      (m.userData.beamMat as THREE.MeshBasicMaterial).opacity = night * 0.22;
      beam.visible = night > 0.02;
    }
    const flag = m.userData.flag as THREE.Object3D | undefined;
    if (flag) flag.rotation.y = Math.sin(time * 3) * 0.3;
    const boat = m.userData.boat as THREE.Object3D | undefined;
    if (boat) {
      boat.position.y = -0.42 + Math.sin(time * 1.8) * 0.05;
      boat.rotation.x = Math.sin(time * 1.3) * 0.06;
    }
  }
}
