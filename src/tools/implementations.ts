import { ToolStrategy } from './types';
import { ISortable, Move, ToolType, CardItem } from '../../types';

// Use shallow copy for performance and reference preservation
const copy = <T extends ISortable>(list: T[]): T[] => [...list];

export class DemoteTool implements ToolStrategy {
    type: ToolType = 'demote';
    requiresSelection = false;

    apply(list: ISortable[], index: number): ISortable[] {
        const newList = copy(list);
        if (index >= 0 && index < newList.length) {
            const [moved] = newList.splice(index, 1);
            newList.push(moved);
        }
        return newList;
    }

    isValid(list: ISortable[], index: number): boolean {
        return index >= 0 && index < list.length;
    }

    generateMoves(list: ISortable[]): Move[] {
        const moves: Move[] = [];
        for (let i = 0; i < list.length - 1; i++) {
            moves.push({ tool: this.type, index: i, description: `Demote item at index ${i}` });
        }
        return moves;
    }
}

export class PromoteTool implements ToolStrategy {
    type: ToolType = 'promote';
    requiresSelection = false;

    apply(list: ISortable[], index: number): ISortable[] {
        const newList = copy(list);
        if (index >= 0 && index < newList.length) {
            const [moved] = newList.splice(index, 1);
            newList.unshift(moved);
        }
        return newList;
    }

    isValid(list: ISortable[], index: number): boolean {
        return index >= 0 && index < list.length;
    }

    generateMoves(list: ISortable[]): Move[] {
        const moves: Move[] = [];
        for (let i = 1; i < list.length; i++) {
            moves.push({ tool: this.type, index: i, description: `Promote item at index ${i}` });
        }
        return moves;
    }
}


export class PurgeTool implements ToolStrategy {
    type: ToolType = 'purge';
    requiresSelection = false;

    apply(list: ISortable[], index: number): ISortable[] {
        const newList = copy(list);
        if (index >= 0 && index < newList.length) {
            // Soft Delete: Set status to eliminated instead of splicing
            const item = newList[index] as unknown as CardItem;
            // Assuming the consumer handles the cast or check
            newList[index] = { ...newList[index], status: 'eliminated' } as any;
        }
        return newList;
    }

    isValid(list: ISortable[], index: number): boolean {
        return index >= 0 && index < list.length;
    }

    generateMoves(list: ISortable[]): Move[] {
        const moves: Move[] = [];
        for (let i = 0; i < list.length; i++) {
            moves.push({ tool: this.type, index: i, description: `Purge item at index ${i}` });
        }
        return moves;
    }
}

export class SwapTool implements ToolStrategy {
    type: ToolType = 'swap';
    requiresSelection = true;

    apply(list: ISortable[], index: number, selection?: number): ISortable[] {
        const newList = copy(list);
        if (selection !== undefined && selection !== null) {
            if (index >= 0 && index < list.length && selection >= 0 && selection < list.length) {
                [newList[selection], newList[index]] = [newList[index], newList[selection]];
            }
        } else {
            if (index < newList.length - 1 && index >= 0) {
                [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
            }
        }
        return newList;
    }

    isValid(list: ISortable[], index: number, selection?: number): boolean {
        if (selection === undefined || selection === null) return index >= 0 && index < list.length;
        return Math.abs(index - selection) === 1;
    }

    generateMoves(list: ISortable[]): Move[] {
        const moves: Move[] = [];
        for (let i = 0; i < list.length - 1; i++) {
            moves.push({ tool: this.type, index: i, description: `Swap items at index ${i} and ${i + 1}` });
        }
        return moves;
    }
}

export class LongSwapTool implements ToolStrategy {
    type: ToolType = 'longswap';
    requiresSelection = true;

    apply(list: ISortable[], index: number, selection?: number): ISortable[] {
        const newList = copy(list);
        if (selection !== undefined && selection !== null) {
            if (index >= 0 && index < list.length && selection >= 0 && selection < list.length) {
                [newList[selection], newList[index]] = [newList[index], newList[selection]];
            }
        }
        return newList;
    }

    isValid(list: ISortable[], index: number, selection?: number): boolean {
        if (selection === undefined || selection === null) return index >= 0 && index < list.length;
        return Math.abs(index - selection) > 1;
    }

    generateMoves(list: ISortable[]): Move[] {
        const moves: Move[] = [];
        for (let i = 0; i < list.length - 2; i++) {
            for (let j = i + 2; j < list.length; j++) {
                moves.push({ tool: this.type, index: i, targetIndex: j, description: `Long Swap ${i} and ${j}` });
            }
        }
        return moves;
    }
}

export class TransferTool implements ToolStrategy {
    type: ToolType = 'transfer';
    requiresSelection = true;

    apply(list: ISortable[], index: number, selection?: number): ISortable[] {
        const newList = copy(list);
        if (selection !== undefined && selection !== null) {
            if (index >= 0 && index < list.length && selection >= 0 && selection < list.length) {
                // Logic: Decrease Selection by 2, Increase Target (Index) by 2
                newList[selection] = { ...newList[selection], val: newList[selection].val - 2 };
                newList[index] = { ...newList[index], val: newList[index].val + 2 };
            }
        }
        return newList;
    }

