import {
  ArrowLeftToLine, ArrowRightToLine, Trash2, ArrowRightLeft
} from 'lucide-react';
import { ToolDefinition } from '../types';

export const TOOLS: Record<string, ToolDefinition> = {
  DEMOTE: { id: 'demote', name: 'Demote', icon: ArrowLeftToLine, desc: 'Move item to the start (Left)' },
  SWAP: { id: 'swap', name: 'Swap', icon: ArrowRightLeft, desc: 'Switch two adjacent items' },
  PURGE: { id: 'purge', name: 'Purge', icon: Trash2, desc: 'Eliminate one item' },
  PROMOTE: { id: 'promote', name: 'Promote', icon: ArrowRightToLine, desc: 'Move item to the end (Right)' },
};

export const TOOLS_DISPLAY_ORDER = ['demote', 'swap', 'purge', 'promote'];
