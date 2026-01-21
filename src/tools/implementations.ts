import { ToolStrategy } from './types';
import { ISortable, Move, ToolType } from '../../types';

// Use shallow copy for performance and reference preservation
const copy = <T extends ISortable>(list: T[]): T[] => [...list];

export class DemoteTool implements ToolStrategy {
    type: ToolType = 'demote';
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
            newList.splice(index, 1);
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
                [newList[index], newList[index+1]] = [newList[index+1], newList[index]];
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
            moves.push({ tool: this.type, index: i, description: `Swap items at index ${i} and ${i+1}` });
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

export class MergeTool implements ToolStrategy {
    type: ToolType = 'merge';
    requiresSelection = true;

    apply(list: ISortable[], index: number, selection?: number): ISortable[] {
        const newList = copy(list);
        let firstIdx = index;
        if (selection !== undefined && selection !== null) {
            firstIdx = Math.min(index, selection);
        }

        if (firstIdx >= 0 && firstIdx < newList.length - 1) {
            const sum = newList[firstIdx].val + newList[firstIdx+1].val;
            newList[firstIdx] = { ...newList[firstIdx], val: sum };
            newList.splice(firstIdx + 1, 1);
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
             moves.push({ tool: this.type, index: i, description: `Merge items at index ${i}` });
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

export class FloatTool implements ToolStrategy {
    type: ToolType = 'float';
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
            const max = Math.max(newList[idx1].val, newList[idx2].val);
            newList[idx1] = { ...newList[idx1], val: max };
            newList[idx2] = { ...newList[idx2], val: max };
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
             moves.push({ tool: this.type, index: i, description: `Float items at index ${i}` });
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
        if (index >= 0 && index < newList.length) {
            newList[index] = { ...newList[index], hasShield: true };
        }
        return newList;
    }

    isValid(list: ISortable[], index: number): boolean {
        return index >= 0 && index < list.length;
    }

    generateMoves(list: ISortable[]): Move[] {
        const moves: Move[] = [];
        for (let i = 0; i < list.length; i++) {
             moves.push({ tool: this.type, index: i, description: `Shield item at index ${i}` });
        }
        return moves;
    }
}

export class GrowTool implements ToolStrategy {
    type: ToolType = 'grow';
    requiresSelection = false;

    apply(list: ISortable[], index: number): ISortable[] {
        const newList = copy(list);
        if (index >= 0 && index < newList.length) {
            newList[index] = { ...newList[index], val: newList[index].val + 3 };
        }
        return newList;
    }

    isValid(list: ISortable[], index: number): boolean {
        return index >= 0 && index < list.length;
    }

    generateMoves(list: ISortable[]): Move[] {
        const moves: Move[] = [];
        for (let i = 0; i < list.length; i++) {
             moves.push({ tool: this.type, index: i, description: `Grow item at index ${i}` });
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
