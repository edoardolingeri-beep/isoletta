import type { Bundle } from './resources';

// ---------------------------------------------------------------------------
// Dati degli edifici. Per bilanciare il gioco basta modificare questo file.
// - cost:       prezzo per costruire (livello 1) o migliorare a quel livello
// - perMinute:  produzione al minuto di quel livello
// - beauty:     punti bellezza (attira turisti → moltiplicatore monete)
// - inhabitants: abitanti che vivono nell'edificio
// - model:      chiave del modello 3D (vedi src/scene/models), il livello
//               viene aggiunto in coda: "building.hut" → "building.hut.2"
// ---------------------------------------------------------------------------

export type BuildingId = 'hut' | 'dock' | 'garden' | 'lighthouse';

export interface BuildingLevel {
  cost: Bundle;
  perMinute: Bundle;
  beauty: number;
  inhabitants: number;
}

export interface BuildingDef {
  id: BuildingId;
  name: string;
  description: string;
  model: string;
  /** Bonus speciali leggibili dal codice (es. l'orto produce di più con la pioggia). */
  rainBonus?: number;
  levels: BuildingLevel[];
}

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  hut: {
    id: 'hut',
    name: 'Capanna',
    description: 'Una casa per i nuovi isolani. Ogni abitante lavora e produce monete.',
    model: 'building.hut',
    levels: [
      { cost: { wood: 10 }, perMinute: { coin: 3 }, beauty: 1, inhabitants: 1 },
      { cost: { wood: 40, shell: 10, coin: 60 }, perMinute: { coin: 8 }, beauty: 2, inhabitants: 2 },
      { cost: { wood: 120, shell: 35, fish: 40, coin: 400 }, perMinute: { coin: 20 }, beauty: 4, inhabitants: 4 },
    ],
  },
  dock: {
    id: 'dock',
    name: 'Molo',
    description: 'I pescatori escono in mare e portano pesce fresco.',
    model: 'building.dock',
    levels: [
      { cost: { wood: 25, shell: 5 }, perMinute: { fish: 4 }, beauty: 1, inhabitants: 0 },
      { cost: { wood: 60, shell: 15, coin: 100 }, perMinute: { fish: 8, coin: 3 }, beauty: 2, inhabitants: 1 },
      { cost: { wood: 150, shell: 40, coin: 600 }, perMinute: { fish: 16, coin: 8 }, beauty: 3, inhabitants: 1 },
    ],
  },
  garden: {
    id: 'garden',
    name: 'Orto',
    description: 'Verdure da vendere al mercato. Con la pioggia cresce più in fretta!',
    model: 'building.garden',
    rainBonus: 0.5,
    levels: [
      { cost: { wood: 15, fish: 8 }, perMinute: { coin: 5 }, beauty: 2, inhabitants: 0 },
      { cost: { wood: 50, fish: 40, coin: 150 }, perMinute: { coin: 12 }, beauty: 3, inhabitants: 1 },
      { cost: { wood: 120, fish: 100, shell: 30, coin: 700 }, perMinute: { coin: 30 }, beauty: 5, inhabitants: 1 },
    ],
  },
  lighthouse: {
    id: 'lighthouse',
    name: 'Faro',
    description: 'Si vede da lontano: più barche di turisti passano vicino all\'isola.',
    model: 'building.lighthouse',
    levels: [
      { cost: { wood: 80, shell: 30, coin: 300 }, perMinute: { coin: 10 }, beauty: 5, inhabitants: 1 },
      { cost: { wood: 200, shell: 80, coin: 1200 }, perMinute: { coin: 25 }, beauty: 8, inhabitants: 1 },
      { cost: { wood: 400, shell: 150, fish: 150, coin: 3500 }, perMinute: { coin: 60 }, beauty: 14, inhabitants: 2 },
    ],
  },
};

export const BUILDING_IDS = Object.keys(BUILDINGS) as BuildingId[];
