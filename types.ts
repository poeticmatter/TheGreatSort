
export type CardStatus = 'pending' | 'scanning' | 'safe' | 'eliminated';

export interface ISortable {
  val: number;
  hasShield?: boolean;
}


export enum HiddenRole {
  NONE = 'none',
  RESISTANCE = 'resistance',
  STATE = 'state',
}

export enum UserTag {
  NONE = 'none',
  SUSPICIOUS = 'suspicious',
  RESISTANCE = 'resistance',
  STATE = 'state',
}

export enum ResistanceStatus {
  INACTIVE = 'inactive',
  ACTIVE = 'active',
  MIA = 'mia',
  COMPROMISED = 'compromised',
  SUCCESS = 'success',
  CAREFUL = 'careful',
  EXPOSED = 'exposed',
}

export interface CardItem extends ISortable {
  id: string;
  status: CardStatus;
  hiddenRole: HiddenRole;
  delta?: number;
  userTag: UserTag;
}

export type ToolType = 'demote' | 'swap' | 'purge' | 'promote' | 'longswap' | 'sink' | 'halve' | 'shield' | 'shrink' | 'hop' | 'mirror' | 'cycle' | 'equalize' | 'transfer';

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

export type GameMode = 'DAILY' | 'PRACTICE';

export interface Move {
  tool: ToolType;
  toolInstanceId?: string;
  index: number;
  targetIndex?: number;
  description: string;
}
