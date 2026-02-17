
export type CardStatus = 'pending' | 'scanning' | 'safe' | 'eliminated';

export interface ISortable {
  val: number;
  hasShield?: boolean;
}


export enum AgentRole {
  NONE = 'none',
  RESISTANCE = 'resistance',
  STATE = 'state',
}

export enum ResistanceStatus {
  INACTIVE = 'inactive',
  ACTIVE = 'active',
  MIA = 'mia',
  COMPROMISED = 'compromised', // State agent survived
  SUCCESS = 'success',
  CAREFUL = 'careful', // Conditions met but low score? Or maybe just failed score.
  EXPOSED = 'exposed', // Resistance agent eliminated
}

export interface CardItem extends ISortable {
  id: string;
  status: CardStatus;
  role: AgentRole;
  // delta removed
  // userTag removed
}

export type ToolType = 'demote' | 'swap' | 'promote' | 'longswap' | 'sink' | 'halve' | 'shield' | 'shrink' | 'hop' | 'mirror' | 'cycle' | 'equalize' | 'transfer';

export interface ToolDefinition {
  id: ToolType;
  name: string;
  icon: any; // LucideIcon
  desc: string;
  weight: number;
}

export interface ToolInstance {
  instanceId: string;
  type: ToolType;
  used: boolean;
}

export enum GamePhase {
  PLANNING = 'planning',
  INSPECTING = 'inspecting',
  RESULTS = 'results',
}

export type GameMode = 'DAILY' | 'PRACTICE' | 'TUTORIAL';

export interface Move {
  tool: ToolType;
  toolInstanceId?: string;
  index: number;
  targetIndex?: number;
  description: string;
}
