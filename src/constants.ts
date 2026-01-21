import {
  ArrowLeftToLine, ArrowRightToLine, Trash2, ArrowRightLeft, Merge, ArrowDownToLine,
  RefreshCcwDot, Divide, Shield, DiamondMinus, RedoDot, FlipHorizontal2, Recycle, Equal
} from 'lucide-react';
import { ToolDefinition } from '../types';

export const TOOLS: Record<string, ToolDefinition> = {
  DEMOTE: { id: 'demote', name: 'Demote', icon: ArrowLeftToLine, desc: 'Move an item to the start (Left)', weight: 10 },
  SWAP: { id: 'swap', name: 'Swap', icon: ArrowRightLeft, desc: 'Switch two adjacent items', weight: 10 },
  PURGE: { id: 'purge', name: 'Purge', icon: Trash2, desc: 'Eliminate one item', weight: 10 },
  PROMOTE: { id: 'promote', name: 'Promote', icon: ArrowRightToLine, desc: 'Move an item to the end (Right)', weight: 10 },

  LONGSWAP: { id: 'longswap', name: 'Long Swap', icon: RefreshCcwDot, desc: 'Switch any two NON-adjacent items', weight: 10 },
  MERGE: { id: 'merge', name: 'Merge', icon: Merge, desc: 'Combine two adjacent items (Sum)', weight: 10 },
  SINK: { id: 'sink', name: 'Sink', icon: ArrowDownToLine, desc: 'Set adjacent items to the lower of the two', weight: 10 },
  HALVE: { id: 'halve', name: 'Halve', icon: Divide, desc: 'Halve item value (round down)', weight: 10 },
  
  SHIELD: { id: 'shield', name: 'Shield', icon: Shield, desc: 'Protects the NEXT item from elimination', weight: 10 },
  SHRINK: { id: 'shrink', name: 'Shrink', icon: DiamondMinus, desc: 'Decrease value by 3', weight: 10 },
  
  HOP: { id: 'hop', name: 'Hop', icon: RedoDot, desc: 'Swap the items adjacent to the selected item', weight: 10 },
  MIRROR: { id: 'mirror', name: 'Mirror', icon: FlipHorizontal2, desc: 'Swap with item on opposite side', weight: 10 },

  CYCLE: { id: 'cycle', name: 'Cycle', icon: Recycle, desc: 'Select middle item, then direction to cycle block of 3', weight: 10 },
  EQUALIZE: { id: 'equalize', name: 'Equalize', icon: Equal, desc: 'Average two non-adjacent items (round down)', weight: 10 },
};

export const ALL_TOOL_TYPES = ['demote', 'swap', 'purge', 'promote', 'longswap', 'merge', 'sink', 'halve', 'shield', 'shrink', 'hop', 'mirror', 'cycle', 'equalize'];
