// Modelli 3D costruiti con geometrie di three.js.
// Convenzioni (valide anche per i futuri .glb):
// - origine alla base dell'oggetto, y = 0 è il terreno (per il molo: la riva)
// - il "davanti" guarda verso +z, il molo si allunga verso +x
// - 1 unità ≈ 1 metro; un omino è alto circa 1
import * as THREE from 'three';
import { COLORS as C, glowMat, mat } from '../materials';
import { capsule, cone, cyl, dome, group, hitSphere, ico, mesh, pick, rbox, rng, sph, torus } from './kit';

export type Factory = (seed: number) => THREE.Object3D;

// ---------------------------------------------------------------- natura

function palm(seed: number) {
  const r = rng(seed);
  const g = group();
  const lean = 0.25 + r() * 0.3;
  const segs = 6;
  let top = new THREE.Vector3();
  for (let i = 0; i < segs; i++) {
    const t = i / segs;
    const rad = 0.17 - t * 0.06;
    const s = cyl(rad * 0.85, rad, 0.42, i % 2 ? C.wood : C.woodLight, lean * t * t, 0.21 + i * 0.4, 0, 10);
    s.rotation.z = -lean * t * 0.9;
    g.add(s);
    top = new THREE.Vector3(lean * t * t + 0.05, 0.42 + i * 0.4, 0);
  }
  const crown = group();
  crown.position.copy(top);
  const leaves = 7;
  for (let i = 0; i < leaves; i++) {
    const pivot = group();
    pivot.rotation.y = (i / leaves) * Math.PI * 2 + r() * 0.3;
    const leaf = sph(0.5, i % 2 ? C.leaf : C.leafLight, 0.62, -0.08, 0);
    leaf.scale.set(1.45, 0.16, 0.5);
    leaf.rotation.z = -0.38 - r() * 0.15;
    pivot.add(leaf);
    crown.add(pivot);
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    crown.add(sph(0.12, C.woodDark, Math.cos(a) * 0.16, -0.18, Math.sin(a) * 0.16, 10));
  }
  g.add(crown);
  g.userData.crown = crown;
  g.add(hitSphere(0.9, 0.2, 1.4, 0));
  g.rotation.y = r() * Math.PI * 2;
  return g;
}

function tree(seed: number) {
  const r = rng(seed);
  const g = group();
  g.add(cyl(0.16, 0.24, 1.3, C.woodDark, 0, 0.65, 0, 10));
  const crown = group();
  const col = pick(r, [C.leaf, C.leafDark, '#4fd67a', '#2fb86b']);
  const main = sph(0.95, col, 0, 1.85, 0, 18);
  crown.add(main);
  crown.add(sph(0.66, C.leafLight, 0.55, 1.45, 0.3, 14));
  crown.add(sph(0.6, col, -0.5, 1.5, -0.25, 14));
  crown.add(sph(0.5, C.leafLight, -0.1, 2.5, 0.2, 12));
  // qualche frutto rosso
  for (let i = 0; i < 4; i++) {
    const a = r() * Math.PI * 2, b = 0.3 + r() * 0.9;
    crown.add(sph(0.1, C.red, Math.cos(a) * 0.9 * Math.sin(b + 0.5), 1.85 + Math.cos(b + 0.5) * 0.85, Math.sin(a) * 0.9 * Math.sin(b + 0.5), 8));
  }
  g.add(crown);
  g.userData.crown = crown;
  g.add(hitSphere(1.1, 0, 1.6, 0));
  g.rotation.y = r() * Math.PI * 2;
  const s = 0.9 + r() * 0.25;
  g.scale.setScalar(s);
  return g;
}