    isValid(list: ISortable[], index: number, selection?: number): boolean {
        if (selection === undefined || selection === null) return index >= 0 && index < list.length;
        // Target must be non-adjacent (>1 distance)
        return Math.abs(index - selection) > 1;
    }

    generateMoves(list: ISortable[]): Move[] {
        const moves: Move[] = [];
        // Generate potential moves for solver
        for (let i = 0; i < list.length; i++) {
            for (let j = 0; j < list.length; j++) {
                if (Math.abs(i - j) > 1) {
                    moves.push({ tool: this.type, index: j, targetIndex: i, description: `Transfer from ${i} to ${j}` });
                }
            }
        }
        return moves;
    }
}

export class SinkTool implements ToolStrategy {
    type: ToolType = 'sink';
    requiresSelection = true;

    apply(list: ISortable[], index: number, selection?: number): ISortable[] {
        const newList = copy(list);
        let idx1 = index;
        let idx2 = index + 1;

        if (selection !== undefined && selection !== null) {
            idx1 = index;
            idx2 = selection;
        }

        if (idx1 >= 0 && idx1 < newList.length && idx2 >= 0 && idx2 < newList.length) {
            const min = Math.min(newList[idx1].val, newList[idx2].val);
            newList[idx1] = { ...newList[idx1], val: min };
            newList[idx2] = { ...newList[idx2], val: min };
        }
        return newList;
    }

    isValid(list: ISortable[], index: number, selection?: number): boolean {
        if (selection === undefined || selection === null) return index >= 0 && index < list.length;
        return Math.abs(index - selection) === 1;
    }

    generateMoves(list: ISortable[]): Move[] {
        const moves: Move[] = [];
        for (let i = 0; i < list.length - 1; i++) {
            moves.push({ tool: this.type, index: i, description: `Sink items at index ${i}` });
        }
        return moves;
    }
}

export class HalveTool implements ToolStrategy {
    type: ToolType = 'halve';
    requiresSelection = false;

    apply(list: ISortable[], index: number): ISortable[] {
        const newList = copy(list);
        if (index >= 0 && index < newList.length) {
            newList[index] = { ...newList[index], val: Math.floor(newList[index].val / 2) };
        }
        return newList;
    }

    isValid(list: ISortable[], index: number): boolean {
        return index >= 0 && index < list.length;
    }

    generateMoves(list: ISortable[]): Move[] {
        const moves: Move[] = [];
        for (let i = 0; i < list.length; i++) {
            moves.push({ tool: this.type, index: i, description: `Halve item at index ${i}` });
        }
        return moves;
    }
}

export class ShieldTool implements ToolStrategy {
    type: ToolType = 'shield';
    requiresSelection = false;

    apply(list: ISortable[], index: number): ISortable[] {
        const newList = copy(list);
        // Valid if index > 0 (can sacrifice left neighbor)
        if (index > 0 && index < newList.length) {
            // Apply shield to the target item BEFORE removing the neighbor
            // This ensures the item we want to keep gets the shield
            newList[index] = { ...newList[index], hasShield: true };

            // Remove the left neighbor (index - 1)
            newList.splice(index - 1, 1);
        }
        return newList;
    }

    isValid(list: ISortable[], index: number): boolean {
        // Must have a left neighbor to sacrifice
        return index > 0 && index < list.length;
    }

    generateMoves(list: ISortable[]): Move[] {
        const moves: Move[] = [];
        for (let i = 1; i < list.length; i++) {
            moves.push({ tool: this.type, index: i, description: `Shield item at index ${i} (Sacrifice ${i - 1})` });
        }
        return moves;
    }
}

export class ShrinkTool implements ToolStrategy {
    type: ToolType = 'shrink';
    requiresSelection = false;

    apply(list: ISortable[], index: number): ISortable[] {
        const newList = copy(list);
        if (index >= 0 && index < newList.length) {
            newList[index] = { ...newList[index], val: newList[index].val - 3 };
        }
        return newList;
    }

    isValid(list: ISortable[], index: number): boolean {
        return index >= 0 && index < list.length;
    }

    generateMoves(list: ISortable[]): Move[] {
        const moves: Move[] = [];
        for (let i = 0; i < list.length; i++) {
            moves.push({ tool: this.type, index: i, description: `Shrink item at index ${i}` });
        }
        return moves;
    }
}

export class HopTool implements ToolStrategy {
    type: ToolType = 'hop';
    requiresSelection = false;

    apply(list: ISortable[], index: number): ISortable[] {
        const newList = copy(list);
        if (index > 0 && index < newList.length - 1) {
            [newList[index - 1], newList[index + 1]] = [newList[index + 1], newList[index - 1]];
        }
        return newList;
    }

    isValid(list: ISortable[], index: number): boolean {
        return index > 0 && index < list.length - 1;
    }

