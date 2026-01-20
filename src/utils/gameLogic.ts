import { CardItem, ToolType, GamePhase, ToolInstance, ISortable } from '../../types';
import { ALL_TOOL_TYPES } from '../constants';

export type SolverItem = ISortable;

export interface Move {
  tool: ToolType;
  index: number;
  targetIndex?: number;
  description: string;
}

export interface DailyState {
  date: string;
  moves: Move[];
  phase: GamePhase;
  tools: ToolInstance[];
}

export interface Solution {
  score: number;
  moves: Move[];
}

export interface InspectionYield {
  list: CardItem[];
  index: number;
  scoreDelta: number;
  detectedMode: 'ASC' | 'DESC' | null;
}

export function* createInspectionStream(initialList: CardItem[]): Generator<InspectionYield> {
  const list = initialList.map(item => ({ ...item }));
  let lastSurvivorVal: number | null = null;
  let lastSurvivorHasShield = false;
  let sortDirection: 'ASC' | 'DESC' | null = null;

  for (let i = 0; i < list.length; i++) {
    // 1. Yield Scanning State
    list[i] = { ...list[i], status: 'scanning' };
    yield {
      list: [...list],
      index: i,
      scoreDelta: 0,
      detectedMode: sortDirection
    };

    // 2. Process Logic
    const currentItem = list[i];
    const currentVal = currentItem.val;
    const currentHasShield = currentItem.hasShield || false;
    let survived = false;
    let pointsToAdd = 0;

    if (i === 0) {
      survived = true;
      lastSurvivorVal = currentVal;
      lastSurvivorHasShield = currentHasShield;
    } else if (i === 1) {
      survived = true;
      const prevVal = lastSurvivorVal!;
      if (currentVal >= prevVal) sortDirection = 'ASC';
      else sortDirection = 'DESC';
      lastSurvivorVal = currentVal;
      lastSurvivorHasShield = currentHasShield; // Update to current
    } else {
      if (lastSurvivorHasShield) {
        survived = true;
      } else {
        const threshold = lastSurvivorVal!;
        const mode = sortDirection || 'ASC';
        if (mode === 'ASC') {
          if (currentVal >= threshold) survived = true;
        } else {
          if (currentVal <= threshold) survived = true;
        }
      }

      if (survived) {
        lastSurvivorVal = currentVal;
        lastSurvivorHasShield = currentHasShield; // Update to current
      }
    }

    // 3. Update Result State
    if (survived) {
      pointsToAdd = currentVal;
      list[i] = { ...currentItem, status: 'safe', linkScore: pointsToAdd };
    } else {
      list[i] = { ...currentItem, status: 'eliminated' };
    }

    // 4. Yield Result
    yield {
      list: [...list],
      index: i,
      scoreDelta: pointsToAdd,
      detectedMode: sortDirection
    };
  }
}

// Simple PRNG (Mulberry32)
function mulberry32(a: number) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

export const stringToSeed = (str: string): number => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return h >>> 0;
};

// Pure function to calculate score for a given number array
// Pure function to calculate score for a given number array
export const calculateBatchScore = (numbers: ISortable[]): number => {
  if (!numbers || numbers.length === 0) return 0;
  
  let score = 0;
  let lastSurvivor = 0;
  let lastSurvivorHasShield = false;
  let mode: 'ASC' | 'DESC' | null = null;

  // Iterate
  for (let i = 0; i < numbers.length; i++) {
    const item = numbers[i];
    const currentVal = item.val;
    const currentHasShield = item.hasShield || false;
    let survived = false;

    if (i === 0) {
      survived = true;
      lastSurvivor = currentVal;
      lastSurvivorHasShield = currentHasShield;
    } else if (i === 1) {
      survived = true;
      // Determine mode based on first two items
      if (currentVal >= lastSurvivor) mode = 'ASC';
      else mode = 'DESC';
    } else {
      // Check if protected by previous survivor
      if (lastSurvivorHasShield) {
          survived = true;
      } else {
          // Normal logic
          const effectiveMode = mode || 'ASC';
          if (effectiveMode === 'ASC') {
            if (currentVal >= lastSurvivor) survived = true;
          } else {
            if (currentVal <= lastSurvivor) survived = true;
          }
      }
    }

    if (survived) {
      score += currentVal; // Scoring: Value of the survivor
      lastSurvivor = currentVal;
      lastSurvivorHasShield = currentHasShield;
    }
  }
  return score;
};

