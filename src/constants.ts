import {
  ArrowLeftToLine, ArrowRightToLine, Trash2, ArrowRightLeft, Merge, ArrowDownToLine,
  RefreshCcwDot, Divide, Shield, DiamondMinus, RedoDot, FlipHorizontal2, Recycle, Equal
} from 'lucide-react';
import { ToolDefinition } from '../types';

export const TOOLS: Record<string, ToolDefinition> = {
  DEMOTE: { id: 'demote', name: 'Demote', icon: ArrowLeftToLine, desc: 'Move an item to the start (Left)' },
  SWAP: { id: 'swap', name: 'Swap', icon: ArrowRightLeft, desc: 'Switch two adjacent items' },
  PURGE: { id: 'purge', name: 'Purge', icon: Trash2, desc: 'Eliminate one item' },
  PROMOTE: { id: 'promote', name: 'Promote', icon: ArrowRightToLine, desc: 'Move an item to the end (Right)' },

  LONGSWAP: { id: 'longswap', name: 'Long Swap', icon: RefreshCcwDot, desc: 'Switch any two NON-adjacent items' },
  MERGE: { id: 'merge', name: 'Merge', icon: Merge, desc: 'Combine two adjacent items (Sum)' },
  SINK: { id: 'sink', name: 'Sink', icon: ArrowDownToLine, desc: 'Set adjacent items to the lower of the two' },
  HALVE: { id: 'halve', name: 'Halve', icon: Divide, desc: 'Halve item value (round down)' },
  
  SHIELD: { id: 'shield', name: 'Shield', icon: Shield, desc: 'Protects the NEXT item from elimination' },
  SHRINK: { id: 'shrink', name: 'Shrink', icon: DiamondMinus, desc: 'Decrease value by 3' },
  
  HOP: { id: 'hop', name: 'Hop', icon: RedoDot, desc: 'Swap the items adjacent to the selected item' },
  MIRROR: { id: 'mirror', name: 'Mirror', icon: FlipHorizontal2, desc: 'Swap with item on opposite side' },

  CYCLE: { id: 'cycle', name: 'Cycle', icon: Recycle, desc: 'Select middle item, then direction to cycle block of 3' },
  EQUALIZE: { id: 'equalize', name: 'Equalize', icon: Equal, desc: 'Average two non-adjacent items (round down)' },
};

export const ALL_TOOL_TYPES = ['demote', 'swap', 'purge', 'promote', 'longswap', 'merge', 'sink', 'halve', 'shield', 'shrink', 'hop', 'mirror', 'cycle', 'equalize'];