function fishSpot() {
  const g = group();
  // boa bianca e rossa che galleggia
  const buoy = group(
    cyl(0.22, 0.26, 0.22, C.red, 0, 0.05, 0),
    cyl(0.2, 0.22, 0.14, C.white, 0, 0.23, 0),
    sph(0.09, C.yellow, 0, 0.36, 0, 10),
  );
  buoy.position.set(0.7, 0, -0.4);
  g.add(buoy);
  g.userData.buoy = buoy;
  const ringMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7, depthWrite: false });
  const ripples: THREE.Mesh[] = [];
  for (let i = 0; i < 2; i++) {
    const ring = torus(0.6, 0.045, ringMat.clone());
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.06;
    ring.castShadow = false;
    g.add(ring);
    ripples.push(ring);
  }
  g.userData.ripples = ripples;
  const fish = group();
  const body = sph(0.3, C.orange, 0, 0, 0, 14);
  body.scale.set(1, 0.6, 0.42);
  const tail = cone(0.18, 0.26, C.orange, -0.36, 0, 0, 8);
  tail.rotation.z = Math.PI / 2;
  tail.scale.set(1, 1, 0.3);
  fish.add(body, tail, sph(0.05, C.dark, 0.18, 0.06, 0.1, 6));
  fish.visible = false;
  g.add(fish);
  g.userData.fish = fish;
  g.add(hitSphere(1.1, 0, 0.3, 0));
  return g;
}

function shell(seed: number) {
  const r = rng(seed);
  const g = group();
  const col = pick(r, [C.pink, '#ffb0d0', '#ffd9a8', '#c9a2ff']);
  const d = dome(0.2, col);
  d.scale.set(1, 0.55, 0.85);
  g.add(d);
  for (let i = -2; i <= 2; i++) {
    const rib = cyl(0.018, 0.018, 0.36, col, i * 0.06, 0.06, 0, 6);
    rib.rotation.x = Math.PI / 2;
    rib.rotation.y = i * 0.25;
    g.add(rib);
  }
  g.add(rbox(0.12, 0.06, 0.08, 0.02, col, 0, 0.02, 0.17));
  g.add(hitSphere(0.55, 0, 0.2, 0));
  g.rotation.y = r() * Math.PI * 2;
  return g;
}

function rock(seed: number) {
  const r = rng(seed);
  const m = new THREE.MeshStandardMaterial({ color: C.rock, roughness: 0.8, flatShading: true });
  const g = group();
  const a = ico(0.5, m, 0, 0.18, 0);
  a.scale.set(1, 0.65, 0.85);
  const b = ico(0.3, m, 0.45, 0.1, 0.2);
  b.scale.set(1, 0.7, 1);
  g.add(a, b);
  g.rotation.y = r() * Math.PI * 2;
  return g;
}

function bush(seed: number) {
  const r = rng(seed);
  const g = group(
    sph(0.36, C.leafDark, 0, 0.22, 0, 12),
    sph(0.28, C.leaf, 0.3, 0.16, 0.1, 12),
    sph(0.26, C.leafLight, -0.26, 0.15, 0.12, 12),
  );
  for (let i = 0; i < 3; i++) g.add(sph(0.06, pick(r, [C.pink, C.yellow, C.white]), (r() - 0.5) * 0.6, 0.35 + r() * 0.15, 0.2 + r() * 0.1, 8));
  return g;
}

function flower(seed: number) {
  const r = rng(seed);
  const g = group();
  for (let k = 0; k < 3; k++) {
    const f = group();
    const col = pick(r, [C.pink, C.yellow, C.white, C.violet, C.red]);
    f.add(cyl(0.02, 0.02, 0.3, C.leafDark, 0, 0.15, 0, 5));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      f.add(sph(0.06, col, Math.cos(a) * 0.07, 0.32, Math.sin(a) * 0.07, 8));
    }
    f.add(sph(0.05, C.yellow, 0, 0.34, 0, 8));
    f.position.set((r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.5);
    g.add(f);
  }
  return g;
}

function mushroom(seed: number) {
  const r = rng(seed);
  const g = group();
  for (let k = 0; k < 2; k++) {
    const s = k ? 0.6 : 1;
    const m = group(cyl(0.08, 0.1, 0.3, C.white, 0, 0.15, 0, 10));
    const cap = dome(0.24, C.red, 0, 0.27, 0);
    cap.scale.set(1, 0.75, 1);
    m.add(cap);
    for (let i = 0; i < 4; i++) {
      const a = r() * Math.PI * 2;
      m.add(sph(0.04, C.white, Math.cos(a) * 0.14, 0.4, Math.sin(a) * 0.14, 6));
    }
    m.scale.setScalar(s);
    m.position.set(k * 0.3, 0, k * 0.15);
    g.add(m);
  }
  return g;
}

