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

export type ToolType = 'demote' | 'swap' | 'purge' | 'promote' | 'longswap' | 'merge' | 'sink' | 'halve' | 'shield' | 'shrink' | 'hop' | 'mirror' | 'cycle' | 'equalize';

export interface ToolDefinition {
  id: ToolType;
  name: string;
  icon: LucideIcon;
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

export type GameMode = 'CAREER' | 'DAILY' | 'PRACTICE';

export interface Move {
  tool: ToolType;
  index: number;
  targetIndex?: number;
  description: string;
}
