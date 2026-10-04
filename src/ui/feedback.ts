// Suoni sintetizzati (WebAudio, nessun file) e vibrazione leggera.
type Sfx = 'pop' | 'coin' | 'build' | 'error' | 'whoosh' | 'click' | 'quest' | 'splash';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
export const feedbackSettings = { sound: true, vibration: true };

function ensure(): AudioContext | null {
  if (!feedbackSettings.sound) return null;
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Da chiamare al primo tocco: i browser mobili sbloccano l'audio solo dopo un gesto. */
export function unlockAudio(): void {
  ensure();
}

function tone(freq: number, dur: number, type: OscillatorType, when = 0, slideTo?: number, vol = 0.5) {
  const c = ensure();
  if (!c || !master) return;
  const t = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, from: number, to: number, vol = 0.4) {
  const c = ensure();
  if (!c || !master) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(from, c.currentTime);
  f.frequency.exponentialRampToValueAtTime(to, c.currentTime + dur);
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start();
}

export function sfx(name: Sfx, pitch = 1): void {
  if (!feedbackSettings.sound) return;
  switch (name) {
    case 'pop': tone(420 * pitch, 0.12, 'sine', 0, 900 * pitch, 0.5); break;
    case 'click': tone(700, 0.06, 'triangle', 0, 500, 0.3); break;
    case 'coin': tone(988 * pitch, 0.08, 'square', 0, undefined, 0.12); tone(1319 * pitch, 0.18, 'square', 0.07, undefined, 0.12); break;
    case 'build': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', i * 0.08, undefined, 0.4)); noise(0.3, 400, 2000, 0.2); break;
    case 'quest': [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.22, 'sine', i * 0.07, undefined, 0.4)); break;
    case 'error': tone(220, 0.16, 'sawtooth', 0, 160, 0.15); break;
    case 'whoosh': noise(0.9, 300, 3000, 0.5); break;
    case 'splash': noise(0.35, 2500, 600, 0.35); tone(300, 0.1, 'sine', 0, 700, 0.3); break;
  }
}

export function vibrate(ms: number | number[] = 12): void {
  if (!feedbackSettings.vibration) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* non supportato (iOS) */
  }
}
