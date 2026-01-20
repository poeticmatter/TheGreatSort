import { LucideIcon } from 'lucide-react';

export type CardStatus = 'pending' | 'scanning' | 'safe' | 'eliminated';

export interface ISortable {
  val: number;
  hasShield?: boolean;
}

export interface CardItem extends ISortable {
  id: string;
  status: CardStatus;
  linkScore: number | null;
}

export type ToolType = 'demote' | 'swap' | 'purge' | 'promote' | 'longswap' | 'merge' | 'sink' | 'float' | 'halve' | 'shield' | 'grow' | 'shrink' | 'hop' | 'mirror';

export interface ToolDefinition {
  id: ToolType;
  name: string;
  icon: LucideIcon;
  desc: string;
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

export type GameMode = 'CAREER' | 'DAILY' | 'PRACTICE';
