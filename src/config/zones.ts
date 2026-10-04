import type { Bundle } from './resources';
import type { BuildingId } from './buildings';
import type { GatherableId } from './gatherables';

// ---------------------------------------------------------------------------
// Zone dell'isola. Ogni zona è un'unione di "dischi" di terra.
// La prima zona è libera; le altre sono coperte dalla nebbia e si sbloccano
// pagando `cost`. Le zone `comingSoon` sono solo nebbia (prossime espansioni).
// Coordinate: x verso destra, z verso la camera iniziale. Unità ≈ metri.
// ---------------------------------------------------------------------------

export type ZoneId = 'beach' | 'forest' | 'cliff' | 'lagoon' | 'volcano';

export interface Disc { x: number; z: number; r: number; /** frazione del raggio coperta d'erba */ grass: number }

export interface ZoneDef {
  id: ZoneId;
  name: string;
  description: string;
  cost?: Bundle;
  comingSoon?: boolean;
  beauty: number;
  discs: Disc[];
  /** Dove appare il cartello col prezzo sopra la nebbia. */
  label: [number, number];
  gatherables: { type: Exclude<GatherableId, 'shell'>; x: number; z: number }[];
  /** Quante conchiglie possono stare contemporaneamente sulla spiaggia di questa zona. */
  shells: number;
  plots: { building: BuildingId; x: number; z: number; rot: number }[];
  decor: { model: string; x: number; z: number; rot?: number; scale?: number }[];
}

export const ZONES: ZoneDef[] = [
  {
    id: 'beach',
    name: 'Spiaggia',
    description: 'Dove tutto è cominciato.',
    beauty: 0,
    discs: [
      { x: 0, z: 0, r: 4.6, grass: 0.5 },
      { x: 2.6, z: 1.8, r: 3.0, grass: 0 },
      { x: -2.6, z: 2.0, r: 2.6, grass: 0 },
    ],
    label: [0, 0],
    gatherables: [
      { type: 'palm', x: -3.0, z: 1.7 },
      { type: 'palm', x: -0.4, z: 2.9 },
      { type: 'palm', x: 3.4, z: 3.1 },
      { type: 'palm', x: 0.4, z: -3.2 },
      { type: 'fish', x: -6.3, z: 3.6 },
    ],
    shells: 4,
    plots: [
      { building: 'hut', x: -1.7, z: -1.0, rot: 0.35 },
      { building: 'garden', x: 1.9, z: -1.2, rot: -0.2 },
      { building: 'dock', x: 4.9, z: 1.6, rot: 0 },
    ],
    decor: [
      { model: 'nature.rock', x: -4.0, z: -0.8, scale: 1.1 },
      { model: 'nature.rock', x: 4.4, z: -1.6, scale: 0.7 },
      { model: 'nature.bush', x: -0.2, z: 0.9 },
      { model: 'nature.flower', x: 0.9, z: 0.3 },
      { model: 'nature.flower', x: -1.2, z: 1.0 },
      { model: 'misc.campfire', x: 0.5, z: 1.4 },
    ],
  },
  {
    id: 'forest',
    name: 'Foresta',
    description: 'Alberi enormi pieni di legna e una scogliera perfetta per un faro.',
    cost: { coin: 150, wood: 40 },
    beauty: 3,
    discs: [
      { x: -0.5, z: -6.6, r: 4.2, grass: 0.85 },
      { x: 3.0, z: -7.6, r: 3.0, grass: 0.8 },
      { x: -3.6, z: -8.6, r: 2.7, grass: 0.75 },
    ],
    label: [-0.5, -7.2],
    gatherables: [
      { type: 'tree', x: -1.6, z: -5.4 },
      { type: 'tree', x: 1.2, z: -5.9 },
      { type: 'tree', x: -0.4, z: -8.2 },
      { type: 'tree', x: 2.6, z: -8.7 },
      { type: 'tree', x: 4.2, z: -6.6 },
      { type: 'tree', x: -2.9, z: -7.0 },
    ],
    shells: 2,
    plots: [{ building: 'lighthouse', x: -4.3, z: -9.4, rot: 0 }],
    decor: [
      { model: 'nature.mushroom', x: 0.4, z: -7.1 },
      { model: 'nature.mushroom', x: 3.4, z: -5.6, scale: 0.8 },
      { model: 'nature.bush', x: -2.2, z: -9.6 },
      { model: 'nature.bush', x: 1.4, z: -9.9, scale: 0.8 },
      { model: 'nature.rock', x: 5.4, z: -8.2, scale: 1.2 },
      { model: 'nature.flower', x: -0.9, z: -4.6 },
    ],
  },
  { id: 'cliff', name: 'Scogliera', description: 'Prossimamente…', comingSoon: true, beauty: 0,
    discs: [{ x: 10.2, z: -4.4, r: 3.2, grass: 0.5 }], label: [10.2, -4.4], gatherables: [], shells: 0, plots: [], decor: [] },
  { id: 'lagoon', name: 'Laguna', description: 'Prossimamente…', comingSoon: true, beauty: 0,
    discs: [{ x: 2.0, z: 10.6, r: 3.2, grass: 0.4 }], label: [2.0, 10.6], gatherables: [], shells: 0, plots: [], decor: [] },
  { id: 'volcano', name: 'Vulcano', description: 'Prossimamente…', comingSoon: true, beauty: 0,
    discs: [{ x: -10.4, z: -2.6, r: 3.6, grass: 0.3 }], label: [-10.4, -2.6], gatherables: [], shells: 0, plots: [], decor: [] },
];

export const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z])) as Record<ZoneId, ZoneDef>;
