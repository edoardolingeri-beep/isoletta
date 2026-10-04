// Atmosfera: lucciole di notte e pioggia.
import * as THREE from 'three';

function dotTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.3, 'rgba(255,255,200,.8)');
  grd.addColorStop(1, 'rgba(255,255,200,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export class Fireflies {
  readonly points: THREE.Points;
  private base: Float32Array;
  private mat: THREE.PointsMaterial;

  constructor(scene: THREE.Scene, count = 60) {
    const pos = new Float32Array(count * 3);
    this.base = new Float32Array(count * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.mat = new THREE.PointsMaterial({ color: '#d9ff7a', size: 0.45, map: dotTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  /** Distribuisce le lucciole sopra le zone d'erba. */
  place(spots: { x: number; z: number; r: number }[]): void {
    const n = this.base.length / 3;
    for (let i = 0; i < n; i++) {
      const s = spots[i % spots.length];
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * s.r;
      this.base[i * 3] = s.x + Math.cos(a) * r;
      this.base[i * 3 + 1] = 0.9 + Math.random() * 1.6;
      this.base[i * 3 + 2] = s.z + Math.sin(a) * r;
    }
  }

  update(time: number, night: number): void {
    this.mat.opacity = THREE.MathUtils.smoothstep(night, 0.4, 0.9);
    this.points.visible = this.mat.opacity > 0.01;
    if (!this.points.visible) return;
    const attr = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      const ph = i * 0.37;
      arr[i] = this.base[i] + Math.sin(time * 0.7 + ph) * 0.5;
      arr[i + 1] = this.base[i + 1] + Math.sin(time * 1.3 + ph * 2) * 0.3;
      arr[i + 2] = this.base[i + 2] + Math.cos(time * 0.6 + ph) * 0.5;
    }
    attr.needsUpdate = true;
    this.mat.size = 0.35 + Math.sin(time * 6) * 0.08;
  }
}

export class Rain {
  readonly lines: THREE.LineSegments;
  private mat: THREE.LineBasicMaterial;
  private speeds: Float32Array;
  intensity = 0;
  private readonly box = 22;
  private readonly height = 14;

  constructor(scene: THREE.Scene, count = 700) {
    const pos = new Float32Array(count * 6);
    this.speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * this.box, y = Math.random() * this.height, z = (Math.random() - 0.5) * this.box;
      pos.set([x, y, z, x + 0.05, y + 0.5, z], i * 6);
      this.speeds[i] = 14 + Math.random() * 6;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.mat = new THREE.LineBasicMaterial({ color: '#dff4ff', transparent: true, opacity: 0, depthWrite: false });
    this.lines = new THREE.LineSegments(geo, this.mat);
    this.lines.frustumCulled = false;
    scene.add(this.lines);
  }

  update(dt: number, center: THREE.Vector3): void {
    this.mat.opacity = this.intensity * 0.55;
    this.lines.visible = this.intensity > 0.01;
    if (!this.lines.visible) return;
    this.lines.position.set(center.x, 0, center.z);
    const attr = this.lines.geometry.getAttribute('position') as THREE.BufferAttribute;
    const a = attr.array as Float32Array;
    for (let i = 0; i < this.speeds.length; i++) {
      const o = i * 6;
      const dy = this.speeds[i] * dt;
      a[o + 1] -= dy;
      a[o + 4] -= dy;
      if (a[o + 1] < 0) {
        const x = (Math.random() - 0.5) * this.box, z = (Math.random() - 0.5) * this.box;
        a[o] = x; a[o + 1] = this.height; a[o + 2] = z;
        a[o + 3] = x + 0.05; a[o + 4] = this.height + 0.5; a[o + 5] = z;
      }
    }
    attr.needsUpdate = true;
  }
}