function campfire() {
  const g = group();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const s = ico(0.1, C.rockDark, Math.cos(a) * 0.32, 0.06, Math.sin(a) * 0.32);
    g.add(s);
  }
  for (let i = 0; i < 3; i++) {
    const log = cyl(0.06, 0.06, 0.55, C.woodDark, 0, 0.1, 0, 8);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = (i / 3) * Math.PI;
    g.add(log);
  }
  const fireMat = new THREE.MeshStandardMaterial({ color: '#ff7a2a', emissive: '#ff5a00', emissiveIntensity: 1.2 });
  const fireMat2 = new THREE.MeshStandardMaterial({ color: '#ffe066', emissive: '#ffcc00', emissiveIntensity: 1.4 });
  const flame = group(cone(0.17, 0.42, fireMat, 0, 0.32, 0, 8), cone(0.09, 0.26, fireMat2, 0, 0.27, 0, 8));
  flame.children.forEach((c) => (c.castShadow = false));
  g.add(flame);
  g.userData.flame = flame;
  return g;
}

// ---------------------------------------------------------------- edifici

function plot() {
  const g = group();
  const slab = rbox(1.9, 0.08, 1.9, 0.04, C.sandDark, 0, 0.04, 0);
  slab.castShadow = false;
  g.add(slab);
  for (const [x, z] of [[-0.85, -0.85], [0.85, -0.85], [-0.85, 0.85], [0.85, 0.85]]) {
    g.add(cyl(0.05, 0.06, 0.4, C.wood, x, 0.2, z, 6));
    g.add(sph(0.06, C.red, x, 0.42, z, 8));
  }
  const sign = group(cyl(0.05, 0.05, 0.8, C.woodDark, 0, 0.4, 0, 6), rbox(0.6, 0.36, 0.08, 0.05, C.yellow, 0, 0.75, 0.04));
  sign.position.set(0.55, 0, 0.55);
  sign.rotation.y = -0.4;
  g.add(sign);
  g.add(hitSphere(1.2, 0, 0.5, 0));
  return g;
}

function door(x: number, y: number, z: number, h = 0.55) {
  return group(rbox(0.38, h, 0.08, 0.06, C.woodDark, x, y, z), sph(0.03, C.yellow, x + 0.11, y, z + 0.05, 6));
}
function windowBox(x: number, y: number, z: number, ry = 0) {
  const w = group(rbox(0.38, 0.38, 0.06, 0.05, C.white, 0, 0, 0), rbox(0.28, 0.28, 0.08, 0.04, glowMat, 0, 0, 0.01));
  w.position.set(x, y, z);
  w.rotation.y = ry;
  return w;
}
function pyramidRoof(r: number, h: number, color: string, y: number) {
  const roof = cone(r, h, color, 0, y + h / 2, 0, 4);
  roof.rotation.y = Math.PI / 4;
  return roof;
}

function hut1() {
  const g = group();
  g.add(rbox(1.7, 0.18, 1.6, 0.06, C.woodDark, 0, 0.09, 0));
  g.add(rbox(1.3, 0.85, 1.15, 0.1, C.woodLight, 0, 0.6, 0));
  g.add(door(0, 0.46, 0.58));
  g.add(pyramidRoof(1.15, 0.95, C.straw, 1.0));
  g.add(sph(0.08, C.yellow, 0, 2.0, 0, 8));
  const crate = rbox(0.34, 0.3, 0.34, 0.05, C.wood, 0.75, 0.33, 0.6);
  crate.rotation.y = 0.4;
  g.add(crate);
  g.add(hitSphere(1.3, 0, 0.9, 0));
  return g;
}

