import { CardItem, ToolType, GamePhase, ToolInstance } from '../../types';
import { ALL_TOOL_TYPES } from '../constants';

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
export const calculateBatchScore = (numbers: number[]): number => {
  if (!numbers || numbers.length === 0) return 0;
  
  let score = 0;
  let lastSurvivor = 0;
  let mode: 'ASC' | 'DESC' | null = null;

  // Iterate
  for (let i = 0; i < numbers.length; i++) {
    const currentVal = numbers[i];
    let survived = false;

    if (i === 0) {
      survived = true;
      lastSurvivor = currentVal;
    } else if (i === 1) {
      survived = true;
      // Determine mode based on first two items
      if (currentVal >= lastSurvivor) mode = 'ASC';
      else mode = 'DESC';
    } else {
      // i > 1
      const effectiveMode = mode || 'ASC'; // Default to ASC if undefined (though i=1 handles it)
      if (effectiveMode === 'ASC') {
        if (currentVal >= lastSurvivor) survived = true;
      } else {
        if (currentVal <= lastSurvivor) survived = true;
      }
    }

    if (survived) {
      score += currentVal; // Scoring: Value of the survivor
      lastSurvivor = currentVal;
    }
  }
  return score;
};

// Evaluate list to produce final scored items (for visual restoration)
export const gradeLevel = (list: CardItem[]): { score: number, gradedList: CardItem[] } => {
  const gradedList = list.map(item => ({ ...item })); // Clone
  if (gradedList.length === 0) return { score: 0, gradedList };

  let score = 0;
  let lastSurvivor = 0;
  let mode: 'ASC' | 'DESC' | null = null;

  for (let i = 0; i < gradedList.length; i++) {
    const item = gradedList[i];
    const currentVal = item.val;
    let survived = false;

    if (i === 0) {
      survived = true;
      lastSurvivor = currentVal;
    } else if (i === 1) {
      survived = true;
      if (currentVal >= lastSurvivor) mode = 'ASC';
      else mode = 'DESC';
    } else {
      const effectiveMode = mode || 'ASC';
      if (effectiveMode === 'ASC') {
        if (currentVal >= lastSurvivor) survived = true;
      } else {
        if (currentVal <= lastSurvivor) survived = true;
      }
    }

    if (survived) {
      score += currentVal;
      lastSurvivor = currentVal;
      item.status = 'safe';
      item.linkScore = currentVal;
    } else {
      item.status = 'eliminated';
      item.linkScore = null;
    }
  }

  return { score, gradedList };
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
  const initialNums = startList.map(item => item.val);
  
  let maxScore = -1; // Start with -1 to ensure we pick up 0 score if that's the best
  let bestMoves: Move[] = [];

  const search = (currentNums: number[], currentTools: ToolType[], currentMoves: Move[]) => {
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
          const nextNums = [...currentNums];
          nextNums.splice(i, 1);
          search(nextNums, nextTools, [...currentMoves, { tool: 'purge', index: i, description: `Purge item at index ${i}` }]);
        }
      } 
      else if (tool === 'demote') { 
        for (let i = 1; i < currentNums.length; i++) {
          const nextNums = [...currentNums];
          const [moved] = nextNums.splice(i, 1);
          nextNums.unshift(moved);
          search(nextNums, nextTools, [...currentMoves, { tool: 'demote', index: i, description: `Demote item at index ${i}` }]);
        }
      }
      else if (tool === 'promote') {
        for (let i = 0; i < currentNums.length - 1; i++) {
          const nextNums = [...currentNums];
          const [moved] = nextNums.splice(i, 1);
          nextNums.push(moved);
          search(nextNums, nextTools, [...currentMoves, { tool: 'promote', index: i, description: `Promote item at index ${i}` }]);
        }
      }
      else if (tool === 'swap') {
        for (let i = 0; i < currentNums.length - 1; i++) {
          const nextNums = [...currentNums];
          [nextNums[i], nextNums[i+1]] = [nextNums[i+1], nextNums[i]];
          search(nextNums, nextTools, [...currentMoves, { tool: 'swap', index: i, description: `Swap items at index ${i} and ${i+1}` }]);
        }
      }
      else if (tool === 'halve') {
        for (let i = 0; i < currentNums.length; i++) {
          const nextNums = [...currentNums];
          nextNums[i] = Math.floor(nextNums[i] / 2);
          search(nextNums, nextTools, [...currentMoves, { tool: 'halve', index: i, description: `Halve item at index ${i}` }]);
        }
      }
      else if (tool === 'merge') {
        for (let i = 0; i < currentNums.length - 1; i++) {
          const nextNums = [...currentNums];
          const sum = nextNums[i] + nextNums[i+1];
          nextNums.splice(i, 2, sum); // Remove 2 items, insert sum
          search(nextNums, nextTools, [...currentMoves, { tool: 'merge', index: i, description: `Merge items at index ${i}` }]);
        }
      }
      else if (tool === 'sink') {
        for (let i = 0; i < currentNums.length - 1; i++) {
          const nextNums = [...currentNums];
          const min = Math.min(nextNums[i], nextNums[i+1]);
          nextNums[i] = min;
          nextNums[i+1] = min;
          search(nextNums, nextTools, [...currentMoves, { tool: 'sink', index: i, description: `Sink items at index ${i}` }]);
        }
      } else if (tool === 'float') {
        for (let i = 0; i < currentNums.length - 1; i++) {
          const nextNums = [...currentNums];
          const max = Math.max(nextNums[i], nextNums[i+1]);
          nextNums[i] = max;
          nextNums[i+1] = max;
          search(nextNums, nextTools, [...currentMoves, { tool: 'float', index: i, description: `Float items at index ${i}` }]);
        }
      }
      else if (tool === 'longswap') {
        // Swap any non-adjacent items
        // i from 0 to N-3
        // j from i+2 to N-1
        for (let i = 0; i < currentNums.length - 2; i++) {
          for (let j = i + 2; j < currentNums.length; j++) {
             const nextNums = [...currentNums];
             [nextNums[i], nextNums[j]] = [nextNums[j], nextNums[i]];
             search(nextNums, nextTools, [...currentMoves, { tool: 'longswap', index: i, targetIndex: j, description: `Long Swap ${i} and ${j}` }]);
          }
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
export const applyMove = (list: CardItem[], tool: ToolType, index: number, selection?: number | null): CardItem[] => {
    let newList = [...list];

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
         // App Mode: merge selection and index (must be adjacent)
         // Solver Mode: merge index and index+1
         let firstIdx = index;
         if (selection !== undefined && selection !== null) {
             firstIdx = Math.min(index, selection);
             // Ensure adjacency check happens in UI logic, here we just execute
         }

         if (firstIdx < newList.length - 1) {
            const sum = newList[firstIdx].val + newList[firstIdx+1].val;
            // Create new item, remove both
            // We reuse the ID of the first one? Or create new?
            // Reusing ID of first is fine for React keys as long as second is removed.
            const newItem = { ...newList[firstIdx], val: sum };
            newList.splice(firstIdx, 2, newItem);
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
        } else {
             // Solver passes targetIndex in `selection`?
             // Wait, applyMove signature has `selection?: number`.
             // In Solver loop: `index: i, targetIndex: j`.
             // `findOptimalSolution` stores `targetIndex`.
             // So when replaying moves (SolverApp), we should pass targetIndex as selection.
             if (selection !== undefined && selection !== null) {
                [newList[selection], newList[index]] = [newList[index], newList[selection]];
             } else {
                 // Fallback if no target provided (shouldn't happen for valid longswap move)
             }
        }
    }
    return newList;
};

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
