import type { ResourceId } from './resources';

// Oggetti che si toccano per raccogliere risorse.
// charges: quanti tocchi prima di "esaurirsi"; regenSec: secondi per recuperare 1 carica.
// Le conchiglie (respawnSec) spariscono e ricompaiono altrove sulla spiaggia.

export type GatherableId = 'palm' | 'tree' | 'fish' | 'shell';

export interface GatherableDef {
  resource: ResourceId;
  amount: number;
  charges: number;
  regenSec: number;
  model: string;
  /** Se presente, l'oggetto sparisce e riappare in un punto casuale. */
  respawnSec?: number;
}

export const GATHERABLES: Record<GatherableId, GatherableDef> = {
  palm: { resource: 'wood', amount: 1, charges: 5, regenSec: 3, model: 'nature.palm' },
  tree: { resource: 'wood', amount: 2, charges: 4, regenSec: 4, model: 'nature.tree' },
  fish: { resource: 'fish', amount: 1, charges: 5, regenSec: 3, model: 'nature.fishspot' },
  shell: { resource: 'shell', amount: 1, charges: 1, regenSec: 0, respawnSec: 12, model: 'nature.shell' },
};
