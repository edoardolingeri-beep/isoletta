// Piccolo "kit" di forme tozze e arrotondate per costruire modelli procedurali.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mat } from '../materials';

const geoCache = new Map<string, THREE.BufferGeometry>();
function cached<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = geoCache.get(key) as T | undefined;
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
}

type MatLike = string | THREE.Material;
const toMat = (m: MatLike) => (typeof m === 'string' ? mat(m) : m);

export function mesh(g: THREE.BufferGeometry, m: MatLike, x = 0, y = 0, z = 0): THREE.Mesh {
  const me = new THREE.Mesh(g, toMat(m));
  me.position.set(x, y, z);
  me.castShadow = true;
  me.receiveShadow = true;
  return me;
}

/** Scatola con angoli arrotondati (y = centro). */
export function rbox(w: number, h: number, d: number, r: number, m: MatLike, x = 0, y = 0, z = 0) {
  const rr = Math.min(r, w / 2, h / 2, d / 2) * 0.999;
  return mesh(cached(`rb${w}|${h}|${d}|${rr}`, () => new RoundedBoxGeometry(w, h, d, 3, rr)), m, x, y, z);
}

export function cyl(rt: number, rb: number, h: number, m: MatLike, x = 0, y = 0, z = 0, seg = 16) {
  return mesh(cached(`cy${rt}|${rb}|${h}|${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), m, x, y, z);
}

export function sph(r: number, m: MatLike, x = 0, y = 0, z = 0, seg = 16) {
  return mesh(cached(`sp${r}|${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.75)))), m, x, y, z);
}

/** Semisfera (cupola) con la base piatta a y=0. */
export function dome(r: number, m: MatLike, x = 0, y = 0, z = 0) {
  return mesh(cached(`dm${r}`, () => new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)), m, x, y, z);
}

export function cone(r: number, h: number, m: MatLike, x = 0, y = 0, z = 0, seg = 16) {
  return mesh(cached(`co${r}|${h}|${seg}`, () => new THREE.ConeGeometry(r, h, seg)), m, x, y, z);
}

export function capsule(r: number, len: number, m: MatLike, x = 0, y = 0, z = 0) {
  return mesh(cached(`ca${r}|${len}`, () => new THREE.CapsuleGeometry(r, len, 4, 10)), m, x, y, z);
}

export function ico(r: number, m: MatLike, x = 0, y = 0, z = 0, detail = 0) {
  return mesh(cached(`ic${r}|${detail}`, () => new THREE.IcosahedronGeometry(r, detail)), m, x, y, z);
}

export function torus(r: number, tube: number, m: MatLike, x = 0, y = 0, z = 0) {
  return mesh(cached(`to${r}|${tube}`, () => new THREE.TorusGeometry(r, tube, 8, 24)), m, x, y, z);
}

/** Mesh invisibile usata solo per rendere più facile toccare oggetti piccoli. */
const hitMat = new THREE.MeshBasicMaterial({ visible: false });
export function hitSphere(r: number, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(cached(`hit${r}`, () => new THREE.SphereGeometry(r, 8, 6)), hitMat);
  m.position.set(x, y, z);
  m.userData.hitProxy = true;
  return m;
}

export function group(...children: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  if (children.length) g.add(...children);
  return g;
}

/** Generatore pseudo-casuale con seme, per varianti riproducibili. */
export function rng(seed: number) {
  let s = (seed * 9301 + 49297) % 233280 || 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function pick<T>(r: () => number, arr: readonly T[]): T {
  return arr[Math.floor(r() * arr.length) % arr.length];
}