    generateMoves(list: ISortable[]): Move[] {
        const moves: Move[] = [];
        for (let i = 1; i < list.length - 1; i++) {
            moves.push({ tool: this.type, index: i, description: `Hop around index ${i}` });
        }
        return moves;
    }
}

export class MirrorTool implements ToolStrategy {
    type: ToolType = 'mirror';
    requiresSelection = false;

    apply(list: ISortable[], index: number): ISortable[] {
        const newList = copy(list);
        if (index >= 0 && index < newList.length) {
            const mirrorIdx = newList.length - 1 - index;
            if (mirrorIdx !== index) {
                [newList[index], newList[mirrorIdx]] = [newList[mirrorIdx], newList[index]];
            }
        }
        return newList;
    }

    isValid(list: ISortable[], index: number): boolean {
        if (index < 0 || index >= list.length) return false;
        const mirrorIdx = list.length - 1 - index;
        return mirrorIdx !== index;
    }

    generateMoves(list: ISortable[]): Move[] {
        const moves: Move[] = [];
        for (let i = 0; i < list.length; i++) {
            const mirrorIdx = list.length - 1 - i;
            if (i === mirrorIdx) continue;
            if (i > mirrorIdx) continue; // Optimization from original solver

            moves.push({ tool: this.type, index: i, description: `Mirror swp ${i} and ${mirrorIdx}` });
        }
        return moves;
    }
}

export class CycleTool implements ToolStrategy {
    type: ToolType = 'cycle';
    requiresSelection = true;

    apply(list: ISortable[], index: number, selection?: number): ISortable[] {
        const newList = copy(list);

        // Safety checks
        if (selection === undefined || selection === null) return newList;
        if (selection < 1 || selection >= newList.length - 1) return newList;

        // Define block indices based on selection (Middle)
        const leftIdx = selection - 1;
        const midIdx = selection;
        const rightIdx = selection + 1;

        // Ensure target is valid relative to selection
        // Determine direction based on target index
        // Target index corresponds to the second click.

        // Cycle Right: A->B, B->C, C->A.  (Click Middle then Forward/Right)
        // Block: [A, B, C] at [left, mid, right]
        // Result: [C, A, B]
        if (index === rightIdx) {
            const tempLeft = newList[leftIdx];
            const tempMid = newList[midIdx];
            const tempRight = newList[rightIdx];

            newList[leftIdx] = tempRight; // C -> A position
            newList[midIdx] = tempLeft;   // A -> B position
            newList[rightIdx] = tempMid;  // B -> C position
        }
        // Cycle Left: (Click Middle then Back/Left)
        // Block: [A, B, C]
        // Result: [B, C, A] (Inverse of Right)
        // Middle(B) goes Left(A).
        else if (index === leftIdx) {
            const tempLeft = newList[leftIdx];
            const tempMid = newList[midIdx];
            const tempRight = newList[rightIdx];

            newList[leftIdx] = tempMid;   // B -> A position
            newList[midIdx] = tempRight;  // C -> B position
            newList[rightIdx] = tempLeft; // A -> C position
        }

        return newList;
    }

    isValid(list: ISortable[], index: number, selection?: number): boolean {
        // Selection must be a valid middle card (has neighbors)
        if (selection === undefined || selection === null) return false; // Though engine usually handles null selection before calling isValid
        if (selection < 1 || selection >= list.length - 1) return false;

        // Target must be adjacent to selection
        return Math.abs(index - selection) === 1;
    }

    generateMoves(list: ISortable[]): Move[] {
        const moves: Move[] = [];
        for (let i = 1; i < list.length - 1; i++) {
            // For each valid middle index i
            // Generate Right Cycle (target i+1)
            moves.push({ tool: this.type, index: i + 1, targetIndex: i, description: `Cycle Right at ${i}` });
            // Generate Left Cycle (target i-1)
            moves.push({ tool: this.type, index: i - 1, targetIndex: i, description: `Cycle Left at ${i}` });
        }
        return moves;
    }
}

export class EqualizeTool implements ToolStrategy {
    type: ToolType = 'equalize';
    requiresSelection = true;

    apply(list: ISortable[], index: number, selection?: number): ISortable[] {
        const newList = copy(list);
        if (selection !== undefined && selection !== null) {
            if (index >= 0 && index < list.length && selection >= 0 && selection < list.length) {
                const avg = Math.floor((newList[index].val + newList[selection].val) / 2);
                newList[index] = { ...newList[index], val: avg };
                newList[selection] = { ...newList[selection], val: avg };
            }
        }
        return newList;
    }

    isValid(list: ISortable[], index: number, selection?: number): boolean {
        if (selection === undefined || selection === null) return index >= 0 && index < list.length;
        return Math.abs(index - selection) > 1;
    }

    generateMoves(list: ISortable[]): Move[] {
        const moves: Move[] = [];
        for (let i = 0; i < list.length - 2; i++) {
            for (let j = i + 2; j < list.length; j++) {
                moves.push({ tool: this.type, index: i, targetIndex: j, description: `Equalize ${i} and ${j}` });
            }
        }
        return moves;
    }
}
