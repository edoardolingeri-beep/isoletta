// Interfaccia DOM sopra il canvas: risorse, obiettivo, pannelli, popup, marker.
import * as THREE from 'three';
import { RESOURCE_IDS, type Bundle, type ResourceId } from '../config/resources';
import { ICONS, resIcon } from './icons';

export function fmt(n: number): string {
  n = Math.floor(n);
  if (n < 10000) return String(n);
  if (n < 1e6) return (n / 1000).toFixed(n < 1e5 ? 1 : 0).replace('.0', '') + 'K';
  return (n / 1e6).toFixed(1).replace('.0', '') + 'M';
}

export function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m} min`;
  return `${Math.floor(sec)} s`;
}

/** Chip con icona e quantità. Se `have` è passato, evidenzia ciò che manca. */
export function chips(b: Bundle, have?: Record<ResourceId, number>, cls = ''): string {
  return `<div class="chips">${RESOURCE_IDS.filter((r) => (b[r] ?? 0) > 0)
    .map((r) => {
      const lack = have && Math.floor(have[r]) < (b[r] ?? 0);
      return `<span class="chip ${cls} ${lack ? 'lack' : ''}">${resIcon(r)}${fmt(b[r] ?? 0)}</span>`;
    })
    .join('')}</div>`;
}

const h = (html: string): HTMLElement => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
};

interface Anchor { el: HTMLElement; pos: () => THREE.Vector3 | null; lift: number; edge: boolean }
interface Floater { el: HTMLElement; pos: THREE.Vector3; t: number }

export class Hud {
  readonly root: HTMLElement;
  private resEls = {} as Record<ResourceId, { box: HTMLElement; num: HTMLElement; rate: HTMLElement }>;
  private shown = {} as Record<ResourceId, number>;
  private markers: HTMLElement;
  private floatLayer: HTMLElement;
  private anchors = new Set<Anchor>();
  private floaters: Floater[] = [];
  private toasts: HTMLElement;
  private sheet: HTMLElement;
  private modal: HTMLElement;
  private questEl: HTMLElement;
  private beautyEl: HTMLElement;
  private peopleEl: HTMLElement;
  private skyEl: HTMLElement;
  private tmp = new THREE.Vector3();
  onQuestTap: () => void = () => {};
  onSettings: () => void = () => {};
  onMissions: () => void = () => {};
  private missionsDot!: HTMLElement;
  onSheetClose: () => void = () => {};

  constructor(root: HTMLElement) {
    this.root = root;
    this.markers = root.appendChild(h(`<div class="markers"></div>`));
    this.floatLayer = root.appendChild(h(`<div class="floaters"></div>`));

    const top = root.appendChild(
      h(`<div class="top">
        <div class="top-row">
          <div class="badge-star">${ICONS.star}<b class="outline-sm">0</b></div>
          <div class="island-info">
            <div class="island-name outline-sm">ISOLETTA</div>
            <div class="island-sub"><span class="mini-pill" data-people>${ICONS.people}<span>1</span></span></div>
          </div>
          <div class="spacer"></div>
          <div class="sky-icon">${ICONS.sun}</div>
          <div class="round-btn tap" data-missions aria-label="Missioni">${ICONS.scroll}<div class="dot" hidden>!</div></div>
          <div class="round-btn tap" data-settings aria-label="Impostazioni">${ICONS.gear}</div>
        </div>
        <div class="res-row"></div>
        <div class="quest tap"></div>
      </div>`),
    );
    this.beautyEl = top.querySelector('.badge-star b')!;
    this.peopleEl = top.querySelector('[data-people] span')!;
    this.skyEl = top.querySelector('.sky-icon')!;
    top.querySelector('[data-settings]')!.addEventListener('click', () => this.onSettings());
    top.querySelector('[data-missions]')!.addEventListener('click', () => this.onMissions());
    this.missionsDot = top.querySelector('[data-missions] .dot')!;
    const row = top.querySelector('.res-row')!;
    for (const r of RESOURCE_IDS) {
      const box = row.appendChild(h(`<div class="res"><div class="ico">${resIcon(r)}</div><span class="outline-sm">0</span><div class="rate"></div></div>`));
      this.resEls[r] = { box, num: box.querySelector('span')!, rate: box.querySelector('.rate')! };
      this.shown[r] = 0;
    }
    this.questEl = top.querySelector('.quest')!;
    this.questEl.addEventListener('click', () => this.onQuestTap());

    this.toasts = root.appendChild(h(`<div class="toasts"></div>`));
    this.sheet = root.appendChild(h(`<div class="sheet"><div class="sheet-card"></div></div>`));
    this.modal = root.appendChild(h(`<div class="modal"></div>`));
  }

  // ------------------------------------------------------------ risorse

  /** Imposta subito i valori mostrati (senza animazione). */
  snapResources(res: Record<ResourceId, number>): void {
    for (const r of RESOURCE_IDS) {
      this.shown[r] = res[r];
      this.resEls[r].num.textContent = fmt(res[r]);
    }
  }

  /** Avvicina i numeri mostrati a quelli reali (effetto "conta"). */
  updateResources(res: Record<ResourceId, number>, dt: number): void {
    for (const r of RESOURCE_IDS) {
      const target = Math.floor(res[r]);
      let s = this.shown[r];
      if (s === target) continue;
      const diff = target - s;
      s += diff * Math.min(1, dt * 10);
      if (Math.abs(target - s) < 0.5) s = target;
      this.shown[r] = s;
      this.resEls[r].num.textContent = fmt(Math.round(s));
    }
  }

  setRates(perSec: Record<ResourceId, number>): void {
    for (const r of RESOURCE_IDS) {
      const perMin = perSec[r] * 60;
      const el = this.resEls[r].rate;
      el.textContent = perMin > 0 ? `+${fmt(perMin)}/min` : '';
      el.classList.toggle('on', perMin > 0);
    }
  }

  bump(r: ResourceId): void {
    const b = this.resEls[r].box;
    b.classList.remove('bump');
    void b.offsetWidth;
    b.classList.add('bump');
  }

  pillCenter(r: ResourceId): { x: number; y: number } {
    const rect = this.resEls[r].box.querySelector('.ico')!.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  setIslandStats(beauty: number, people: number): void {
    if (this.beautyEl.textContent !== String(beauty)) {
      this.beautyEl.textContent = String(beauty);
      this.pop(this.beautyEl.parentElement!);
    }
    if (this.peopleEl.textContent !== String(people)) {
      this.peopleEl.textContent = String(people);
      this.pop(this.peopleEl.parentElement!);
    }
  }

  setSky(kind: 'sun' | 'moon' | 'rain'): void {
    if (this.skyEl.dataset.kind === kind) return;
    this.skyEl.dataset.kind = kind;
    this.skyEl.innerHTML = ICONS[kind];
    this.pop(this.skyEl);
  }

  private pop(el: HTMLElement) {
    el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(.9)' }, { transform: 'scale(1)' }], { duration: 450, easing: 'ease-out' });
  }

  // ------------------------------------------------------------ obiettivo

  /** Pillola compatta con la missione corrente (il dettaglio è nel menu missioni). */
  setQuest(q: { text: string; current: number; target: number; done: boolean } | null, isNew = false): void {
    const el = this.questEl;
    this.missionsDot.hidden = !q?.done;
    if (!q) {
      el.className = 'quest tap';
      el.dataset.key = '';
      el.innerHTML = `<div class="q-ico">${ICONS.heart}</div><div class="q-text">Missioni finite, per ora!</div>`;
      return;
    }
    const key = `${q.text}|${q.done}`;
    if (el.dataset.key !== key) {
      el.dataset.key = key;
      el.innerHTML = `
        <div class="q-ico">${q.done ? ICONS.star : ICONS.scroll}</div>
        <div class="q-text">${q.text}</div>
        <div class="q-count"><i></i><span></span></div>
        <div class="q-claim outline-sm">Riscuoti</div>
        <div class="dot">!</div>`;
    }
    el.classList.toggle('done', q.done);
    (el.querySelector('.q-count i') as HTMLElement).style.width = `${Math.round((q.current / q.target) * 100)}%`;
    (el.querySelector('.q-count span') as HTMLElement).textContent = `${Math.floor(q.current)}/${q.target}`;
    if (isNew) {
      el.classList.remove('new');
      void el.offsetWidth;
      el.classList.add('new');
    }
  }

  questRect(): DOMRect {
    return this.questEl.getBoundingClientRect();
  }

  // ------------------------------------------------------------ marker ancorati al mondo

  /**
   * Elemento DOM che segue un punto 3D. Con `edge` resta incollato al bordo dello
   * schermo (con una freccia) quando il punto è fuori vista.
   */
  addAnchor(html: string, pos: () => THREE.Vector3 | null, onTap?: () => void, lift = 0, edge = false): HTMLElement {
    const el = this.markers.appendChild(h(`<div class="marker"><div class="marker-inner">${html}</div></div>`));
    if (onTap) {
      // l'area toccabile è il contenuto visibile, non il box (vuoto) del marker
      const inner = el.firstElementChild as HTMLElement;
      inner.classList.add('tap');
      inner.addEventListener('click', (e) => {
        e.stopPropagation();
        onTap();
      });
    }
    if (edge) el.firstElementChild!.insertAdjacentHTML('beforeend', '<div class="edge-arrow"></div>');
    this.anchors.add({ el, pos, lift, edge });
    return el;
  }

  removeAnchor(el: HTMLElement): void {
    for (const a of this.anchors) if (a.el === el) this.anchors.delete(a);
    el.remove();
  }

  // ------------------------------------------------------------ numeri che salgono

  floatText(pos: THREE.Vector3, html: string, color = '#fff'): void {
    const el = this.floatLayer.appendChild(h(`<div class="floater"><div class="floater-inner outline" style="color:${color}">${html}</div></div>`));
    this.floaters.push({ el, pos: pos.clone(), t: 0 });
  }

  floatGain(pos: THREE.Vector3, r: ResourceId, n: number): void {
    this.floatText(pos, `+${fmt(n)}${resIcon(r)}`);
  }

  /** Icone che volano da un punto dello schermo al contatore della risorsa. */
  fly(r: ResourceId, from: { x: number; y: number }, count: number, onEach?: () => void): void {
    const to = this.pillCenter(r);
    const n = Math.min(count, 6);
    for (let i = 0; i < n; i++) {
      const el = document.body.appendChild(h(`<div class="fly">${resIcon(r)}</div>`));
      const sx = from.x + (Math.random() - 0.5) * 50, sy = from.y + (Math.random() - 0.5) * 30;
      const mx = (sx + to.x) / 2 + (Math.random() - 0.5) * 140, my = Math.min(sy, to.y) - 30 - Math.random() * 60;
      const anim = el.animate(
        [
          { transform: `translate(${sx - 17}px, ${sy - 17}px) scale(0.2)` },
          { transform: `translate(${sx - 17}px, ${sy - 40}px) scale(1.2)`, offset: 0.2 },
          { transform: `translate(${mx - 17}px, ${my - 17}px) scale(1)`, offset: 0.55 },
          { transform: `translate(${to.x - 17}px, ${to.y - 17}px) scale(.7)` },
        ],
        { duration: 700 + i * 70, easing: 'cubic-bezier(.5,0,.6,1)', delay: i * 40 },
      );
      anim.onfinish = () => {
        el.remove();
        this.bump(r);
        onEach?.();
      };
    }
  }

  worldToScreen(p: THREE.Vector3, camera: THREE.Camera): { x: number; y: number; visible: boolean } {
    this.tmp.copy(p).project(camera);
    return { x: (this.tmp.x * 0.5 + 0.5) * innerWidth, y: (-this.tmp.y * 0.5 + 0.5) * innerHeight, visible: this.tmp.z < 1 };
  }

  /** true se il marker è attualmente incollato al bordo (oggetto fuori schermo). */
  isOnEdge(el: HTMLElement): boolean {
    return el.classList.contains('edge');
  }

  private placeOnEdge(a: Anchor, s: { x: number; y: number; visible: boolean }): void {
    let { x, y } = s;
    const w = innerWidth, hgt = innerHeight;
    if (!s.visible) {
      // dietro la camera la proiezione è capovolta
      x = w - x;
      y = hgt - y;
    }
    const top = (this.questEl.getBoundingClientRect().bottom || 120) + 34;
    const m = 30;
    const inside = s.visible && x > m && x < w - m && y - a.lift > top && y < hgt - m;
    a.el.style.display = '';
    a.el.classList.toggle('edge', !inside);
    if (inside) {
      a.el.style.transform = `translate3d(${x.toFixed(1)}px, ${(y - a.lift).toFixed(1)}px, 0)`;
      return;
    }
    // punto sul bordo lungo la direzione dal centro dello schermo
    const cx = w / 2, cy = (top + hgt) / 2;
    const dx = x - cx, dy = y - cy;
    const kx = dx !== 0 ? (w / 2 - m) / Math.abs(dx) : Infinity;
    const ky = dy !== 0 ? ((dy < 0 ? cy - top : hgt - m - cy)) / Math.abs(dy) : Infinity;
    const k = Math.min(kx, ky);
    const ex = cx + dx * k, ey = cy + dy * k;
    a.el.style.transform = `translate3d(${ex.toFixed(1)}px, ${ey.toFixed(1)}px, 0)`;
    const arrow = a.el.querySelector('.edge-arrow') as HTMLElement | null;
    if (arrow) arrow.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  }

  /** Riposiziona marker e numeri volanti; da chiamare a ogni frame. */
  updateWorldUI(camera: THREE.Camera, dt: number): void {
    for (const a of this.anchors) {
      const p = a.pos();
      if (!p) {
        a.el.style.display = 'none';
        continue;
      }
      const s = this.worldToScreen(p, camera);
      if (a.edge) {
        this.placeOnEdge(a, s);
        continue;
      }
      a.el.style.display = s.visible ? '' : 'none';
      a.el.style.transform = `translate3d(${s.x.toFixed(1)}px, ${(s.y - a.lift).toFixed(1)}px, 0)`;
    }
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.t += dt;
      if (f.t > 1.15) {
        f.el.remove();
        this.floaters.splice(i, 1);
        continue;
      }
      const s = this.worldToScreen(f.pos, camera);
      f.el.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0)`;
    }
  }

  // ------------------------------------------------------------ toast, pannello, modale

  toast(text: string, icon?: string): void {
    const el = this.toasts.appendChild(h(`<div class="toast">${icon ?? ''}<span>${text}</span></div>`));
    while (this.toasts.children.length > 3) this.toasts.firstElementChild!.remove();
    setTimeout(() => el.remove(), 2300);
  }

  get sheetOpen(): boolean {
    return this.sheet.classList.contains('open');
  }

  openSheet(html: string, bind?: (card: HTMLElement) => void): void {
    const card = this.sheet.querySelector('.sheet-card') as HTMLElement;
    if (this.sheetOpen && card.dataset.html === html) return;
    card.dataset.html = html;
    card.innerHTML = html;
    card.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => this.closeSheet()));
    bind?.(card);
    this.sheet.classList.add('open');
  }

  closeSheet(): void {
    if (!this.sheetOpen) return;
    this.sheet.classList.remove('open');
    this.onSheetClose();
  }

  openModal(html: string, bind?: (card: HTMLElement) => void): void {
    this.modal.innerHTML = `<div class="sheet-card">${html}</div>`;
    this.modal.classList.add('open');
    const card = this.modal.firstElementChild as HTMLElement;
    card.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => this.closeModal()));
    bind?.(card);
  }

  closeModal(): void {
    this.modal.classList.remove('open');
    setTimeout(() => {
      if (!this.modal.classList.contains('open')) this.modal.innerHTML = '';
    }, 300);
  }
}
