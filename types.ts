import { LucideIcon } from 'lucide-react';

export type CardStatus = 'pending' | 'scanning' | 'safe' | 'eliminated';

export interface CardItem {
  id: string;
  val: number;
  status: CardStatus;
  linkScore: number | null;
}

export type ToolType = 'demote' | 'swap' | 'purge' | 'promote';

export interface ToolDefinition {
  id: ToolType;
  name: string;
  icon: LucideIcon;
  desc: string;
}

export enum GamePhase {
  PLANNING = 'planning',
  INSPECTING = 'inspecting',
  RESULTS = 'results',
}

export interface ToolsAvailable {
  swap: boolean;
  purge: boolean;
  promote: boolean;
  demote: boolean;
}

export type GameMode = 'CAREER' | 'DAILY' | 'PRACTICE';
