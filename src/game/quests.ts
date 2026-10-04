import { QUESTS, type QuestDef } from '../config/quests';
import { beauty, inhabitants, levelOf } from './economy';
import { cloneStats, type GameState } from './state';

export interface QuestProgress {
  def: QuestDef;
  current: number;
  target: number;
  done: boolean;
}

export function currentQuest(state: GameState): QuestProgress | null {
  const def = QUESTS[state.quest.index];
  if (!def) return null;
  const g = def.goal;
  const base = state.quest.baseline;
  let current = 0;
  let target = 1;
  switch (g.kind) {
    case 'gather':
      current = state.stats.gathered[g.resource] - base.gathered[g.resource];
      target = g.amount;
      break;
    case 'tips':
      current = state.stats.tips - base.tips;
      target = g.amount;
      break;
    case 'build':
      current = Math.min(levelOf(state, g.building), g.level);
      target = g.level;
      break;
    case 'zone':
      current = state.zones.includes(g.zone) ? 1 : 0;
      break;
    case 'beauty':
      current = beauty(state);
      target = g.amount;
      break;
    case 'inhabitants':
      current = inhabitants(state);
      target = g.amount;
      break;
  }
  current = Math.max(0, Math.min(current, target));
  return { def, current, target, done: current >= target };
}

export function advanceQuest(state: GameState): void {
  state.quest.index++;
  state.quest.baseline = cloneStats(state.stats);
}
