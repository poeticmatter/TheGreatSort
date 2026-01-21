import { ISortable, Move, ToolType } from '../../types';

export interface ToolStrategy {
    type: ToolType;
    requiresSelection: boolean;
    // For the Engine/Solver: Apply the change
    apply(list: ISortable[], index: number, selection?: number): ISortable[];
    // For the UI: Is this specific move valid?
    isValid(list: ISortable[], index: number, selection?: number): boolean;
    // For the Solver: Generate all valid moves for this state
    generateMoves(list: ISortable[]): Move[];
}
