import React from 'react';
import Card from './Card';
import { CardItem } from '../../types';
import { Play } from 'lucide-react';


export type LayoutType = 
  | 'VERTICAL_LIST' 
  | 'HORIZONTAL_STRIP';

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



export const InventoryGrid: React.FC<InventoryGridProps> = ({ 
  sequence, 
  layout = 'HORIZONTAL_STRIP', 
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
      layoutClasses = "flex flex-col items-center gap-2 py-4";
      break;
      
    case 'HORIZONTAL_STRIP':
    default:
      // Centered strip that scrolls if needed
      layoutClasses = "flex flex-row gap-2 overflow-x-auto px-4 py-8 items-center scrollbar-hide snap-x w-fit mx-auto max-w-full";
      break;
  }

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
          const isLast = idx === sequence.length - 1;

          // For Horizontal Strip, snap alignment
          const wrapperClass = layout === 'HORIZONTAL_STRIP' ? 'snap-center flex-shrink-0 flex items-center' : 'flex flex-col items-center';

          return (
            <React.Fragment key={item.id}>
              <div className={wrapperClass} style={layout === 'HORIZONTAL_STRIP' ? undefined : { display: 'contents' }}>
                 <Card
                   item={item}
                   // We disable the internal arrows of the Card since we are rendering them externally
                   mobileDirection={null} 
                   disableResponsiveOverrides={true} 
                   onClick={(itm) => !disabled && onItemClick && onItemClick(itm)}
                   isSelected={isSelected}
                   isTargetCandidate={isCandidate}
                   isDisabled={disabledIndices.includes(idx)}
                 />
              </div>
              
              {!isLast && (
                  <div className={`text-stone-600 ${layout === 'VERTICAL_LIST' ? 'rotate-90 py-1' : 'mx-1'}`}>
                      <Play size={16} fill="currentColor" />
                  </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default InventoryGrid;