function hut2() {
  const g = group();
  for (const [x, z] of [[-0.75, -0.65], [0.75, -0.65], [-0.75, 0.65], [0.75, 0.65]]) g.add(cyl(0.08, 0.08, 0.45, C.woodDark, x, 0.22, z, 8));
  g.add(rbox(1.9, 0.15, 1.7, 0.06, C.wood, 0, 0.45, 0));
  g.add(rbox(1.5, 0.95, 1.25, 0.12, C.orange, 0, 1.0, 0));
  g.add(door(-0.3, 0.82, 0.63, 0.6));
  g.add(windowBox(0.35, 1.05, 0.63));
  g.add(windowBox(0.76, 1.05, 0, Math.PI / 2));
  g.add(pyramidRoof(1.35, 1.0, C.red, 1.45));
  g.add(rbox(0.5, 0.1, 0.35, 0.03, C.woodDark, -0.3, 0.25, 1.0));
  g.add(rbox(0.5, 0.1, 0.35, 0.03, C.woodDark, -0.3, 0.1, 1.25));
  const pot = group(cyl(0.12, 0.09, 0.2, C.red, 0, 0.1, 0, 10), sph(0.16, C.leaf, 0, 0.28, 0, 10), sph(0.05, C.pink, 0.06, 0.4, 0.08, 6));
  pot.position.set(0.65, 0.52, 0.72);
  g.add(pot);
  g.add(hitSphere(1.4, 0, 1.1, 0));
  return g;
}

function hut3() {
  const g = group();
  g.add(rbox(2.3, 0.2, 2.0, 0.08, C.woodDark, 0, 0.1, 0));
  g.add(rbox(1.95, 1.0, 1.6, 0.14, C.pink, 0, 0.7, 0));
  g.add(door(0, 0.5, 0.81, 0.62));
  g.add(windowBox(-0.6, 0.72, 0.81), windowBox(0.6, 0.72, 0.81), windowBox(0.99, 0.72, 0, Math.PI / 2));
  g.add(rbox(2.15, 0.14, 1.8, 0.06, C.purple, 0, 1.25, 0));
  g.add(rbox(1.4, 0.8, 1.2, 0.12, C.white, 0, 1.72, 0));
  g.add(windowBox(0, 1.75, 0.61));
  g.add(pyramidRoof(1.15, 0.9, C.purple, 2.1));
  g.add(rbox(0.22, 0.5, 0.22, 0.04, C.rock, 0.45, 2.55, -0.25));
  const flag = group(cyl(0.025, 0.025, 0.7, C.white, 0, 0.35, 0, 6), rbox(0.36, 0.22, 0.03, 0.02, C.yellow, 0.18, 0.58, 0));
  flag.position.set(0, 2.9, 0);
  g.add(flag);
  g.userData.flag = flag;
  for (const x of [-1.05, 1.05]) {
    const p = group(cyl(0.15, 0.11, 0.24, C.white, 0, 0.12, 0, 10), sph(0.2, C.leaf, 0, 0.36, 0, 10), sph(0.06, C.yellow, 0.08, 0.5, 0.08, 6));
    p.position.set(x, 0.2, 1.05);
    g.add(p);
  }
  g.add(hitSphere(1.6, 0, 1.3, 0));
  return g;
}

function pier(len: number) {
  const g = group();
  const n = Math.round(len / 0.4);
  for (let i = 0; i < n; i++) g.add(rbox(0.36, 0.08, 1.0, 0.03, i % 2 ? C.wood : C.woodLight, -0.2 + i * 0.4, -0.08, 0));
  for (let x = 0.6; x < -0.2 + n * 0.4; x += 1.2) {
    for (const z of [-0.5, 0.5]) g.add(cyl(0.08, 0.08, 1.3, C.woodDark, x, -0.55, z, 8));
  }
  return g;
}

function rowboat(color: string) {
  const g = group();
  const hull = rbox(1.1, 0.3, 0.5, 0.14, color, 0, 0, 0);
  g.add(hull, rbox(0.95, 0.06, 0.38, 0.03, C.woodLight, 0, 0.14, 0), rbox(0.08, 0.06, 0.4, 0.02, C.woodDark, 0.15, 0.2, 0));
  return g;
}

function dock1() {
  const g = pier(2.4);
  g.add(cyl(0.09, 0.1, 0.3, C.woodDark, 1.8, 0.1, 0.42, 8));
  g.add(hitSphere(1.4, 1.0, 0, 0));
  return g;
}

