import { BALANCE } from '../config/balance';
import { BUILDINGS, BUILDING_IDS, type BuildingId } from '../config/buildings';
import { RESOURCE_IDS, type Bundle, type ResourceId } from '../config/resources';
import { ZONE_BY_ID } from '../config/zones';
import type { GameState } from './state';

export function canAfford(state: GameState, cost: Bundle): boolean {
  return RESOURCE_IDS.every((r) => (cost[r] ?? 0) <= Math.floor(state.res[r]));
}

export function pay(state: GameState, cost: Bundle): boolean {
  if (!canAfford(state, cost)) return false;
  for (const r of RESOURCE_IDS) state.res[r] -= cost[r] ?? 0;
  return true;
}

export function give(state: GameState, b: Bundle): void {
  for (const r of RESOURCE_IDS) state.res[r] += b[r] ?? 0;
}

export function levelOf(state: GameState, id: BuildingId): number {
  return state.buildings[id] ?? 0;
}

export function beauty(state: GameState): number {
  let total = 0;
  for (const id of BUILDING_IDS) {
    const lvl = levelOf(state, id);
    if (lvl > 0) total += BUILDINGS[id].levels[lvl - 1].beauty;
  }
  for (const z of state.zones) total += ZONE_BY_ID[z].beauty;
  return total;
}

/** Il naufrago iniziale + gli abitanti degli edifici. */
export function inhabitants(state: GameState): number {
  let total = 1;
  for (const id of BUILDING_IDS) {
    const lvl = levelOf(state, id);
    if (lvl > 0) total += BUILDINGS[id].levels[lvl - 1].inhabitants;
  }
  return total;
}

export function coinMultiplier(state: GameState): number {
  return 1 + beauty(state) * BALANCE.beautyCoinBonus;
}

/** Produzione al secondo di un singolo edificio, con tutti i bonus. */
export function buildingRate(state: GameState, id: BuildingId, raining = false): Bundle {
  const lvl = levelOf(state, id);
  if (lvl <= 0) return {};
  const def = BUILDINGS[id];
  const out: Bundle = {};
  const rain = raining && def.rainBonus ? 1 + def.rainBonus : 1;
  for (const [r, perMin] of Object.entries(def.levels[lvl - 1].perMinute) as [ResourceId, number][]) {
    const mult = r === 'coin' ? coinMultiplier(state) : 1;
    out[r] = (perMin / 60) * mult * rain;
  }
  return out;
}

/** Monete al secondo prodotte dal lavoro degli abitanti. */
export function laborRate(state: GameState): number {
  return (inhabitants(state) * BALANCE.coinPerInhabitantPerMinute * coinMultiplier(state)) / 60;
}

/** Produzione totale al secondo. */
export function totalRate(state: GameState, raining = false): Record<ResourceId, number> {
  const out = Object.fromEntries(RESOURCE_IDS.map((r) => [r, 0])) as Record<ResourceId, number>;
  for (const id of BUILDING_IDS) {
    const rate = buildingRate(state, id, raining);
    for (const r of RESOURCE_IDS) out[r] += rate[r] ?? 0;
  }
  out.coin += laborRate(state);
  return out;
}

export interface OfflineReport {
  seconds: number;
  gains: Record<ResourceId, number>;
}

/** Calcola (senza applicarli) i guadagni accumulati mentre il gioco era chiuso. */
export function computeOffline(state: GameState, now = Date.now()): OfflineReport | null {
  const elapsed = Math.max(0, (now - state.lastSeen) / 1000);
  if (elapsed < BALANCE.offlineMinSeconds) return null;
  const seconds = Math.min(elapsed, BALANCE.offlineMaxHours * 3600);
  const rate = totalRate(state);
  const gains = Object.fromEntries(
    RESOURCE_IDS.map((r) => [r, Math.floor(rate[r] * seconds * BALANCE.offlineRate)]),
  ) as Record<ResourceId, number>;
  if (RESOURCE_IDS.every((r) => gains[r] <= 0)) return null;
  return { seconds: elapsed, gains };
}
