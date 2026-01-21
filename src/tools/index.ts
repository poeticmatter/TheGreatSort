import { ToolType } from '../../types';
import { ToolStrategy } from './types';
import {
    DemoteTool, SwapTool, PurgeTool, PromoteTool,
    LongSwapTool, MergeTool, SinkTool, FloatTool,
    HalveTool, ShieldTool, GrowTool, ShrinkTool,
    HopTool, MirrorTool
} from './implementations';

export const TOOL_REGISTRY: Record<ToolType, ToolStrategy> = {
    demote: new DemoteTool(),
    swap: new SwapTool(),
    purge: new PurgeTool(),
    promote: new PromoteTool(),
    longswap: new LongSwapTool(),
    merge: new MergeTool(),
    sink: new SinkTool(),
    float: new FloatTool(),
    halve: new HalveTool(),
    shield: new ShieldTool(),
    grow: new GrowTool(),
    shrink: new ShrinkTool(),
    hop: new HopTool(),
    mirror: new MirrorTool(),
};
