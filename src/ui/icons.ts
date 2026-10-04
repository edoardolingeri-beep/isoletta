// Icone SVG "cartoon" (niente emoji: aspetto uguale su tutti i telefoni).
import type { ResourceId } from '../config/resources';

const svg = (body: string, vb = '0 0 64 64') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
const OUT = 'stroke="#4a2c5e" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"';

export const ICONS = {
  wood: svg(`
    <g ${OUT}>
      <rect x="6" y="30" width="48" height="18" rx="9" fill="#d98a4a" transform="rotate(-14 30 39)"/>
      <rect x="10" y="16" width="48" height="18" rx="9" fill="#e9a463" transform="rotate(10 34 25)"/>
    </g>
    <ellipse cx="50" cy="28" rx="6" ry="8" fill="#ffd9a3" ${OUT} transform="rotate(10 50 28)"/>
    <ellipse cx="13" cy="44" rx="6" ry="8" fill="#ffd9a3" ${OUT} transform="rotate(-14 13 44)"/>`),
  fish: svg(`
    <path d="M8 32 Q 26 10 46 26 L 58 16 L 56 32 L 58 48 L 46 38 Q 26 54 8 32 Z" fill="#4aa8ff" ${OUT}/>
    <path d="M22 26 Q 28 32 22 38" fill="none" stroke="#2b7fd6" stroke-width="3" stroke-linecap="round"/>
    <circle cx="16" cy="29" r="3.2" fill="#2a1d3a"/>`),
  shell: svg(`
    <path d="M32 8 C 52 8 60 30 54 44 L 40 54 L 24 54 L 10 44 C 4 30 12 8 32 8 Z" fill="#ff86c0" ${OUT}/>
    <path d="M32 12 L 32 50 M 20 16 L 26 50 M 44 16 L 38 50 M 12 28 L 20 48 M 52 28 L 44 48" stroke="#e05a9c" stroke-width="3" stroke-linecap="round" fill="none"/>
    <rect x="24" y="50" width="16" height="8" rx="3" fill="#ffb0d6" ${OUT}/>`),
  coin: svg(`
    <circle cx="32" cy="34" r="24" fill="#f2a20f" ${OUT}/>
    <circle cx="32" cy="30" r="24" fill="#ffd23f" ${OUT}/>
    <circle cx="32" cy="30" r="15" fill="none" stroke="#f2a20f" stroke-width="4"/>
    <path d="M24 22 Q 30 16 38 20" stroke="#fff6c8" stroke-width="4" fill="none" stroke-linecap="round"/>`),
  star: svg(`<path d="M32 4 L 40 22 L 60 24 L 45 38 L 50 58 L 32 48 L 14 58 L 19 38 L 4 24 L 24 22 Z" fill="#ffd23f" ${OUT}/>
    <path d="M24 26 L 30 24" stroke="#fff6c8" stroke-width="4" stroke-linecap="round"/>`),
  people: svg(`
    <circle cx="22" cy="22" r="10" fill="#ffcfa0" ${OUT}/>
    <path d="M6 54 Q 6 34 22 34 Q 38 34 38 54 Z" fill="#ff4d6d" ${OUT}/>
    <circle cx="44" cy="24" r="9" fill="#ffcfa0" ${OUT}/>
    <path d="M30 54 Q 30 37 44 37 Q 58 37 58 54 Z" fill="#4aa8ff" ${OUT}/>`),
  gear: svg(`<path d="M32 6 l6 2 1 7 6 4 7-2 4 5-4 6 1 7 6 4-2 6-7 1-4 6 2 7-5 4-6-4-7 1-4 6-6-2-1-7-6-4-7 2-4-5 4-6-1-7-6-4 2-6 7-1 4-6-2-7 5-4 6 4 7-1z" fill="#b9b6cc" ${OUT}/><circle cx="32" cy="32" r="9" fill="#fff" ${OUT}/>`),
  up: svg(`<path d="M32 6 L 56 32 L 42 32 L 42 56 L 22 56 L 22 32 L 8 32 Z" fill="#7be36a" ${OUT}/>`),
  plus: svg(`<path d="M26 8 H38 V26 H56 V38 H38 V56 H26 V38 H8 V26 H26 Z" fill="#ffffff" ${OUT}/>`),
  lock: svg(`<rect x="12" y="28" width="40" height="30" rx="8" fill="#ffd23f" ${OUT}/><path d="M20 28 V20 a12 12 0 0 1 24 0 V28" fill="none" ${OUT}/><circle cx="32" cy="42" r="4" fill="#4a2c5e"/>`),
  sun: svg(`<circle cx="32" cy="32" r="13" fill="#ffd23f" ${OUT}/><g ${OUT}><path d="M32 4v8M32 52v8M4 32h8M52 32h8M12 12l6 6M46 46l6 6M12 52l6-6M46 18l6-6"/></g>`),
  moon: svg(`<path d="M40 6 A 26 26 0 1 0 58 42 A 20 20 0 1 1 40 6 Z" fill="#fff1a8" ${OUT}/>`),
  rain: svg(`<path d="M16 38 a12 12 0 0 1 4-23 a16 16 0 0 1 30 5 a10 10 0 0 1-2 18 Z" fill="#e6f0ff" ${OUT}/><g stroke="#4aa8ff" stroke-width="4" stroke-linecap="round"><path d="M20 46l-3 8M32 46l-3 8M44 46l-3 8"/></g>`),
  check: svg(`<path d="M10 34 L 26 50 L 54 16" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`),
  close: svg(`<path d="M16 16 L 48 48 M 48 16 L 16 48" stroke="#fff" stroke-width="9" stroke-linecap="round"/>`),
  heart: svg(`<path d="M32 56 C 8 40 4 26 12 16 C 20 8 30 12 32 20 C 34 12 44 8 52 16 C 60 26 56 40 32 56 Z" fill="#ff4d6d" ${OUT}/>`),
};

export const resIcon = (r: ResourceId) => ICONS[r];
