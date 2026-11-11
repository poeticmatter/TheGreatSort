import { CardItem, ToolType } from '../types.ts';

export interface ToolLoadoutEntry {
  type: ToolType;
  /** Number of following sequences the tool is unavailable for after a use. */
  cooldown: number;
}

export interface RunConfig {
  /** Base quota of each shift, in order. Its length is the number of shifts in a run. */
  quotaCurve: number[];
  /** Inclusive bounds of the hidden number of sequences in a shift. */
  minSequencesPerShift: number;
  maxSequencesPerShift: number;
  sequenceLength: number;
  /** Missing this many shift quotas ends the run. */
  strikeLimit: number;
  loadout: ToolLoadoutEntry[];
}

export interface RunTool extends ToolLoadoutEntry {
  id: string;
  /** Sequences left before the tool can be used again; 0 means ready. */
  sequencesUntilReady: number;
}

export interface RunMove {
  toolId: string;
  index: number;
  selection?: number;
  /** The sequence as it was before this move, so the move can be undone. */
  cardsBefore: CardItem[];
}

export interface SequenceState {
  cards: CardItem[];
  moves: RunMove[];
}

export interface ShiftState {
  index: number;
  /** Hidden from the player: how many sequences this shift contains. */
  sequenceCount: number;
  sequenceIndex: number;
  /** Base quota plus any deficit carried from a missed shift. */
  quota: number;
  bankedYield: number;
}

export interface ShiftResult {
  shiftIndex: number;
  sequenceCount: number;
  quota: number;
  bankedYield: number;
  wasQuotaMet: boolean;
}

export type RunStatus = 'IN_PROGRESS' | 'WON' | 'LOST';

export interface RunState {
  seed: number;
  config: RunConfig;
  status: RunStatus;
  strikes: number;
  tools: RunTool[];
  shift: ShiftState;
  sequence: SequenceState;
  completedShifts: ShiftResult[];
}

export type PaceHint = 'EARLY' | 'MIDWAY' | 'WINDING_DOWN';
