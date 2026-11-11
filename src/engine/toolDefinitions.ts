import { ToolType } from './types.ts';

export interface ToolMetadata {
    id: ToolType;
    weight: number;
}

export const ALL_TOOL_TYPES: ToolType[] = ['demote', 'swap', 'promote', 'longswap', 'sink', 'halve', 'shield', 'shrink', 'hop', 'mirror', 'cycle', 'equalize', 'transfer'];

export const TOOL_META: Record<string, ToolMetadata> = {
    DEMOTE: { id: 'demote', weight: 20 },
    SWAP: { id: 'swap', weight: 20 },

    PROMOTE: { id: 'promote', weight: 20 },
    LONGSWAP: { id: 'longswap', weight: 10 },
    // MERGE Removed
    SINK: { id: 'sink', weight: 5 },
    HALVE: { id: 'halve', weight: 5 },
    SHIELD: { id: 'shield', weight: 2 },
    SHRINK: { id: 'shrink', weight: 5 },
    HOP: { id: 'hop', weight: 10 },
    MIRROR: { id: 'mirror', weight: 5 },
    CYCLE: { id: 'cycle', weight: 2 },
    EQUALIZE: { id: 'equalize', weight: 5 },
    TRANSFER: { id: 'transfer', weight: 5 },
};
