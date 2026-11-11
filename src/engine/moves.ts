import { TOOL_REGISTRY } from './tools/index.ts';
import { ISortable, ToolType } from './types.ts';

export interface MoveResult<T> {
  newList: T[];
  impactedIndices: number[];
}

// Tools whose second pick is reported as impacted alongside the first.
const TOOLS_IMPACTING_SELECTION: ReadonlySet<ToolType> = new Set<ToolType>(['transfer', 'swap']);

/** Applies a tool to a sequence, returning the new sequence and the positions it touched. */
export function applyMove<T extends ISortable>(list: T[], tool: ToolType, index: number, selection?: number | null): MoveResult<T> {
  const strategy = TOOL_REGISTRY[tool];
  if (!strategy) return { newList: list, impactedIndices: [] };

  const hasSelection = selection !== undefined && selection !== null;
  // ToolStrategy is typed on ISortable; tools only spread or reorder the items
  // they are given, so the caller's richer item type survives.
  const newList = strategy.apply(list, index, hasSelection ? selection : undefined) as T[];

  const impactedIndices = hasSelection && TOOLS_IMPACTING_SELECTION.has(tool)
    ? [index, selection]
    : [index];

  return { newList, impactedIndices };
}
