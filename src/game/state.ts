import { RESOURCE_IDS, type ResourceId } from '../config/resources';
import type { BuildingId } from '../config/buildings';
import type { ZoneId } from '../config/zones';

const SAVE_KEY = 'isoletta.save.v1';

export interface GameState {
  version: 1;
  res: Record<ResourceId, number>;
  /** Livello di ogni edificio (0 o assente = non costruito). */
  buildings: Partial<Record<BuildingId, number>>;
  zones: ZoneId[];
  quest: { index: number; baseline: Stats };
  stats: Stats;
  settings: { sound: boolean; vibration: boolean };
  /** Momento dell'ultimo salvataggio (ms), per i guadagni offline. */
  lastSeen: number;
  /** Ora del giorno 0..1, per ripartire da dove si era. */
  timeOfDay: number;
}

export interface Stats {
  gathered: Record<ResourceId, number>;
  tips: number;
}

const emptyBundle = (): Record<ResourceId, number> =>
  Object.fromEntries(RESOURCE_IDS.map((r) => [r, 0])) as Record<ResourceId, number>;

const emptyStats = (): Stats => ({ gathered: emptyBundle(), tips: 0 });

export function newGame(): GameState {
  return {
    version: 1,
    res: emptyBundle(),
    buildings: {},
    zones: ['beach'],
    quest: { index: 0, baseline: emptyStats() },
    stats: emptyStats(),
    settings: { sound: true, vibration: true },
    lastSeen: Date.now(),
    timeOfDay: 0.08,
  };
}

export function cloneStats(s: Stats): Stats {
  return { gathered: { ...s.gathered }, tips: s.tips };
}

export function loadGame(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return newGame();
    const data = JSON.parse(raw) as Partial<GameState>;
    if (data.version !== 1) return newGame();
    // unisce con i valori di default, così salvataggi vecchi restano validi
    const base = newGame();
    return {
      ...base,
      ...data,
      res: { ...base.res, ...data.res },
      stats: { ...base.stats, ...data.stats, gathered: { ...base.stats.gathered, ...data.stats?.gathered } },
      settings: { ...base.settings, ...data.settings },
    } as GameState;
  } catch {
    return newGame();
  }
}

export function saveGame(state: GameState): void {
  state.lastSeen = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    /* storage pieno o bloccato (navigazione privata): si gioca senza salvare */
  }
}

export function wipeSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignora */
  }
}