function dock2() {
  const g = pier(3.6);
  const boat = rowboat(C.blue);
  boat.position.set(2.2, -0.42, 0.95);
  g.add(boat);
  g.userData.boat = boat;
  g.add(cyl(0.09, 0.1, 0.3, C.woodDark, 2.9, 0.1, 0.42, 8));
  const coil = torus(0.13, 0.05, C.straw, 2.5, 0.0, -0.3);
  coil.rotation.x = Math.PI / 2;
  g.add(coil);
  g.add(rbox(0.35, 0.28, 0.35, 0.05, C.wood, 1.2, 0.1, -0.3));
  g.add(hitSphere(1.8, 1.5, 0, 0));
  return g;
}

function dock3() {
  const g = pier(3.6);
  g.add(rbox(1.2, 0.08, 2.6, 0.03, C.woodLight, 3.6, -0.08, 0));
  for (const z of [-1.1, 1.1]) g.add(cyl(0.08, 0.08, 1.3, C.woodDark, 3.6, -0.55, z, 8));
  const boat = rowboat(C.red);
  boat.position.set(2.0, -0.42, 1.0);
  g.add(boat);
  g.userData.boat = boat;
  // chiosco del pesce con tenda a righe
  const kiosk = group(rbox(0.9, 0.7, 0.8, 0.08, C.blue, 0, 0.35, 0));
  for (let i = 0; i < 5; i++) kiosk.add(rbox(0.2, 0.08, 0.5, 0.03, i % 2 ? C.white : C.red, -0.4 + i * 0.2, 0.8, 0.35));
  kiosk.add(pyramidRoof(0.7, 0.45, C.red, 0.7));
  kiosk.add(windowBox(0, 0.4, 0.41));
  kiosk.position.set(3.6, -0.04, -0.6);
  g.add(kiosk);
  for (const z of [-1.2, 1.2]) {
    g.add(cyl(0.035, 0.035, 0.8, C.dark, 4.1, 0.36, z, 6));
    g.add(sph(0.11, glowMat, 4.1, 0.82, z, 10));
  }
  g.add(rbox(0.35, 0.28, 0.35, 0.05, C.wood, 1.2, 0.1, -0.3), rbox(0.3, 0.25, 0.3, 0.05, C.wood, 3.2, 0.09, 0.6));
  g.add(hitSphere(2.0, 2.0, 0, 0));
  return g;
}

function sprout(x: number, z: number) {
  return group(sph(0.07, C.leafLight, x - 0.05, 0.25, z, 8), sph(0.07, C.leaf, x + 0.05, 0.27, z, 8), cyl(0.015, 0.015, 0.12, C.leafDark, x, 0.2, z, 4));
}
function carrot(x: number, z: number) {
  const c = cone(0.07, 0.12, C.orange, x, 0.2, z, 8);
  c.rotation.x = Math.PI;
  return group(c, cone(0.05, 0.22, C.leaf, x - 0.03, 0.35, z, 5), cone(0.05, 0.2, C.leafLight, x + 0.04, 0.34, z, 5));
}
function lettuce(x: number, z: number) {
  return group(sph(0.15, C.leafLight, x, 0.24, z, 10), sph(0.1, '#b8f27a', x, 0.33, z, 8));
}
function pumpkin(x: number, z: number) {
  const p = sph(0.22, C.orange, x, 0.28, z, 14);
  p.scale.set(1, 0.7, 1);
  return group(p, cyl(0.03, 0.03, 0.1, C.leafDark, x, 0.45, z, 5));
}
function fence(size: number, color: string) {
  const g = group();
  const h = size / 2;
  const n = 5;
  for (let i = 0; i <= n; i++) {
    const t = -h + (i / n) * size;
    for (const [x, z] of [[t, -h], [t, h], [-h, t], [h, t]]) g.add(rbox(0.07, 0.4, 0.07, 0.02, color, x, 0.2, z));
  }
  for (const [x, z, ry] of [[0, -h, 0], [0, h, 0], [-h, 0, Math.PI / 2], [h, 0, Math.PI / 2]]) {
    const rail = rbox(size, 0.06, 0.04, 0.02, color, x, 0.3, z);
    rail.rotation.y = ry;
    if (z === h) {
      // varco d'ingresso davanti
      rail.scale.x = 0.3;
      rail.position.x = -h + size * 0.15;
    }
    g.add(rail);
  }
  return g;
}
function sunflower(x: number, z: number) {
  const f = group(cyl(0.025, 0.03, 0.9, C.leafDark, 0, 0.45, 0, 6));
  const head = group(cyl(0.2, 0.2, 0.05, C.yellow, 0, 0, 0, 12), cyl(0.1, 0.1, 0.07, C.woodDark, 0, 0, 0.0, 10));
  head.rotation.x = Math.PI / 2 - 0.3;
  head.position.y = 0.95;
  f.add(head, sph(0.1, C.leaf, 0.08, 0.5, 0, 6));
  f.position.set(x, 0, z);
  return f;
}

