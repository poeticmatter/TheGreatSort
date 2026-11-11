import type { ToolType } from './src/engine/types.ts';

// The rules engine owns the types it operates on; they are re-exported here so
// app code keeps a single import site for shared types.
export { AgentRole } from './src/engine/types.ts';
export type {
  CardItem,
  CardStatus,
  ISortable,
  Move,
  SortDirection,
  ToolInstance,
  ToolType,
} from './src/engine/types.ts';

export enum ResistanceStatus {
  INACTIVE = 'inactive',
  ACTIVE = 'active',
  COMPROMISED = 'compromised', // State agent survived
  SUCCESS = 'success',
  CAREFUL = 'careful', // Conditions met but low score? Or maybe just failed score.
  EXPOSED = 'exposed', // Resistance agent eliminated
}

export interface ToolDefinition {
  id: ToolType;
  name: string;
  icon: any; // LucideIcon
  desc: string;
  weight: number;
}

export enum GamePhase {
  PLANNING = 'planning',
  INSPECTING = 'inspecting',
  RESULTS = 'results',
}

export type GameMode = 'DAILY' | 'PRACTICE' | 'TUTORIAL';
