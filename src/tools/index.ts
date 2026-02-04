import { ToolType } from '../../types';
import { ToolStrategy } from './types';
import {
    DemoteTool, SwapTool, PurgeTool, PromoteTool,
    LongSwapTool, TransferTool, SinkTool,
    HalveTool, ShieldTool, ShrinkTool,
    HopTool, MirrorTool, CycleTool, EqualizeTool
} from './implementations';

export const TOOL_REGISTRY: Record<ToolType, ToolStrategy> = {
    demote: new DemoteTool(),
    swap: new SwapTool(),
    purge: new PurgeTool(),
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
