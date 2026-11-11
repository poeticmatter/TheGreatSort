import {
  ArrowLeftToLine, ArrowRightToLine, ArrowRightLeft, ArrowDownToLine,
  RefreshCcwDot, Divide, Shield, DiamondMinus, RedoDot, FlipHorizontal2, Recycle, Equal, Scale
} from 'lucide-react';
import { ToolDefinition } from '../types';
import { TOOL_META } from './engine/toolDefinitions';

export { ALL_TOOL_TYPES } from './engine/toolDefinitions';

export const BASE_URL = 'https://stalinsort.fun';

export const TOOLS: Record<string, ToolDefinition> = {
  DEMOTE: { ...TOOL_META.DEMOTE, name: 'Demote', icon: ArrowRightToLine, desc: 'Move an item to the end (Right)' },
  SWAP: { ...TOOL_META.SWAP, name: 'Swap', icon: ArrowRightLeft, desc: 'Switch two adjacent items' },

  PROMOTE: { ...TOOL_META.PROMOTE, name: 'Promote', icon: ArrowLeftToLine, desc: 'Move an item to the start (Left)' },

  LONGSWAP: { ...TOOL_META.LONGSWAP, name: 'Long Swap', icon: RefreshCcwDot, desc: 'Switch any two NON-adjacent items' },
  SINK: { ...TOOL_META.SINK, name: 'Sink', icon: ArrowDownToLine, desc: 'Set adjacent items to the lower of the two' },
  HALVE: { ...TOOL_META.HALVE, name: 'Halve', icon: Divide, desc: 'Halve item value (round down)' },

  TRANSFER: { ...TOOL_META.TRANSFER, name: 'Transfer', icon: Scale, desc: 'Transfer 2 points from Selection to Target (Non-adjacent)' },

  SHIELD: { ...TOOL_META.SHIELD, name: 'Shield', icon: Shield, desc: 'Select an item to PROTECT. Left neighbor will be sacrificed.' },
  SHRINK: { ...TOOL_META.SHRINK, name: 'Shrink', icon: DiamondMinus, desc: 'Decrease value by 3' },

  HOP: { ...TOOL_META.HOP, name: 'Hop', icon: RedoDot, desc: 'Swap the items adjacent to the selected item' },
  MIRROR: { ...TOOL_META.MIRROR, name: 'Mirror', icon: FlipHorizontal2, desc: 'Swap with item on opposite side' },

  CYCLE: { ...TOOL_META.CYCLE, name: 'Cycle', icon: Recycle, desc: 'Select middle item, then direction to cycle block of 3' },
  EQUALIZE: { ...TOOL_META.EQUALIZE, name: 'Equalize', icon: Equal, desc: 'Average two non-adjacent items (round down)' },
};
