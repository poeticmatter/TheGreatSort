import { CardItem, ISortable, SortDirection } from './types.ts';

// Pure Logic Helper for Mode Determination & Survival
export const judgeStep = (
    currentVal: number,
    currentHasShield: boolean,
    lastSurvivorVal: number,
    currentMode: SortDirection | null
): { survived: boolean; newMode: SortDirection | null; scoreToAdd: number } => {
    let survived = false;
    let newMode = currentMode;
    let scoreToAdd = 0;

    // 1. Shield Logic (Always Survives)
    if (currentHasShield) {
        survived = true;
        // Edge Case: Shielded item can still set the mode if currently pending
        if (newMode === null) {
            if (currentVal > lastSurvivorVal) newMode = 'ASC';
            else if (currentVal < lastSurvivorVal) newMode = 'DESC';
        }
    }
    // 2. Standard Logic
    else {
        if (newMode === null) {
            // Pending Mode: Equality is OK (survival), Difference sets mode
            survived = true;
            if (currentVal > lastSurvivorVal) newMode = 'ASC';
            else if (currentVal < lastSurvivorVal) newMode = 'DESC';
        } else {
            // Determined Mode
            if (newMode === 'ASC') {
                if (currentVal >= lastSurvivorVal) survived = true;
            } else {
                if (currentVal <= lastSurvivorVal) survived = true;
            }
        }
    }

    if (survived) {
        scoreToAdd = currentVal;
    }

    return { survived, newMode, scoreToAdd };
};

// Pure function to calculate yield (sum of survivor values INCLUDING first item)
export const calculateBatchScore = (numbers: ISortable[]): number => {
    if (!numbers || numbers.length === 0) return 0;

    let yield_ = 0;
    let lastSurvivor = 0;
    let mode: SortDirection | null = null;

    for (let i = 0; i < numbers.length; i++) {
        const item = numbers[i];
        const currentVal = item.val;
        const currentHasShield = item.hasShield || false;

        if (i === 0) {
            yield_ += currentVal; // Include first item's value
            lastSurvivor = currentVal;
        } else {
            const result = judgeStep(currentVal, currentHasShield, lastSurvivor, mode);

            if (result.survived) {
                mode = result.newMode;
                yield_ += currentVal; // Add survivor's value
                lastSurvivor = currentVal;
            }
        }
    }
    return yield_;
};

export interface InspectionYield {
  list: CardItem[];
  index: number;
  scoreDelta: number;
  detectedMode: SortDirection | null;
}

/**
 * Walks the sequence one card at a time, yielding once when a card starts
 * being scanned and once when its fate is decided, so a UI can animate it.
 */
export function* createInspectionStream(initialList: CardItem[]): Generator<InspectionYield> {
  const list = initialList.map(item => ({ ...item }));
  let lastSurvivorVal: number | null = null;
  let sortDirection: SortDirection | null = null;

  for (let i = 0; i < list.length; i++) {
    list[i] = { ...list[i], status: 'scanning' };
    yield {
      list: [...list],
      index: i,
      scoreDelta: 0,
      detectedMode: sortDirection
    };

    const currentItem = list[i];
    const currentVal = currentItem.val;
    let survived = false;

    if (lastSurvivorVal === null) {
      // The first card always survives and anchors the comparison.
      survived = true;
    } else {
      const result = judgeStep(currentVal, currentItem.hasShield || false, lastSurvivorVal, sortDirection);
      survived = result.survived;
      if (survived) {
        sortDirection = result.newMode;
      }
    }

    if (survived) {
      lastSurvivorVal = currentVal;
    }

    list[i] = { ...currentItem, status: survived ? 'safe' : 'eliminated' };

    yield {
      list: [...list],
      index: i,
      scoreDelta: survived ? currentVal : 0,
      detectedMode: sortDirection
    };
  }
}

/** Grades a whole sequence at once: total yield plus each card's final status. */
export const gradeLevel = (list: CardItem[]): { score: number, gradedList: CardItem[] } => {
  let totalScore = 0;
  let gradedList = list;

  for (const step of createInspectionStream(list)) {
    totalScore += step.scoreDelta;
    gradedList = step.list;
  }

  return { score: totalScore, gradedList };
};
