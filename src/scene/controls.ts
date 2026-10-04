// Camera "diorama":
// - un dito sposta la vista; vicino al centro ci si muove liberi, più ci si
//   allontana più "tira", e lasciando il dito lontano una molla riporta l'isola al centro
// - due dita: pizzico per lo zoom, rotazione delle dita per girare l'isola
// - mouse: tasto sinistro sposta, tasto destro (o Shift) ruota, rotellina zoomma
// Un tocco breve = tap.
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
  /**
   * Centro "di casa" della vista. Entro `free` ci si muove senza resistenza;
   * oltre, il trascinamento si fa più duro fino a `max`, e al rilascio la molla
   * riporta la vista al centro.
   */
  home = { x: 0, z: -2, free: 3.5, max: 9 };
  onTap: (x: number, y: number) => void = () => {};
  /** true durante un trascinamento (per non aprire pannelli per sbaglio). */
  dragging = false;

  private ptrs = new Map<number, Ptr>();
  private velAz = 0;
  private panVel = new THREE.Vector2();
  private springing = false;
  private pinchDist = 0;
  private pinchAngle = 0;
  private pinchMid = new THREE.Vector2();
  private shakeAmt = 0;
  private rotateButton = false;
  private lastMove = 0;

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
    this.rotateButton = e.button === 2 || e.shiftKey;
    this.velAz = 0;
    this.panVel.set(0, 0);
    this.springing = false;
    if (this.ptrs.size === 2) this.startPinch();
  };

  private startPinch() {
    const [a, b] = [...this.ptrs.values()];
    this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    this.pinchAngle = Math.atan2(b.y - a.y, b.x - a.x);
    this.pinchMid.set((a.x + b.x) / 2, (a.y + b.y) / 2);
    this.dragging = true;
  }

  private move = (e: PointerEvent) => {
    const p = this.ptrs.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (this.ptrs.size === 1) {
      if (!this.dragging && Math.hypot(p.x - p.sx, p.y - p.sy) > 9) this.dragging = true;
      if (!this.dragging) return;
      if (this.rotateButton) {
        const k = 0.0065;
        this.azimuth -= dx * k;
        this.elevation = THREE.MathUtils.clamp(this.elevation + dy * 0.004, 0.55, 1.3);
        this.velAz = -dx * k * 0.6;
      } else {
        const now = performance.now();
        const step = this.pan(dx, dy);
        // velocità per il "lancio" al rilascio (unità al secondo)
        const ms = Math.max(8, now - this.lastMove);
        this.panVel.lerp(new THREE.Vector2(step.x, step.z).multiplyScalar(1000 / ms), 0.5);
        this.lastMove = now;
      }
    } else if (this.ptrs.size === 2) {
      const [a, b] = [...this.ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.pinchDist > 0) this.distance = THREE.MathUtils.clamp(this.distance * (this.pinchDist / d), this.minDist, this.maxDist);
      this.pinchDist = d;
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      let da = ang - this.pinchAngle;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      this.azimuth += da;
      this.pinchAngle = ang;
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
    if (this.ptrs.size === 0) {
      setTimeout(() => (this.dragging = false), 0);
      // dito fermo prima di alzarlo: niente lancio
      if (performance.now() - this.lastMove > 80) this.panVel.set(0, 0);
      if (this.distFromHome() > this.home.free) this.springing = true;
    }
    if (this.ptrs.size === 1) {
      // da due dita a uno: riparte senza saltare
      const rest = [...this.ptrs.values()][0];
      rest.sx = rest.x;
      rest.sy = rest.y;
      this.panVel.set(0, 0);
    }
  };

  private wheel = (e: WheelEvent) => {
    e.preventDefault();
    this.distance = THREE.MathUtils.clamp(this.distance * (1 + e.deltaY * 0.0012), this.minDist, this.maxDist);
  };

  private distFromHome(): number {
    return Math.hypot(this.target.x - this.home.x, this.target.z - this.home.z);
  }

  /** Sposta la vista seguendo il dito, con resistenza fuori dalla zona libera. Restituisce lo spostamento. */
  private pan(dx: number, dy: number): { x: number; z: number } {
    const k = this.distance * 0.0016;
    const sin = Math.sin(this.azimuth), cos = Math.cos(this.azimuth);
    // destra della camera e "avanti" proiettato sul piano
    let mx = -(cos * dx + sin * dy) * k;
    let mz = -(-sin * dx + cos * dy) * k;
    const { x: hx, z: hz, free, max } = this.home;
    const nx = this.target.x + mx - hx, nz = this.target.z + mz - hz;
    const nd = Math.hypot(nx, nz);
    if (nd > free && nd > this.distFromHome()) {
      // ci si sta allontanando oltre la zona libera: effetto elastico
      const f = Math.max(0.08, 1 - (nd - free) / (max - free));
      mx *= f;
      mz *= f;
    }
    this.target.x += mx;
    this.target.z += mz;
    return { x: mx, z: mz };
  }

  /** Sposta dolcemente la camera su un punto. */
  focus(point: THREE.Vector3, distance?: number, dur = 0.8): void {
    this.springing = false;
    this.panVel.set(0, 0);
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
      this.velAz *= Math.pow(0.0006, dt);
      // inerzia dello spostamento
      if (this.panVel.lengthSq() > 1e-4) {
        this.target.x += this.panVel.x * dt;
        this.target.z += this.panVel.y * dt;
        this.panVel.multiplyScalar(Math.pow(0.004, dt));
        if (this.distFromHome() > this.home.free) {
          this.springing = true;
          this.panVel.multiplyScalar(Math.pow(0.0001, dt));
        }
      }
      // molla: riporta la vista al centro
      if (this.springing) {
        const k = 1 - Math.exp(-dt * 4.5);
        this.target.x += (this.home.x - this.target.x) * k;
        this.target.z += (this.home.z - this.target.z) * k;
        if (this.distFromHome() < 0.05) this.springing = false;
      }
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
