// HTML dei pannelli (edificio, zona, impostazioni, bentornato).
import { BUILDINGS, type BuildingId } from '../config/buildings';
import { RESOURCE_IDS, type Bundle, type ResourceId } from '../config/resources';
import type { ZoneDef } from '../config/zones';
import { canAfford, coinMultiplier, levelOf } from '../game/economy';
import type { GameState } from '../game/state';
import { chips, fmt, fmtTime } from './hud';
import { ICONS, resIcon } from './icons';

const stars = (lvl: number, max: number) =>
  `<div class="stars">${Array.from({ length: max }, (_, i) => `<span class="${i < lvl ? '' : 'off'}">${ICONS.star}</span>`).join('')}</div>`;

const head = (title: string, extra = '') =>
  `<div class="sheet-head"><h2 class="outline">${title}</h2>${extra}<div class="sheet-close tap" data-close>${ICONS.close}</div></div>`;

/** Produzione al minuto "effettiva" (con il bonus bellezza sulle monete). */
function effective(state: GameState, perMinute: Bundle): Bundle {
  const out: Bundle = {};
  for (const r of RESOURCE_IDS) {
    const v = perMinute[r];
    if (v) out[r] = Math.round(v * (r === 'coin' ? coinMultiplier(state) : 1));
  }
  return out;
}

function perMinChips(b: Bundle, cls = ''): string {
  const parts = RESOURCE_IDS.filter((r) => (b[r] ?? 0) > 0).map((r) => `<span class="chip ${cls}">${resIcon(r)}${fmt(b[r] ?? 0)}/min</span>`);
  return `<div class="chips">${parts.join('') || '<span class="chip plain">—</span>'}</div>`;
}

function extraChips(beauty: number, people: number): string {
  let s = '';
  if (beauty > 0) s += `<span class="chip good">${ICONS.star}+${beauty}</span>`;
  if (people > 0) s += `<span class="chip good">${ICONS.people}+${people}</span>`;
  return s ? `<div class="chips">${s}</div>` : '';
}

export function buildingSheet(state: GameState, id: BuildingId): { html: string; affordable: boolean; maxed: boolean } {
  const def = BUILDINGS[id];
  const lvl = levelOf(state, id);
  const max = def.levels.length;
  const maxed = lvl >= max;
  let rows = '';
  let affordable = false;
  let button = '';
  if (lvl > 0) rows += `<div class="sheet-row"><span class="lbl">Produce</span>${perMinChips(effective(state, def.levels[lvl - 1].perMinute))}</div>`;
  if (!maxed) {
    const next = def.levels[lvl];
    const prev = lvl > 0 ? def.levels[lvl - 1] : { beauty: 0, inhabitants: 0 };
    affordable = canAfford(state, next.cost);
    rows += `<div class="sheet-row"><span class="lbl">${lvl === 0 ? 'Produrrà' : `Livello ${lvl + 1}`}</span>${perMinChips(effective(state, next.perMinute), 'good')}${extraChips(next.beauty - prev.beauty, next.inhabitants - prev.inhabitants)}</div>`;
    rows += `<div class="sheet-row"><span class="lbl">Costo</span>${chips(next.cost, state.res)}</div>`;
    const label = lvl === 0 ? 'Costruisci' : 'Migliora';
    button = `<button class="big-btn tap outline ${affordable ? '' : 'disabled'}" data-action>${lvl === 0 ? ICONS.plus : ICONS.up}${label}</button>`;
  } else {
    button = `<div class="maxed">Livello massimo raggiunto!</div>`;
  }
  const html = `${head(def.name, stars(lvl, max))}
    <p class="sheet-desc">${def.description}</p>
    <div class="sheet-rows">${rows}</div>
    ${button}`;
  return { html, affordable, maxed };
}

export function zoneSheet(state: GameState, zone: ZoneDef): { html: string; affordable: boolean } {
  if (zone.comingSoon || !zone.cost) {
    return {
      affordable: false,
      html: `${head(zone.name)}<p class="sheet-desc">La nebbia è ancora troppo fitta… questa zona arriverà presto!</p>
      <button class="big-btn tap outline purple" data-close>Va bene</button>`,
    };
  }
  const affordable = canAfford(state, zone.cost);
  return {
    affordable,
    html: `${head(zone.name, `<span>${ICONS.lock}</span>`)}
      <p class="sheet-desc">${zone.description}</p>
      <div class="sheet-rows">
        <div class="sheet-row"><span class="lbl">Bellezza</span>${extraChips(zone.beauty, 0)}</div>
        <div class="sheet-row"><span class="lbl">Costo</span>${chips(zone.cost, state.res)}</div>
      </div>
      <button class="big-btn tap outline ${affordable ? 'blue' : 'disabled'}" data-action>Togli la nebbia</button>`,
  };
}

export function welcomeModal(seconds: number, gains: Record<ResourceId, number>): string {
  const items = RESOURCE_IDS.filter((r) => gains[r] > 0)
    .map((r, i) => `<span class="chip" style="animation-delay:${0.25 + i * 0.12}s">${resIcon(r)}+${fmt(gains[r])}</span>`)
    .join('');
  return `<div class="sheet-head"><h2 class="outline">Bentornato!</h2></div>
    <p class="sheet-desc">Sei stato via <b>${fmtTime(seconds)}</b>.<br/>Intanto gli isolani hanno lavorato sodo:</p>
    <div class="gains">${items}</div>
    <button class="big-btn tap outline" data-collect>Raccogli!</button>`;
}

export function settingsModal(state: GameState): string {
  const sw = (on: boolean, key: string) => `<div class="switch tap ${on ? 'on' : ''}" data-toggle="${key}"></div>`;
  return `${head('Impostazioni')}
    <div class="toggle-row"><span>Suoni</span>${sw(state.settings.sound, 'sound')}</div>
    <div class="toggle-row"><span>Vibrazione</span>${sw(state.settings.vibration, 'vibration')}</div>
    <div style="height:10px"></div>
    <button class="big-btn tap outline red" data-reset>Ricomincia da capo</button>
    <p class="hint">Trascina per ruotare l'isola &middot; pizzica con due dita per lo zoom &middot; due dita per spostarti</p>`;
}
