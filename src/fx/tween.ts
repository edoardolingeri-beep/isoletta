// Mini sistema di animazioni (tween) aggiornato dal game loop.
import type { Object3D } from 'three';

export type Ease = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inQuad: (t: number) => t * t,
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  outBack: (t: number) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  outElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
};

interface Tween {
  t: number;
  dur: number;
  delay: number;
  ease: Ease;
  update: (k: number) => void;
  done?: () => void;
  owner?: object;
}

const tweens: Tween[] = [];

/** Anima un valore 0→1 per `dur` secondi chiamando `update(k)` già "easato". */
export function animate(
  dur: number,
  update: (k: number) => void,
  opts: { ease?: Ease; delay?: number; done?: () => void; owner?: object } = {},
): void {
  if (opts.owner) cancel(opts.owner);
  tweens.push({ t: 0, dur, delay: opts.delay ?? 0, ease: opts.ease ?? ease.outQuad, update, done: opts.done, owner: opts.owner });
}

export function cancel(owner: object): void {
  for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].owner === owner) tweens.splice(i, 1);
}

export function updateTweens(dt: number): void {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    if (tw.delay > 0) {
      tw.delay -= dt;
      continue;
    }
    tw.t += dt;
    const k = Math.min(1, tw.t / tw.dur);
    tw.update(tw.ease(k));
    if (k >= 1) {
      tweens.splice(i, 1);
      tw.done?.();
    }
  }
}

/** Rimbalzo "gommoso": schiaccia e allunga l'oggetto attorno alla sua scala base. */
export function squash(obj: Object3D, amount = 0.25, dur = 0.55): void {
  const base = (obj.userData.baseScale as number | undefined) ?? (obj.userData.baseScale = obj.scale.x);
  animate(
    dur,
    (k) => {
      const w = Math.sin(k * Math.PI * 3) * (1 - k) * amount;
      obj.scale.set(base * (1 - w * 0.6), base * (1 + w), base * (1 - w * 0.6));
    },
    { ease: ease.linear, owner: obj.scale, done: () => obj.scale.setScalar(base) },
  );
}

/** Comparsa con "pop": da 0 a scala base con overshoot. */
export function popIn(obj: Object3D, dur = 0.6, delay = 0): void {
  const base = (obj.userData.baseScale as number | undefined) ?? (obj.userData.baseScale = obj.scale.x);
  obj.scale.setScalar(0.0001);
  animate(dur, (k) => obj.scale.setScalar(Math.max(0.0001, base * k)), { ease: ease.outBack, delay, owner: obj.scale });
}

export function popOut(obj: Object3D, dur = 0.25, done?: () => void): void {
  const base = obj.scale.x;
  animate(dur, (k) => obj.scale.setScalar(Math.max(0.0001, base * (1 - k))), { ease: ease.inQuad, owner: obj.scale, done });
}

/** Scuotimento laterale (es. palma colpita). */
export function wobble(obj: Object3D, amount = 0.18, dur = 0.6): void {
  const rz = obj.rotation.z, rx = obj.rotation.x;
  const dir = Math.random() * Math.PI * 2;
  animate(
    dur,
    (k) => {
      const w = Math.sin(k * Math.PI * 5) * (1 - k) * amount;
      obj.rotation.z = rz + Math.cos(dir) * w;
      obj.rotation.x = rx + Math.sin(dir) * w;
    },
    { ease: ease.linear, owner: obj.rotation, done: () => { obj.rotation.z = rz; obj.rotation.x = rx; } },
  );
}
