// Camera "diorama": un dito ruota, due dita zoomano (pinch) e spostano,
// rotellina del mouse zoomma, tasto destro sposta. Un tocco breve = tap.
import * as THREE from 'three';
import { animate, ease } from '../fx/tween';

interface Ptr { x: number; y: number; sx: number; sy: number; t: number }

export class CameraRig {
  readonly target = new THREE.Vector3(0, 0, -1.5);
  azimuth = 0.25;
  elevation = 0.95;
  distance = 33;
  minDist = 14;
  maxDist = 56;
  /** Limite per lo spostamento del centro inquadrato. */
  bounds = { cx: 0, cz: -3, r: 9 };
  onTap: (x: number, y: number) => void = () => {};
  /** true durante un trascinamento (per non aprire pannelli per sbaglio). */
  dragging = false;

  private ptrs = new Map<number, Ptr>();
  private velAz = 0;
  private velEl = 0;
  private pinchDist = 0;
  private pinchMid = new THREE.Vector2();
  private shakeAmt = 0;
  private panButton = false;

  constructor(private camera: THREE.PerspectiveCamera, private el: HTMLElement) {
    el.addEventListener('pointerdown', this.down);
    el.addEventListener('pointermove', this.move);
    el.addEventListener('pointerup', this.up);
    el.addEventListener('pointercancel', this.up);
    el.addEventListener('wheel', this.wheel, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private down = (e: PointerEvent) => {
    this.el.setPointerCapture(e.pointerId);
    this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() });
    this.panButton = e.button === 2 || e.shiftKey;
    this.velAz = this.velEl = 0;
    if (this.ptrs.size === 2) {
      const [a, b] = [...this.ptrs.values()];
      this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      this.pinchMid.set((a.x + b.x) / 2, (a.y + b.y) / 2);
      this.dragging = true;
    }
  };

  private move = (e: PointerEvent) => {
    const p = this.ptrs.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (this.ptrs.size === 1) {
      if (!this.dragging && Math.hypot(p.x - p.sx, p.y - p.sy) > 9) this.dragging = true;
      if (!this.dragging) return;
      if (this.panButton) {
        this.pan(dx, dy);
      } else {
        const k = 0.0065;
        this.azimuth -= dx * k;
        this.elevation = THREE.MathUtils.clamp(this.elevation + dy * 0.004, 0.55, 1.3);
        this.velAz = -dx * k * 0.6;
        this.velEl = 0;
      }
    } else if (this.ptrs.size === 2) {
      const [a, b] = [...this.ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.pinchDist > 0) this.distance = THREE.MathUtils.clamp(this.distance * (this.pinchDist / d), this.minDist, this.maxDist);
      this.pinchDist = d;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      this.pan(mx - this.pinchMid.x, my - this.pinchMid.y);
      this.pinchMid.set(mx, my);
    }
  };

  private up = (e: PointerEvent) => {
    const p = this.ptrs.get(e.pointerId);
    this.ptrs.delete(e.pointerId);
    if (!p) return;
    const quick = performance.now() - p.t < 450;
    if (!this.dragging && quick && this.ptrs.size === 0) this.onTap(e.clientX, e.clientY);
    if (this.ptrs.size === 0) setTimeout(() => (this.dragging = false), 0);
    if (this.ptrs.size === 1) {
      // da pinch a un dito: riparte senza saltare
      const rest = [...this.ptrs.values()][0];
      rest.sx = rest.x;
      rest.sy = rest.y;
    }
  };

  private wheel = (e: WheelEvent) => {
    e.preventDefault();
    this.distance = THREE.MathUtils.clamp(this.distance * (1 + e.deltaY * 0.0012), this.minDist, this.maxDist);
  };

  private pan(dx: number, dy: number) {
    const k = this.distance * 0.0016;
    const sin = Math.sin(this.azimuth), cos = Math.cos(this.azimuth);
    // destra della camera e "avanti" proiettato sul piano
    this.target.x -= (cos * dx + sin * dy) * k;
    this.target.z -= (-sin * dx + cos * dy) * k;
    this.clampTarget();
  }

  private clampTarget() {
    const { cx, cz, r } = this.bounds;
    const vx = this.target.x - cx, vz = this.target.z - cz;
    const len = Math.hypot(vx, vz);
    if (len > r) {
      this.target.x = cx + (vx / len) * r;
      this.target.z = cz + (vz / len) * r;
    }
  }

  /** Sposta dolcemente la camera su un punto. */
  focus(point: THREE.Vector3, distance?: number, dur = 0.8): void {
    const from = this.target.clone();
    const to = point.clone().setY(0);
    const d0 = this.distance;
    const d1 = distance ?? this.distance;
    animate(
      dur,
      (k) => {
        this.target.lerpVectors(from, to, k);
        this.distance = d0 + (d1 - d0) * k;
      },
      { ease: ease.inOutSine, owner: this },
    );
  }

  shake(amount = 0.3): void {
    this.shakeAmt = Math.max(this.shakeAmt, amount);
  }

  update(dt: number): void {
    if (!this.dragging) {
      this.azimuth += this.velAz;
      this.elevation = THREE.MathUtils.clamp(this.elevation + this.velEl, 0.55, 1.3);
      const damp = Math.pow(0.0006, dt);
      this.velAz *= damp;
      this.velEl *= damp;
    }
    const c = this.camera;
    const horiz = Math.cos(this.elevation) * this.distance;
    c.position.set(
      this.target.x + Math.sin(this.azimuth) * horiz,
      this.target.y + Math.sin(this.elevation) * this.distance,
      this.target.z + Math.cos(this.azimuth) * horiz,
    );
    if (this.shakeAmt > 0.001) {
      c.position.x += (Math.random() - 0.5) * this.shakeAmt;
      c.position.y += (Math.random() - 0.5) * this.shakeAmt;
      this.shakeAmt *= Math.pow(0.002, dt);
    }
    c.lookAt(this.target.x, this.target.y + 0.5, this.target.z);
  }
}
