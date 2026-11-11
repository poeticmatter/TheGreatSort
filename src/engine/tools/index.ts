import { ToolType } from '../types.ts';
import { ToolStrategy } from './types.ts';
import {
    DemoteTool, SwapTool, PromoteTool,
    LongSwapTool, TransferTool, SinkTool,
    HalveTool, ShieldTool, ShrinkTool,
    HopTool, MirrorTool, CycleTool, EqualizeTool
} from './implementations.ts';

export const TOOL_REGISTRY: Record<ToolType, ToolStrategy> = {
    demote: new DemoteTool(),
    swap: new SwapTool(),

    promote: new PromoteTool(),
    longswap: new LongSwapTool(),
    transfer: new TransferTool(),
    sink: new SinkTool(),
    halve: new HalveTool(),
    shield: new ShieldTool(),
    shrink: new ShrinkTool(),
    hop: new HopTool(),
    mirror: new MirrorTool(),
    cycle: new CycleTool(),
    equalize: new EqualizeTool(),
};
