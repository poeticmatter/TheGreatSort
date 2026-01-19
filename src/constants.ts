import {
  ArrowLeftToLine, ArrowRightToLine, Trash2, ArrowRightLeft, Merge, Scissors, ArrowDownToLine,
  RefreshCcwDot
} from 'lucide-react';
import { ToolDefinition } from '../types';

export const TOOLS: Record<string, ToolDefinition> = {
  DEMOTE: { id: 'demote', name: 'Demote', icon: ArrowLeftToLine, desc: 'Move an item to the start (Left)' },
  SWAP: { id: 'swap', name: 'Swap', icon: ArrowRightLeft, desc: 'Switch two adjacent items' },
  PURGE: { id: 'purge', name: 'Purge', icon: Trash2, desc: 'Eliminate one item' },
  PROMOTE: { id: 'promote', name: 'Promote', icon: ArrowRightToLine, desc: 'Move an item to the end (Right)' },

  LONGSWAP: { id: 'longswap', name: 'Long Swap', icon: RefreshCcwDot, desc: 'Switch any two NON-adjacent items' },
  MERGE: { id: 'merge', name: 'Merge', icon: Merge, desc: 'Combine two adjacent items (Sum)' },
  FLOOR: { id: 'floor', name: 'Floor', icon: ArrowDownToLine, desc: 'Set adjacent items to the lower of the two' },
  HALVE: { id: 'halve', name: 'Halve', icon: Scissors, desc: 'Halve item value (round down)' },
};

export const ALL_TOOL_TYPES = ['demote', 'swap', 'purge', 'promote', 'longswap', 'merge', 'floor', 'halve'];