function garden1() {
  const g = group(rbox(1.5, 0.16, 1.5, 0.06, C.soil, 0, 0.08, 0));
  for (const x of [-0.4, 0, 0.4]) for (const z of [-0.4, 0.4]) g.add(sprout(x, z));
  const can = group(cyl(0.12, 0.12, 0.2, C.blue, 0, 0.1, 0, 10), cyl(0.02, 0.03, 0.25, C.blue, 0.15, 0.18, 0, 6).rotateZ(-0.8));
  can.position.set(0.95, 0, 0.6);
  g.add(can);
  g.add(hitSphere(1.2, 0, 0.4, 0));
  return g;
}

function garden2() {
  const g = group(rbox(2.0, 0.16, 2.0, 0.06, C.soil, 0, 0.08, 0));
  const xs = [-0.55, 0, 0.55];
  xs.forEach((x, i) => xs.forEach((z) => g.add(i === 0 ? carrot(x, z) : i === 1 ? lettuce(x, z) : sprout(x, z))));
  g.add(fence(2.3, C.white));
  g.add(hitSphere(1.4, 0, 0.4, 0));
  return g;
}

function garden3() {
  const g = group(rbox(2.0, 0.16, 2.0, 0.06, C.soil, 0, 0.08, 0));
  const xs = [-0.55, 0, 0.55];
  xs.forEach((x, i) => xs.forEach((z) => g.add(i === 0 ? carrot(x, z) : i === 1 ? lettuce(x, z) : pumpkin(x, z))));
  g.add(fence(2.3, C.pink));
  // spaventapasseri
  const sc = group(
    cyl(0.04, 0.04, 1.2, C.woodDark, 0, 0.6, 0, 6),
    rbox(0.7, 0.06, 0.06, 0.02, C.woodDark, 0, 0.95, 0),
    rbox(0.32, 0.4, 0.18, 0.06, C.red, 0, 0.9, 0),
    sph(0.16, C.straw, 0, 1.25, 0, 10),
    cyl(0.22, 0.22, 0.03, C.woodLight, 0, 1.36, 0, 12),
    cyl(0.1, 0.12, 0.16, C.woodLight, 0, 1.44, 0, 10),
  );
  sc.position.set(-1.35, 0, -0.9);
  g.add(sc);
  g.add(sunflower(1.35, -0.9), sunflower(1.35, -0.4));
  g.add(hitSphere(1.5, 0, 0.5, 0));
  return g;
}

function stripedTower(h: number, r0: number, r1: number, bands: number) {
  const g = group();
  const bh = h / bands;
  for (let i = 0; i < bands; i++) {
    const ra = r0 + (r1 - r0) * (i / bands), rb = r0 + (r1 - r0) * ((i + 1) / bands);
    g.add(cyl(rb, ra, bh, i % 2 ? C.white : C.red, 0, bh * (i + 0.5), 0, 18));
  }
  return g;
}

