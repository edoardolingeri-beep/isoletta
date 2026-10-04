import type { Bundle, ResourceId } from './resources';
import type { BuildingId } from './buildings';
import type { ZoneId } from './zones';

// Obiettivi in sequenza: ce n'è sempre uno visibile in alto.
// Le missioni "gather" e "tips" contano solo i progressi da quando sono attive.

export type QuestGoal =
  | { kind: 'gather'; resource: ResourceId; amount: number }
  | { kind: 'build'; building: BuildingId; level: number }
  | { kind: 'zone'; zone: ZoneId }
  | { kind: 'tips'; amount: number }
  | { kind: 'beauty'; amount: number }
  | { kind: 'inhabitants'; amount: number };

export interface QuestDef {
  /** Chi chiede la missione (abitante) — dà un tocco di personalità. */
  from: string;
  text: string;
  goal: QuestGoal;
  reward: Bundle;
}

export const QUESTS: QuestDef[] = [
  { from: 'Nino', text: 'Tocca le palme e raccogli 5 legna', goal: { kind: 'gather', resource: 'wood', amount: 5 }, reward: { coin: 5 } },
  { from: 'Nino', text: 'Costruisci una capanna', goal: { kind: 'build', building: 'hut', level: 1 }, reward: { wood: 10 } },
  { from: 'Lia', text: 'Raccogli 3 conchiglie sulla spiaggia', goal: { kind: 'gather', resource: 'shell', amount: 3 }, reward: { coin: 10 } },
  { from: 'Lia', text: 'Pesca 8 pesci dalla scogliera', goal: { kind: 'gather', resource: 'fish', amount: 8 }, reward: { wood: 10 } },
  { from: 'Lia', text: 'Costruisci l\'orto', goal: { kind: 'build', building: 'garden', level: 1 }, reward: { coin: 20 } },
  { from: 'Nino', text: 'Costruisci il molo', goal: { kind: 'build', building: 'dock', level: 1 }, reward: { coin: 25 } },
  { from: 'Capitano', text: 'Tocca una barca di turisti per una mancia', goal: { kind: 'tips', amount: 1 }, reward: { shell: 10 } },
  { from: 'Lia', text: 'Migliora la capanna al livello 2', goal: { kind: 'build', building: 'hut', level: 2 }, reward: { wood: 30 } },
  { from: 'Nino', text: 'Togli la nebbia dalla foresta', goal: { kind: 'zone', zone: 'forest' }, reward: { coin: 60 } },
  { from: 'Capitano', text: 'Costruisci il faro', goal: { kind: 'build', building: 'lighthouse', level: 1 }, reward: { coin: 100 } },
  { from: 'Lia', text: 'Porta l\'orto al livello 2', goal: { kind: 'build', building: 'garden', level: 2 }, reward: { shell: 25 } },
  { from: 'Nino', text: 'Raggiungi 6 abitanti', goal: { kind: 'inhabitants', amount: 6 }, reward: { coin: 200 } },
  { from: 'Capitano', text: 'Raggiungi 25 punti bellezza', goal: { kind: 'beauty', amount: 25 }, reward: { coin: 500 } },
  { from: 'Capitano', text: 'Porta il faro al livello 3', goal: { kind: 'build', building: 'lighthouse', level: 3 }, reward: { coin: 1000 } },
];
