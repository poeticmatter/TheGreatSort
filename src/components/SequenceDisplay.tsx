import React from 'react';
import Card from './Card';
import { CardItem } from '../../types';

interface SequenceDisplayProps {
  sequence: CardItem[];
  isMobile?: boolean; // If true, forces the "snake" layout (grid) regardless of screen size. If undefined, it is responsive.
  highlightIndices?: number[];
  
  // Interactive props (Optional, for Game usage)
  selectedIndex?: number | null;
  candidateIndices?: number[];
  onItemClick?: (item: CardItem) => void;
}

const getSnakePosition = (index: number): React.CSSProperties => {
  const cycle = Math.floor(index / 12);
  const localIndex = index % 12;
  const baseRow = cycle * 4;
  let col = 0;
  let row = 0;

  if (localIndex < 5) {
    // 0, 1, 2, 3, 4 -> Row 1, Col 1..5
    row = 1;
    col = localIndex + 1;
  } else if (localIndex === 5) {
    // 5 -> Row 2, Col 5
    row = 2;
    col = 5;
  } else if (localIndex < 11) {
    // 6, 7, 8, 9, 10 -> Row 3, Col 5..1
    row = 3;
    col = 11 - localIndex;
  } else {
    // 11 -> Row 4, Col 1
    row = 4;
    col = 1;
  }

  return {
    gridColumn: col,
    gridRow: baseRow + row,
  };
};

const getSnakeDirection = (index: number, total: number): 'right' | 'left' | 'down' | null => {
  if (index >= total - 1) return null; // No arrow for the last item

  const localIndex = index % 12;

  // Row 1: 0, 1, 2, 3 -> Right (4 is end of row)
  if (localIndex < 4) return 'right';

  // End of Row 1: 4 -> Down
  if (localIndex === 4) return 'down';

  // Row 2: 5 -> Down
  if (localIndex === 5) return 'down';

  // Row 3: 6, 7, 8, 9 -> Left (10 is end of row)
  if (localIndex >= 6 && localIndex < 10) return 'left';

  // End of Row 3: 10 -> Down
  if (localIndex === 10) return 'down';

  // Row 4: 11 -> Down
  if (localIndex === 11) return 'down';

  return 'right'; // Fallback
};

export const SequenceDisplay: React.FC<SequenceDisplayProps> = ({ 
  sequence, 
  isMobile, 
  highlightIndices = [], 
  selectedIndex = null, 
  candidateIndices = [],
  onItemClick 
}) => {
  
  // Logic to determine container classes
  // Default (Responsive): grid ... sm:flex ...
  // Force Mobile (Snake): grid ... (remove sm overrides)
  
  const baseClasses = "grid grid-cols-5 gap-x-7 gap-y-4 justify-items-center px-4 perspective-[1000px]";
  const desktopClasses = "sm:flex sm:flex-wrap sm:justify-center sm:items-center sm:gap-6 sm:max-w-5xl";
  
  const containerClassName = isMobile 
    ? baseClasses 
    : `${baseClasses} ${desktopClasses}`;

  return (
    <div className={`w-full flex items-center justify-center`}>
       <div className={containerClassName}>
        {sequence.map((item, idx) => {
          const isSelected = (selectedIndex === idx) || highlightIndices.includes(idx);
          const isCandidate = candidateIndices.includes(idx);

          return (
            <Card
              key={item.id}
              item={item}
              style={getSnakePosition(idx)}
              mobileDirection={getSnakeDirection(idx, sequence.length)}
              disableResponsiveOverrides={isMobile}
              onClick={(itm) => onItemClick && onItemClick(itm)}
              isSelected={isSelected}
              isTargetCandidate={isCandidate}
            />
          );
        })}
      </div>
    </div>
  );
};

export default SequenceDisplay;