function lighthouse(level: number) {
  const g = group();
  const h = [1.7, 2.6, 3.4][level - 1];
  const r0 = [0.55, 0.65, 0.75][level - 1];
  const r1 = r0 * 0.72;
  const base = ico(0.9, new THREE.MeshStandardMaterial({ color: C.rock, roughness: 0.8, flatShading: true }), 0, 0.05, 0);
  base.scale.set(1.2, 0.35, 1.2);
  g.add(base);
  const tower = stripedTower(h, r0, r1, level === 1 ? 4 : 6);
  tower.position.y = 0.2;
  g.add(tower);
  const top = 0.2 + h;
  g.add(cyl(r1 + 0.18, r1 + 0.12, 0.1, C.white, 0, top + 0.05, 0, 18));
  if (level >= 2) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.add(cyl(0.02, 0.02, 0.25, C.dark, Math.cos(a) * (r1 + 0.14), top + 0.22, Math.sin(a) * (r1 + 0.14), 4));
    }
    g.add(torus(r1 + 0.14, 0.02, C.dark, 0, top + 0.34, 0).rotateX(Math.PI / 2));
  }
  g.add(cyl(r1 * 0.75, r1 * 0.75, 0.42, glowMat, 0, top + 0.31, 0, 14));
  g.add(cone(r1 + 0.05, 0.45, C.red, 0, top + 0.75, 0, 14));
  g.add(sph(0.08, C.yellow, 0, top + 1.0, 0, 8));
  if (level >= 2) {
    const house = group(rbox(1.0, 0.65, 0.8, 0.08, C.white, 0, 0.33, 0), pyramidRoof(0.78, 0.5, C.blue, 0.65), door(0, 0.28, 0.41, 0.45));
    house.position.set(r0 + 0.45, 0.1, 0.25);
    g.add(house);
  }
  // fascio di luce rotante, visibile di notte
  const beamMat = new THREE.MeshBasicMaterial({ color: '#fff3b0', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const beamPivot = group();
  beamPivot.position.y = top + 0.31;
  for (const s of [1, -1]) {
    const b = new THREE.Mesh(new THREE.ConeGeometry(1.0 + level * 0.3, 6, 16, 1, true), beamMat);
    b.rotation.z = (s * Math.PI) / 2;
    b.position.x = -s * 3;
    beamPivot.add(b);
  }
  g.add(beamPivot);
  g.userData.beam = beamPivot;
  g.userData.beamMat = beamMat;
  g.add(hitSphere(1.3, 0, h * 0.5, 0), hitSphere(1.0, 0, h, 0));
  return g;
}

// ---------------------------------------------------------------- personaggi e mezzi

const SHIRTS = [C.red, C.blue, C.yellow, C.mint, C.purple, C.pink, C.orange];
const HAIR = ['#5a3a22', '#2f2238', '#e3a33b', '#a8552e', '#1f1b2b'];

function villager(seed: number) {
  const r = rng(seed);
  const g = group();
  const shirt = pick(r, SHIRTS);
  const pants = pick(r, ['#3b5bdb', '#4b3f72', '#2f9e74', '#6b4d36']);
  const leg = (x: number) => {
    const p = group(capsule(0.075, 0.14, pants, 0, -0.12, 0));
    p.position.set(x, 0.3, 0);
    return p;
  };
  const arm = (x: number) => {
    const p = group(capsule(0.06, 0.16, shirt, 0, -0.12, 0), sph(0.06, C.skin, 0, -0.25, 0, 8));
    p.position.set(x, 0.62, 0);
    return p;
  };
  const legL = leg(-0.09), legR = leg(0.09), armL = arm(-0.25), armR = arm(0.25);
  const body = group();
  const torso = capsule(0.2, 0.16, shirt, 0, 0.5, 0);
  torso.scale.z = 0.85;
  body.add(torso, armL, armR);
  const head = group(sph(0.25, C.skin, 0, 0, 0, 16));
  head.add(sph(0.035, C.dark, -0.08, 0.02, 0.22, 6), sph(0.035, C.dark, 0.08, 0.02, 0.22, 6));
  head.add(sph(0.045, '#ff9fb0', -0.15, -0.06, 0.18, 6), sph(0.045, '#ff9fb0', 0.15, -0.06, 0.18, 6));
  const style = Math.floor(r() * 3);
  const hairCol = pick(r, HAIR);
  if (style === 0) {
    // cappello di paglia
    head.add(cyl(0.38, 0.38, 0.04, C.straw, 0, 0.14, 0, 16), cyl(0.2, 0.23, 0.16, C.straw, 0, 0.22, 0, 14), cyl(0.235, 0.235, 0.05, C.red, 0, 0.17, 0, 14));
  } else if (style === 1) {
    const hair = dome(0.265, hairCol, 0, 0.0, -0.02);
    hair.rotation.x = -0.35;
    head.add(hair);
  } else {
    const hair = dome(0.265, hairCol, 0, 0.0, -0.02);
    hair.rotation.x = -0.35;
    head.add(hair, sph(0.12, hairCol, 0, 0.12, -0.24, 10));
  }
  head.position.y = 0.92;
  body.add(head);
  g.add(legL, legR, body);
  g.userData.rig = { legL, legR, armL, armR, body, head };
  g.add(hitSphere(0.6, 0, 0.6, 0));
  g.scale.setScalar(1.15);
  return g;
}

function boat(seed: number) {
  const r = rng(seed);
  const g = group();
  const stripe = pick(r, [C.red, C.blue, C.purple, C.mint]);
  g.add(rbox(2.0, 0.5, 0.85, 0.22, C.white, 0, 0.1, 0));
  g.add(rbox(2.02, 0.14, 0.87, 0.06, stripe, 0, -0.02, 0));
  g.add(rbox(1.7, 0.08, 0.7, 0.03, C.woodLight, 0, 0.36, 0));
  g.add(rbox(0.6, 0.4, 0.55, 0.08, C.white, -0.45, 0.58, 0), rbox(0.66, 0.08, 0.6, 0.04, stripe, -0.45, 0.8, 0));
  g.add(cyl(0.035, 0.035, 1.8, C.woodDark, 0.25, 1.25, 0, 6));
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0, 1.35);
  shape.lineTo(0.85, 0.05);
  shape.closePath();
  const sailMat = new THREE.MeshStandardMaterial({ color: pick(r, [C.white, C.yellow, C.pink, '#fff1d0']), side: THREE.DoubleSide, roughness: 0.7 });
  const sail = mesh(new THREE.ShapeGeometry(shape), sailMat, 0.3, 0.45, 0);
  g.add(sail);
  g.add(rbox(0.3, 0.16, 0.02, 0.02, stripe, 0.43, 2.1, 0));
  // turisti
  const n = 2 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const x = 0.55 - i * 0.32;
    g.add(sph(0.15, C.skin, x, 0.62, (i % 2 ? 0.15 : -0.15), 10));
    g.add(capsule(0.12, 0.08, pick(r, SHIRTS), x, 0.42, (i % 2 ? 0.15 : -0.15)));
    if (r() > 0.4) g.add(cyl(0.2, 0.2, 0.03, pick(r, [C.straw, C.pink, C.yellow]), x, 0.72, (i % 2 ? 0.15 : -0.15), 12));
  }
  g.add(hitSphere(1.6, 0, 0.6, 0));
  return g;
}

