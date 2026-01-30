import {
  ArrowLeftToLine, ArrowRightToLine, Trash2, ArrowRightLeft, Merge, ArrowDownToLine,
  RefreshCcwDot, Divide, Shield, DiamondMinus, RedoDot, FlipHorizontal2, Recycle, Equal
} from 'lucide-react';
import { ToolDefinition } from '../types';
import { TOOL_META } from './toolDefinitions';

export { ALL_TOOL_TYPES } from './toolDefinitions';

export const TOOLS: Record<string, ToolDefinition> = {
  DEMOTE: { ...TOOL_META.DEMOTE, name: 'Demote', icon: ArrowRightToLine, desc: 'Move an item to the end (Right)' },
  SWAP: { ...TOOL_META.SWAP, name: 'Swap', icon: ArrowRightLeft, desc: 'Switch two adjacent items' },
  PURGE: { ...TOOL_META.PURGE, name: 'Purge', icon: Trash2, desc: 'Eliminate one item' },
  PROMOTE: { ...TOOL_META.PROMOTE, name: 'Promote', icon: ArrowLeftToLine, desc: 'Move an item to the start (Left)' },

  LONGSWAP: { ...TOOL_META.LONGSWAP, name: 'Long Swap', icon: RefreshCcwDot, desc: 'Switch any two NON-adjacent items' },
  MERGE: { ...TOOL_META.MERGE, name: 'Merge', icon: Merge, desc: 'Combine two adjacent items (Sum)' },
  SINK: { ...TOOL_META.SINK, name: 'Sink', icon: ArrowDownToLine, desc: 'Set adjacent items to the lower of the two' },
  HALVE: { ...TOOL_META.HALVE, name: 'Halve', icon: Divide, desc: 'Halve item value (round down)' },

  SHIELD: { ...TOOL_META.SHIELD, name: 'Shield', icon: Shield, desc: 'Select an item to PROTECT. Left neighbor will be sacrificed.' },
  SHRINK: { ...TOOL_META.SHRINK, name: 'Shrink', icon: DiamondMinus, desc: 'Decrease value by 3' },

  HOP: { ...TOOL_META.HOP, name: 'Hop', icon: RedoDot, desc: 'Swap the items adjacent to the selected item' },
  MIRROR: { ...TOOL_META.MIRROR, name: 'Mirror', icon: FlipHorizontal2, desc: 'Swap with item on opposite side' },

  CYCLE: { ...TOOL_META.CYCLE, name: 'Cycle', icon: Recycle, desc: 'Select middle item, then direction to cycle block of 3' },
  EQUALIZE: { ...TOOL_META.EQUALIZE, name: 'Equalize', icon: Equal, desc: 'Average two non-adjacent items (round down)' },
};