// Evaluate list to produce final scored items (for visual restoration)
export const gradeLevel = (list: CardItem[]): { score: number, gradedList: CardItem[] } => {
  if (list.length === 0) return { score: 0, gradedList: [] };

  const generator = createInspectionStream(list);
  let finalYield: InspectionYield | null = null;
  let totalScore = 0;

  let result = generator.next();
  while (!result.done) {
    finalYield = result.value;
    totalScore += finalYield.scoreDelta;
    result = generator.next();
  }

  // Use the list from the last yield, or original if empty
  const gradedList = finalYield ? finalYield.list : list;

  return { score: totalScore, gradedList };
};

// Recursive Solver to find the theoretical maximum score
export const findOptimalScore = (startList: CardItem[], availableTools?: ToolInstance[]): number => {
  // If no tools provided, default to standard set (legacy support or fallback)
  const defaultTools: ToolType[] = ['swap', 'purge', 'promote', 'demote'];
  const toolsToUse = availableTools ? availableTools.filter(t => !t.used).map(t => t.type) : defaultTools;

  const solution = findOptimalSolution(startList, toolsToUse);
  return solution.score;
};

// Recursive Solver to find the optimal solution (score + path)
// Note: availableTools here is a list of Types, representing the remaining usages.
export const findOptimalSolution = (startList: CardItem[], availableTools: ToolType[]): Solution => {
  // Convert to SolverItem for potentially rich state
  const initialNums: SolverItem[] = startList.map(item => ({ val: item.val, hasShield: item.hasShield }));
  
  let maxScore = -1; // Start with -1 to ensure we pick up 0 score if that's the best
  let bestMoves: Move[] = [];

  const search = (currentNums: SolverItem[], currentTools: ToolType[], currentMoves: Move[]) => {
    const currentScore = calculateBatchScore(currentNums);
    if (currentScore > maxScore) {
      maxScore = currentScore;
      bestMoves = [...currentMoves];
    }

    if (currentTools.length === 0) return;

    for (let t = 0; t < currentTools.length; t++) {
      const tool = currentTools[t];
      const nextTools = [...currentTools];
      nextTools.splice(t, 1); 

      if (tool === 'purge') {
        for (let i = 0; i < currentNums.length; i++) {
          const nextNums = applyMove(currentNums, 'purge', i);
          search(nextNums, nextTools, [...currentMoves, { tool: 'purge', index: i, description: `Purge item at index ${i}` }]);
        }
      } 
      else if (tool === 'demote') { 
        for (let i = 1; i < currentNums.length; i++) {
          const nextNums = applyMove(currentNums, 'demote', i);
          search(nextNums, nextTools, [...currentMoves, { tool: 'demote', index: i, description: `Demote item at index ${i}` }]);
        }
      }
      else if (tool === 'promote') {
        for (let i = 0; i < currentNums.length - 1; i++) {
          const nextNums = applyMove(currentNums, 'promote', i);
          search(nextNums, nextTools, [...currentMoves, { tool: 'promote', index: i, description: `Promote item at index ${i}` }]);
        }
      }
      else if (tool === 'swap') {
        for (let i = 0; i < currentNums.length - 1; i++) {
          const nextNums = applyMove(currentNums, 'swap', i);
          search(nextNums, nextTools, [...currentMoves, { tool: 'swap', index: i, description: `Swap items at index ${i} and ${i+1}` }]);
        }
      }
      else if (tool === 'halve') {
        for (let i = 0; i < currentNums.length; i++) {
          const nextNums = applyMove(currentNums, 'halve', i);
          search(nextNums, nextTools, [...currentMoves, { tool: 'halve', index: i, description: `Halve item at index ${i}` }]);
        }
      }
      else if (tool === 'merge') {
        for (let i = 0; i < currentNums.length - 1; i++) {
          const nextNums = applyMove(currentNums, 'merge', i);
          search(nextNums, nextTools, [...currentMoves, { tool: 'merge', index: i, description: `Merge items at index ${i}` }]);
        }
      }
      else if (tool === 'sink') {
        for (let i = 0; i < currentNums.length - 1; i++) {
          const nextNums = applyMove(currentNums, 'sink', i);
          search(nextNums, nextTools, [...currentMoves, { tool: 'sink', index: i, description: `Sink items at index ${i}` }]);
        }
      } else if (tool === 'float') {
        for (let i = 0; i < currentNums.length - 1; i++) {
          const nextNums = applyMove(currentNums, 'float', i);
          search(nextNums, nextTools, [...currentMoves, { tool: 'float', index: i, description: `Float items at index ${i}` }]);
        }
      }
      else if (tool === 'longswap') {
        // Swap any non-adjacent items
        // i from 0 to N-3
        // j from i+2 to N-1
        for (let i = 0; i < currentNums.length - 2; i++) {
          for (let j = i + 2; j < currentNums.length; j++) {
             const nextNums = applyMove(currentNums, 'longswap', i, j);
             search(nextNums, nextTools, [...currentMoves, { tool: 'longswap', index: i, targetIndex: j, description: `Long Swap ${i} and ${j}` }]);
          }
        }
      }
      else if (tool === 'grow') {
          for (let i = 0; i < currentNums.length; i++) {
              const nextNums = applyMove(currentNums, 'grow', i);
              search(nextNums, nextTools, [...currentMoves, { tool: 'grow', index: i, description: `Grow item at index ${i}` }]);
          }
      }
      else if (tool === 'shrink') {
          for (let i = 0; i < currentNums.length; i++) {
              const nextNums = applyMove(currentNums, 'shrink', i);
              search(nextNums, nextTools, [...currentMoves, { tool: 'shrink', index: i, description: `Shrink item at index ${i}` }]);
          }
      }
      else if (tool === 'shield') {
          for (let i = 0; i < currentNums.length; i++) {
              const nextNums = applyMove(currentNums, 'shield', i);
              search(nextNums, nextTools, [...currentMoves, { tool: 'shield', index: i, description: `Shield item at index ${i}` }]);
          }
      }
      else if (tool === 'hop') {
          // Can select any item NOT at start or end
          for (let i = 1; i < currentNums.length - 1; i++) {
              const nextNums = applyMove(currentNums, 'hop', i);
              search(nextNums, nextTools, [...currentMoves, { tool: 'hop', index: i, description: `Hop around index ${i}` }]);
          }
      }
      else if (tool === 'mirror') {
          for (let i = 0; i < currentNums.length; i++) {
              const mirrorIdx = currentNums.length - 1 - i;
              if (i === mirrorIdx) continue; // Cannot mirror middle item
              // Optimization: Mirror(i) and Mirror(mirrorIdx) are same result. Only search first half?
              // However, user might click either. For solver, strictly we only need to branch once per unique state.
              if (i > mirrorIdx) continue; 
              
              const nextNums = applyMove(currentNums, 'mirror', i);
              search(nextNums, nextTools, [...currentMoves, { tool: 'mirror', index: i, description: `Mirror swp ${i} and ${mirrorIdx}` }]);
          }
      }
    }
  };

  search(initialNums, availableTools, []);
  return { score: maxScore, moves: bestMoves };
};

