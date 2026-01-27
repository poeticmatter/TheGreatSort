import React from 'react';
import Card from './Card';
import { CardItem } from '../../types';

export type LayoutType = 
  | 'VERTICAL_LIST' 
  | 'VERTICAL_STAGGER' 
  | 'HORIZONTAL_STRIP' 
  | 'GRID_STANDARD' 
  | 'GRID_SNAKE';

export interface InventoryGridProps {
  sequence: CardItem[];
  layout?: LayoutType; // Defaults to 'GRID_SNAKE'
  
  // Highlight/Interaction Props
  highlightIndices?: number[];
  selectedIndex?: number | null;
  candidateIndices?: number[];
  onItemClick?: (item: CardItem) => void;
  disabled?: boolean;
  disabledIndices?: number[];
}

/**
 * Calculates grid position for the "Snake" layout.
 * Rows of 5, winding back and forth.
 */
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

/**
 * Calculates direction arrow for the "Snake" layout.
 */
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

export const InventoryGrid: React.FC<InventoryGridProps> = ({ 
  sequence, 
  layout = 'GRID_SNAKE', 
  highlightIndices = [], 
  selectedIndex = null, 
  candidateIndices = [],
  onItemClick,
  disabled,
  disabledIndices = []
}) => {
  
  // -- Container Styles --
  const baseContainerClasses = "w-full transition-all duration-300";
  
  let layoutClasses = "";
  
  switch (layout) {
    case 'VERTICAL_LIST':
      layoutClasses = "flex flex-col items-center gap-4 py-4";
      break;
      
    case 'VERTICAL_STAGGER':
      // Two columns, items will be offset via inline style or class on the item
      layoutClasses = "grid grid-cols-2 gap-x-4 gap-y-8 justify-items-center py-8";
      break;
      
    case 'HORIZONTAL_STRIP':
      // Overflow handling:
      // The requirement says "Must handle its own scrolling (overflow-x: auto) and hide the scrollbar if possible".
      // We use 'overflow-x-auto' and hide scrollbar classes.
      layoutClasses = "flex flex-row gap-4 overflow-x-auto px-4 py-8 items-center scrollbar-hide snap-x";
      break;
      
    case 'GRID_STANDARD':
      // Standard LTR wrapping
      layoutClasses = "flex flex-wrap justify-center gap-4 py-4";
      break;
      
    case 'GRID_SNAKE':
    default:
      // Existing Snake Grid logic (originally 5 columns)
      layoutClasses = "grid grid-cols-5 gap-x-2 gap-y-4 justify-items-center perspective-[1000px] py-4";
      break;
  }

  // Helper for Stagger Offset
  // Even-numbered items should be visually offset downwards.
  const getStaggerStyle = (index: number): React.CSSProperties | undefined => {
    if (layout === 'VERTICAL_STAGGER' && index % 2 === 1) {
       // Requirement says "Even-numbered items". 
       // Often 0-indexed means 0, 2, 4 are "First, Third, Fifth".
       // If user means "Even numbered" as in 2nd, 4th item (indices 1, 3, 5)...
       // "Even-numbered items should be visually offset...". 
       // If I offset index 0, 2, 4... the top left one is lower?
       // Let's assume index 1, 3 (2nd, 4th) are offset to create zig-zag if columns are side-by-side.
       // Actually, usually 0 is top left, 1 is top right.
       // If I offset 1 (odd index), it goes down.
       return { transform: 'translateY(2rem)' };
    }
    return undefined;
  };

  return (
    <div className={`${baseContainerClasses} ${disabled ? 'grayscale pointer-events-none opacity-50' : ''}`}>
        
        {/* Helper for hiding scrollbar in Horizontal Strip */}
        <style dangerouslySetInnerHTML={{__html: `
          .scrollbar-hide::-webkit-scrollbar {
              display: none;
          }
          .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
          }
        `}} />

       <div className={layoutClasses}>
        {sequence.map((item, idx) => {
          const isSelected = (selectedIndex === idx) || highlightIndices.includes(idx);
          const isCandidate = candidateIndices.includes(idx);
          
          // Layout-specific Props
          let itemStyle: React.CSSProperties | undefined;
          let mobileDirection: 'right' | 'left' | 'down' | null = null;
          let disableResponsiveOverrides = true; // We control layout explicitly now
          
          if (layout === 'GRID_SNAKE') {
            itemStyle = getSnakePosition(idx);
            mobileDirection = getSnakeDirection(idx, sequence.length);
            disableResponsiveOverrides = true; // Force snake logic at all times if selected
          } else if (layout === 'VERTICAL_STAGGER') {
             // Apply stagger offset
             const stagger = getStaggerStyle(idx);
             if (stagger) itemStyle = stagger;
          }

          // For Horizontal Strip, snap alignment
          const wrapperClass = layout === 'HORIZONTAL_STRIP' ? 'snap-center flex-shrink-0' : '';

          return (
            <div key={item.id} className={wrapperClass} style={{ display: 'contents' }}>
               {/* Wrapper div might interfere with Grid layouts (Snake/Stagger) if 'display: contents' isn't used or if not needed.
                   For Flex layouts (List, Strip, Standard), a wrapper is fine or we pass className to Card?
                   Card accepts style. Wrapper is safer for 'snap-center' but Card is the visual element.
                   Let's just pass class to Card? Card doesn't accept className.
                   We'll wrap if needed, but for Grid Layouts, wrapper breaks grid placement unless display: contents.
                   'display: contents' removes the box from the tree, so 'snap-center' on it might do nothing? 
                   Actually 'display: contents' makes children direct children of grid container.
                   So Card becomes direct child.
                   Card has 'onClick', 'item', etc.
                   
                   Let's stick to Card as direct child for Grids.
                   For Horizontal Strip, we might need a wrapper to hold width? Card has fixed width.
               */}
               <Card
                 item={item}
                 style={itemStyle}
                 mobileDirection={mobileDirection}
                 disableResponsiveOverrides={disableResponsiveOverrides}
                 onClick={(itm) => !disabled && onItemClick && onItemClick(itm)}
                 isSelected={isSelected}
                 isTargetCandidate={isCandidate}
                 isDisabled={disabledIndices.includes(idx)}
               />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InventoryGrid;
