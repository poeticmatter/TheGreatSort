import {
  ArrowLeftToLine, ArrowRightToLine, Trash2, ArrowRightLeft,
  Minimize2, Merge, Scissors, Shuffle
} from 'lucide-react';
import { ToolDefinition } from '../types';

export const TOOLS: Record<string, ToolDefinition> = {
  DEMOTE: { id: 'demote', name: 'Demote', icon: ArrowLeftToLine, desc: 'Move item to the start (Left)' },
  SWAP: { id: 'swap', name: 'Swap', icon: ArrowRightLeft, desc: 'Switch two adjacent items' },
  PURGE: { id: 'purge', name: 'Purge', icon: Trash2, desc: 'Eliminate one item' },
  PROMOTE: { id: 'promote', name: 'Promote', icon: ArrowRightToLine, desc: 'Move item to the end (Right)' },

  LONGSWAP: { id: 'longswap', name: 'L-Swap', icon: Shuffle, desc: 'Switch any two NON-adjacent items' },
  CONSOLIDATE: { id: 'consolidate', name: 'Merge', icon: Merge, desc: 'Combine two adjacent items (Sum)' },
  EQUALIZE: { id: 'equalize', name: 'Equal', icon: Minimize2, desc: 'Set adjacent items to lower value' },
  CUT: { id: 'cut', name: 'Cut', icon: Scissors, desc: 'Halve item value (round down)' },
};

export const ALL_TOOL_TYPES = ['demote', 'swap', 'purge', 'promote', 'longswap', 'consolidate', 'equalize', 'cut'];