// Calculate level length based on level number
export const lengthFromLevel = (level: number): number => {
  // Cap length at 14 to prevent UI clutter and Solver blowout
  return Math.min(7 + Math.floor((level - 1) / 2), 14);
};

// Apply a move to a list and return the new list
export function applyMove<T extends ISortable>(list: T[], tool: ToolType, index: number, selection?: number | null): T[] {
    const newList = [...list];

    if (tool === 'purge') {
        newList.splice(index, 1);
    }
    else if (tool === 'demote') {
        const [moved] = newList.splice(index, 1);
        newList.unshift(moved);
    }
    else if (tool === 'promote') {
        const [moved] = newList.splice(index, 1);
        newList.push(moved);
    }
    else if (tool === 'halve') {
        newList[index] = { ...newList[index], val: Math.floor(newList[index].val / 2) };
    }
    else if (tool === 'merge') {
         let firstIdx = index;
         if (selection !== undefined && selection !== null) {
             firstIdx = Math.min(index, selection);
         }

         if (firstIdx < newList.length - 1) {
            const sum = newList[firstIdx].val + newList[firstIdx+1].val;
            // When merging, we conceptually merge two items into one.
            // For CardItems, we need to preserve the identity of the first one?
            // The instruction says "preserve other properties (e.g., newList[i] = { ...newList[i], val: newVal })"
            // For merge, we are removing one item.
            // For the remaining item (firstIdx), we update its value.
            // And remove the next item.

            newList[firstIdx] = { ...newList[firstIdx], val: sum };
            newList.splice(firstIdx + 1, 1);
         }
    }
    else if (tool === 'sink') {
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
    }
    else if (tool === 'float') {
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
    }
    else if (tool === 'swap') {
        if (selection !== undefined && selection !== null) {
             [newList[selection], newList[index]] = [newList[index], newList[selection]];
        } else {
            if (index < newList.length - 1) {
                [newList[index], newList[index+1]] = [newList[index+1], newList[index]];
            }
        }
    }
    else if (tool === 'longswap') {
        if (selection !== undefined && selection !== null) {
             [newList[selection], newList[index]] = [newList[index], newList[selection]];
        }
    }
    else if (tool === 'grow') {
        newList[index] = { ...newList[index], val: newList[index].val + 3 };
    }
    else if (tool === 'shrink') {
        newList[index] = { ...newList[index], val: newList[index].val - 3 };
    }
    else if (tool === 'shield') {
        newList[index] = { ...newList[index], hasShield: true };
    }
    else if (tool === 'hop') {
        if (index > 0 && index < newList.length - 1) {
             [newList[index - 1], newList[index + 1]] = [newList[index + 1], newList[index - 1]];
        }
    }
    else if (tool === 'mirror') {
        const mirrorIdx = newList.length - 1 - index;
        if (mirrorIdx !== index) {
             [newList[index], newList[mirrorIdx]] = [newList[mirrorIdx], newList[index]];
        }
    }
    return newList;
}

