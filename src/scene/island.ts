// Terreno dell'isola (dischi di sabbia con prato) e banchi di nebbia.
import * as THREE from 'three';
import type { Disc, ZoneDef } from '../config/zones';
import { COLORS as C, mat } from './materials';
import { createModel } from './models/registry';
import { rng } from './models/kit';

export const LAND_TOP = 0.5;
export const GRASS_TOP = 0.57;

function lathe(points: [number, number][], m: THREE.Material): THREE.Mesh {
  // il profilo va dall'esterno verso l'asse, così le normali guardano in su/fuori
  const g = new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)).reverse(), 64);
  const me = new THREE.Mesh(g, m);
  me.receiveShadow = true;
  return me;
}

/** Terreno di una zona: un disco "tozzo" di sabbia per ogni Disc, con prato sopra. */
export function buildLand(zone: ZoneDef): THREE.Group {
  const g = new THREE.Group();
  const sand = mat(C.sand, { rough: 0.85 });
  const sandWet = mat(C.sandDark, { rough: 0.7 });
  const grass = mat(C.grass, { rough: 0.8 });
  const grassEdge = mat(C.grassDark, { rough: 0.8 });
  for (const d of zone.discs) {
    const r = d.r, t = LAND_TOP;
    const top = lathe([[0, t], [r - 0.4, t], [r - 0.15, t - 0.03], [r - 0.02, t - 0.14], [r + 0.08, t - 0.3]], sand);
    const side = lathe([[r + 0.08, t - 0.3], [r + 0.3, t - 0.6], [r + 0.7, -1.4], [0, -1.4]], sandWet);
    top.position.set(d.x, 0, d.z);
    side.position.set(d.x, 0, d.z);
    g.add(top, side);
    if (d.grass > 0) {
      const gr = r * d.grass, gt = GRASS_TOP;
      const pad = lathe([[0, gt], [gr - 0.18, gt], [gr - 0.04, gt - 0.02], [gr, gt - 0.05]], grass);
      const rim = lathe([[gr, gt - 0.05], [gr + 0.03, t - 0.01]], grassEdge);
      pad.position.set(d.x, 0, d.z);
      rim.position.set(d.x, 0, d.z);
      g.add(pad, rim);
    }
  }
  return g;
}

/** Altezza del terreno in (x, z) per le zone date; 0 = acqua. */
export function groundHeight(x: number, z: number, discs: Disc[]): number {
  let h = 0;
  for (const d of discs) {
    const dist = Math.hypot(x - d.x, z - d.z);
    if (dist <= d.r * d.grass) return GRASS_TOP;
    if (dist <= d.r - 0.1) h = LAND_TOP;
  }
  return h;
}

export function onLand(x: number, z: number, discs: Disc[], margin = 0.4): boolean {
  return discs.some((d) => Math.hypot(x - d.x, z - d.z) <= d.r - margin);
}

export function onSand(x: number, z: number, discs: Disc[]): boolean {
  return onLand(x, z, discs, 0.4) && !discs.some((d) => Math.hypot(x - d.x, z - d.z) <= d.r * d.grass + 0.25);
}

/** Banco di nebbia "a nuvolette" che copre una zona bloccata. */
export function buildFog(zone: ZoneDef): THREE.Group {
  const g = new THREE.Group();
  const r = rng(zone.id.length * 13 + zone.discs.length);
  let seed = 1;
  for (const d of zone.discs) {
    const n = Math.ceil(d.r * d.r * 0.7) + 3;
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const rad = Math.sqrt(r()) * (d.r - 0.4);
      const puff = createModel('misc.cloud', seed++);
      puff.position.set(d.x + Math.cos(a) * rad, 0.2 + r() * 0.7, d.z + Math.sin(a) * rad);
      const s = 0.75 + r() * 0.45;
      puff.scale.setScalar(s);
      puff.userData.baseScale = s;
      puff.userData.baseY = puff.position.y;
      puff.userData.phase = r() * Math.PI * 2;
      g.add(puff);
    }
  }
  return g;
}

export function updateFog(fog: THREE.Group, time: number): void {
  for (const p of fog.children) {
    const ph = p.userData.phase as number;
    p.position.y = (p.userData.baseY as number) + Math.sin(time * 0.8 + ph) * 0.15;
    p.rotation.y = Math.sin(time * 0.2 + ph) * 0.3;
  }
}
