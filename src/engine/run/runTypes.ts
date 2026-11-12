import { CardItem, ToolType } from '../types.ts';

export interface ToolLoadoutEntry {
  type: ToolType;
  /** Energy each use of the tool costs. */
  cost: number;
}

export interface EnergyConfig {
  /** The pool never holds more than this. */
  capacity: number;
  startingEnergy: number;
  /** Energy restored when the next sequence of a shift is loaded. */
  perSequence: number;
  /** Energy restored when a new shift starts, on top of whatever was left over. */
  shiftBonus: number;
}

export interface RunConfig {
  /** Base quota of each shift, in order. Its length is the number of shifts in a run. */
  quotaCurve: number[];
  sequencesPerShift: number;
  sequenceLength: number;
  /** Missing this many shift quotas ends the run. */
  strikeLimit: number;
  loadout: ToolLoadoutEntry[];
  energy: EnergyConfig;
  /** How many cards of each sequence are starred. */
  starsPerSequence: number;
  /** Stars are drawn from this many of the sequence's lowest values. */
  starPoolSize: number;
}

export interface RunTool extends ToolLoadoutEntry {
  id: string;
}

export interface RunMove {
  toolId: string;
  index: number;
  selection?: number;
  /** Energy paid for this move, refunded if it is undone. */
  energySpent: number;
  /** The sequence as it was before this move, so the move can be undone. */
  cardsBefore: CardItem[];
}

export interface SequenceState {
  cards: CardItem[];
  moves: RunMove[];
}

export interface ShiftState {
  index: number;
  sequenceIndex: number;
  /** Base quota plus any deficit carried from a missed shift. */
  quota: number;
  bankedYield: number;
  /** Sequences submitted below their share of the quota. Narrative only: it has no rules effect. */
  sequencesBelowTarget: number;
  favorsEarned: number;
}

export interface ShiftResult {
  shiftIndex: number;
  quota: number;
  bankedYield: number;
  wasQuotaMet: boolean;
  sequencesBelowTarget: number;
  favorsEarned: number;
}

/** What inspecting the current sequence would produce, before it is submitted. */
export interface SequenceOutcome {
  yield: number;
  target: number;
  isBelowTarget: boolean;
  favorsEarned: number;
}

export type RunStatus = 'IN_PROGRESS' | 'WON' | 'LOST';

export interface RunState {
  seed: number;
  config: RunConfig;
  status: RunStatus;
  strikes: number;
  /** Favors earned across the run. Tallied only for now; nothing spends them yet. */
  favors: number;
  /** Shared pool every tool use is paid from. Unspent energy carries across sequences and shifts. */
  energy: number;
  tools: RunTool[];
  shift: ShiftState;
  sequence: SequenceState;
  completedShifts: ShiftResult[];
}