function cloudPuff(seed: number) {
  const r = rng(seed);
  const m = mat('#ffffff', { rough: 1, emissive: '#e8f2ff', ei: 0.35 });
  const g = group();
  const n = 4 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const s = sph(0.5 + r() * 0.5, m, (r() - 0.5) * 1.6, r() * 0.4, (r() - 0.5) * 1.2, 14);
    s.castShadow = false;
    g.add(s);
  }
  return g;
}

export const PROCEDURAL: Record<string, Factory> = {
  'nature.palm': palm,
  'nature.tree': tree,
  'nature.fishspot': fishSpot,
  'nature.shell': shell,
  'nature.rock': rock,
  'nature.bush': bush,
  'nature.flower': flower,
  'nature.mushroom': mushroom,
  'misc.campfire': campfire,
  'misc.plot': plot,
  'misc.cloud': cloudPuff,
  'building.hut.1': hut1,
  'building.hut.2': hut2,
  'building.hut.3': hut3,
  'building.dock.1': dock1,
  'building.dock.2': dock2,
  'building.dock.3': dock3,
  'building.garden.1': garden1,
  'building.garden.2': garden2,
  'building.garden.3': garden3,
  'building.lighthouse.1': () => lighthouse(1),
  'building.lighthouse.2': () => lighthouse(2),
  'building.lighthouse.3': () => lighthouse(3),
  'char.villager': villager,
  'vehicle.boat': boat,
};
