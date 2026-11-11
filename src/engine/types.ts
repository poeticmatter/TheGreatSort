export type CardStatus = 'pending' | 'scanning' | 'safe' | 'eliminated';

export type SortDirection = 'ASC' | 'DESC';

export interface ISortable {
  val: number;
  hasShield?: boolean;
}

export enum AgentRole {
  NONE = 'none',
  RESISTANCE = 'resistance',
  STATE = 'state',
}

export interface CardItem extends ISortable {
  id: string;
  status: CardStatus;
  role: AgentRole;
}

export type ToolType = 'demote' | 'swap' | 'promote' | 'longswap' | 'sink' | 'halve' | 'shield' | 'shrink' | 'hop' | 'mirror' | 'cycle' | 'equalize' | 'transfer';

export interface ToolInstance {
  instanceId: string;
  type: ToolType;
  used: boolean;
}

export interface Move {
  tool: ToolType;
  toolInstanceId?: string;
  index: number;
  targetIndex?: number;
  description: string;
}
