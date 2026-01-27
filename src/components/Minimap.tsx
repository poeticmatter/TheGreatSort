import React, { useMemo } from 'react';
import { CardItem } from '../../types';
import { LayoutType } from './InventoryGrid';
import { gradeLevel } from '../utils/gameLogic';

export interface MinimapProps {
  sequence: CardItem[];
  layout: LayoutType;
}

export const Minimap: React.FC<MinimapProps> = ({ sequence, layout }) => {
  // Determine positioning based on layout
  const isHorizontal = layout === 'HORIZONTAL_STRIP';

  // "Future Sight" Calculation
  // We want to see what WOULD happen if we inspected now.
  const previewData = useMemo(() => {
    try {
        // We only care about the statuses of the final graded list.
        const { gradedList } = gradeLevel(sequence);
        return gradedList;
    } catch (e) {
        console.warn("Minimap preview calc failed", e);
        return sequence;
    }
  }, [sequence]);


  // Container classes
  // Horizontal: Fixed / Flex flow adaptation
  const containerClasses = isHorizontal
    ? "w-full flex justify-center z-30 shrink-0 py-2 px-4"
    : "fixed top-1/2 left-4 -translate-y-1/2 z-40 flex flex-col pointer-events-none";

  // Inner wrapper classes (for the visual box)
  const wrapperClasses = `
    bg-stone-900/90 border border-stone-700/50 backdrop-blur-sm 
    p-1.5 rounded-lg shadow-xl pointer-events-auto
    ${isHorizontal ? 'flex flex-row items-center gap-0.5 max-w-full' : 'flex flex-col items-center gap-0.5 max-h-[60vh]'}
  `;

  return (
    <div className={containerClasses}>
      <div className={wrapperClasses}>
        {sequence.map((item, idx) => {
            // Determine item size/shape
            const baseClass = "rounded-[1px] flex items-center justify-center text-[10px] font-bold font-mono leading-none overflow-hidden select-none shadow-sm";
            const dimsClass = isHorizontal 
                ? "w-6 h-8 min-w-[16px]"  
                : "w-8 h-6 min-h-[16px]";

            // --- Status & Coloring Logic ---
            let bgClass = "bg-stone-700";
            let textClass = "text-stone-300";
            let ringClass = ""; // For future/active highlights

            // Check Preview Status if Pending
            if (item.status === 'pending') {
                const futureItem = previewData[idx]; // Match by index since gradeLevel preserves quantity
                const futureStatus = futureItem ? futureItem.status : 'pending';

                if (futureStatus === 'safe') {
                    // "Future Safe" Preview
                    bgClass = "bg-amber-900/40";
                    textClass = "text-amber-500 font-bold";
                    ringClass = "ring-1 ring-amber-500/30 inset";
                } else if (futureStatus === 'eliminated') {
                    // "Future Eliminated" Preview
                    bgClass = "bg-red-900/20 border border-red-500/50";
                    textClass = "text-red-400";
                }
            } else {
                // Real Status
                switch (item.status) {
                    case 'safe':
                        bgClass = 'bg-amber-600';
                        textClass = 'text-stone-900 font-bold';
                        break;
                    case 'eliminated':
                        bgClass = 'bg-red-950/80';
                        textClass = 'text-red-400/50 line-through';
                        break;
                    case 'scanning':
                        bgClass = 'bg-stone-500';
                        textClass = 'text-white font-bold';
                        ringClass = 'ring-2 ring-red-500 z-10';
                        break;
                }
            }

            return (
                <div
                    key={item.id}
                    className={`${baseClass} ${dimsClass} ${bgClass} ${textClass} ${ringClass} transition-all duration-300`}
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