// Generate 4 tools from the pool
export const generateTools = (seed?: number): ToolInstance[] => {
    const random = seed !== undefined ? mulberry32(seed + 9999) : Math.random; // Offset seed slightly to not correlate with level gen
    const tools: ToolInstance[] = [];

    // Pick 4 tools allowing duplicates
    for (let i = 0; i < 4; i++) {
        const typeIdx = Math.floor(random() * ALL_TOOL_TYPES.length);
        const type = ALL_TOOL_TYPES[typeIdx] as ToolType;
        tools.push({
            instanceId: `tool-${i}-${Math.random().toString(36).substr(2, 5)}`,
            type: type,
            used: false
        });
    }
    return tools;
};

// Utility to generate random levels
export const generateLevel = (length: number, seed?: number): CardItem[] => {
  // Setup Random Generator
  const random = seed !== undefined ? mulberry32(seed) : Math.random;

  // Generate numbers from 1 to N*2
  const maxVal = length * 2;
  const pool = Array.from({ length: maxVal }, (_, i) => i + 1);
  
  // Fisher-Yates Shuffle the pool
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Select the first 'length' numbers
  const numbers = pool.slice(0, length);

  return numbers.map(val => {
    // We also want deterministic IDs if seeded, to avoid hydration mismatches or randomness
    const idSuffix = seed !== undefined
      ? Math.floor(random() * 1000000).toString(36)
      : Math.random().toString(36).substring(2, 9);

    return {
      id: idSuffix,
      val: val,
      status: 'pending',
      linkScore: null
    };
  });
};
