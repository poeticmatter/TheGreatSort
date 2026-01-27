import React from 'react';
import { CardItem } from '../../types';
import { LayoutType } from './InventoryGrid';

export interface MinimapProps {
  sequence: CardItem[];
  layout: LayoutType;
}

export const Minimap: React.FC<MinimapProps> = ({ sequence, layout }) => {
  // Determine positioning based on layout
  const isHorizontal = layout === 'HORIZONTAL_STRIP';

  // Container classes
  // Horizontal: fixed bottom (above footer), centered horizontally
  // Vertical: fixed middle-left
  const containerClasses = isHorizontal
    ? "fixed bottom-28 left-0 right-0 z-40 flex justify-center pointer-events-none px-4"
    : "fixed top-1/2 left-4 -translate-y-1/2 z-40 flex flex-col pointer-events-none";

  // Inner wrapper classes (for the visual box)
  // bg-stone-900/90, subtle border
  const wrapperClasses = `
    bg-stone-900/90 border border-stone-700/50 backdrop-blur-sm 
    p-1.5 rounded-lg shadow-xl pointer-events-auto
    ${isHorizontal ? 'flex flex-row items-center gap-0.5 max-w-full' : 'flex flex-col items-center gap-0.5 max-h-[60vh]'}
  `;

  // Helper to determine item color
  const getItemColor = (item: CardItem) => {
    switch (item.status) {
      case 'safe':
        return 'bg-amber-600';
      case 'eliminated':
        return 'bg-red-800/80';
      case 'scanning':
        return 'bg-stone-500 ring-1 ring-red-500';
      default: // pending
        return 'bg-stone-700';
    }
  };

  // Shield override visual equivalent?
  // Maybe a blue ring or just keep it simple as requested ("Simple colored rectangles").
  // I will just use the status colors for now.

  return (
    <div className={containerClasses}>
      <div className={wrapperClasses}>
        {sequence.map((item) => {
            // Determine item size/shape
            // Adjusted to ensure numbers are visible based on user feedback.
            // Using min-w/min-h to ensure they don't vanish, but allowing flex basis to work.
            
            const baseClass = "rounded-[1px] flex items-center justify-center text-[10px] font-bold font-mono leading-none overflow-hidden select-none shadow-sm";
            
            const dimsClass = isHorizontal 
                ? "w-6 h-8 min-w-[16px]"  // Horizontal strip: Items stand tall
                : "w-8 h-6 min-h-[16px]"; // Vertical list: Items lay flat

            const textColor = item.status === 'safe' ? 'text-stone-900' 
                            : item.status === 'eliminated' ? 'text-red-300/60 line-through' 
                            : 'text-stone-300';

            return (
                <div
                    key={item.id}
                    className={`${baseClass} ${dimsClass} ${getItemColor(item)} ${textColor} transition-all duration-300`}
                    title={`Val: ${item.val} (${item.status})`}
                >
                  {item.val}
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default Minimap;
