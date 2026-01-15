import { CardItem, ToolType } from '../types';

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

// Recursive Solver to find the theoretical maximum score
export const findOptimalScore = (startList: CardItem[]): number => {
  const initialNums = startList.map(item => item.val);
  const initialTools: ToolType[] = ['swap', 'purge', 'promote', 'demote'];
  
  let maxScore = 0;

  const search = (currentNums: number[], availableTools: ToolType[]) => {
    const currentScore = calculateBatchScore(currentNums);
    if (currentScore > maxScore) maxScore = currentScore;

    if (availableTools.length === 0) return;

    for (let t = 0; t < availableTools.length; t++) {
      const tool = availableTools[t];
      const nextTools = [...availableTools];
      nextTools.splice(t, 1); 

      if (tool === 'purge') {
        for (let i = 0; i < currentNums.length; i++) {
          const nextNums = [...currentNums];
          nextNums.splice(i, 1);
          search(nextNums, nextTools);
        }
      } 
      else if (tool === 'demote') { 
        // Demote moves to START (Left)
        // Optimization: Moving index 0 to 0 is redundant, start at 1
        for (let i = 1; i < currentNums.length; i++) {
          const nextNums = [...currentNums];
          const [moved] = nextNums.splice(i, 1);
          nextNums.unshift(moved);
          search(nextNums, nextTools);
        }
      }
      else if (tool === 'promote') {
        // Promote moves to END (Right)
        // Optimization: Moving last to last is redundant
        for (let i = 0; i < currentNums.length - 1; i++) {
          const nextNums = [...currentNums];
          const [moved] = nextNums.splice(i, 1);
          nextNums.push(moved);
          search(nextNums, nextTools);
        }
      }
      else if (tool === 'swap') {
        for (let i = 0; i < currentNums.length - 1; i++) {
          const nextNums = [...currentNums];
          [nextNums[i], nextNums[i+1]] = [nextNums[i+1], nextNums[i]];
          search(nextNums, nextTools);
        }
      }
    }
  };

  search(initialNums, initialTools);
  return maxScore;
};

// Utility to generate random levels
export const generateLevel = (level: number): CardItem[] => {
  // Cap length at 14 to prevent UI clutter and Solver blowout
  const length = Math.min(7 + Math.floor((level - 1) / 2), 14); 
  
  // Generate numbers from 1 to N*2
  const maxVal = length * 2;
  const pool = Array.from({ length: maxVal }, (_, i) => i + 1);
  
  // Fisher-Yates Shuffle the pool
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Select the first 'length' numbers
  const numbers = pool.slice(0, length);

  return numbers.map(val => ({
    id: Math.random().toString(36).substring(2, 9),
    val: val,
    status: 'pending',
    linkScore: null 
  }));
};