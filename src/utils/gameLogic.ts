import { CardItem, ToolType, GamePhase } from '../../types';

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
export const findOptimalScore = (startList: CardItem[]): number => {
  const solution = findOptimalSolution(startList);
  return solution.score;
};

// Recursive Solver to find the optimal solution (score + path)
export const findOptimalSolution = (startList: CardItem[]): Solution => {
  const initialNums = startList.map(item => item.val);
  const initialTools: ToolType[] = ['swap', 'purge', 'promote', 'demote'];
  
  let maxScore = -1; // Start with -1 to ensure we pick up 0 score if that's the best
  let bestMoves: Move[] = [];

  const search = (currentNums: number[], availableTools: ToolType[], currentMoves: Move[]) => {
    const currentScore = calculateBatchScore(currentNums);
    if (currentScore > maxScore) {
      maxScore = currentScore;
      bestMoves = [...currentMoves];
    }

    if (availableTools.length === 0) return;

    for (let t = 0; t < availableTools.length; t++) {
      const tool = availableTools[t];
      const nextTools = [...availableTools];
      nextTools.splice(t, 1); 

      if (tool === 'purge') {
        for (let i = 0; i < currentNums.length; i++) {
          const nextNums = [...currentNums];
          nextNums.splice(i, 1);
          search(nextNums, nextTools, [...currentMoves, { tool: 'purge', index: i, description: `Purge item at index ${i}` }]);
        }
      } 
      else if (tool === 'demote') { 
        // Demote moves to START (Left)
        // Optimization: Moving index 0 to 0 is redundant, start at 1
        for (let i = 1; i < currentNums.length; i++) {
          const nextNums = [...currentNums];
          const [moved] = nextNums.splice(i, 1);
          nextNums.unshift(moved);
          search(nextNums, nextTools, [...currentMoves, { tool: 'demote', index: i, description: `Demote item at index ${i}` }]);
        }
      }
      else if (tool === 'promote') {
        // Promote moves to END (Right)
        // Optimization: Moving last to last is redundant
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
    }
  };

  search(initialNums, initialTools, []);
  return { score: maxScore, moves: bestMoves };
};

// Calculate level length based on level number
export const lengthFromLevel = (level: number): number => {
  // Cap length at 14 to prevent UI clutter and Solver blowout
  return Math.min(7 + Math.floor((level - 1) / 2), 14);
};

// Apply a move to a list and return the new list
export const applyMove = (list: CardItem[], tool: ToolType, index: number, selection?: number | null): CardItem[] => {
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
    else if (tool === 'swap') {
        // Check selection for swap
        // Logic for swap might differ slightly between app (interaction) and solver (moves)
        // In solver, swap is always i and i+1
        // In app, it depends on selection.
        // For general "applyMove", let's assume valid neighbor swap if selection is provided?
        // Actually, the App's executeMove handles the logic of "checking if neighbor".
        // Here we just want the transformation.
        // If selection is provided and index is different, swap them.
        // If selection is not provided, maybe assume index and index+1?
        // Let's mirror what SolverApp needs: index and index+1.

        // Wait, App has two clicks for swap. Solver has one move definition (index means index & index+1).

        if (selection !== undefined && selection !== null) {
            // App mode: swap selection and index
             [newList[selection], newList[index]] = [newList[index], newList[selection]];
        } else {
            // Solver/Simple mode: swap index and index+1
            if (index < newList.length - 1) {
                [newList[index], newList[index+1]] = [newList[index+1], newList[index]];
            }
        }
    }
    return newList;
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
