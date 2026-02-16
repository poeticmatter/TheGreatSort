import React from 'react';
import Card from './Card';
import { CardItem } from '../../types';
import { RenderableCard } from '../hooks/useGridPresentation';
import { Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type LayoutType =
  | 'VERTICAL_LIST'
  | 'HORIZONTAL_STRIP';

export interface InventoryGridProps {
  cards: RenderableCard[];
  layout?: LayoutType; // Defaults to 'HORIZONTAL_STRIP'
  onItemClick?: (item: CardItem) => void;
  disabled?: boolean;
  showRoles?: boolean;
}

export const InventoryGrid: React.FC<InventoryGridProps> = ({
  cards,
  layout = 'HORIZONTAL_STRIP',
  onItemClick,
  disabled,
  showRoles,
}) => {

  // -- Container Styles --
  const baseContainerClasses = "w-full transition-all duration-300";

  let layoutClasses = "";

  switch (layout) {
    case 'VERTICAL_LIST':
      layoutClasses = "flex flex-col items-center gap-0.5 sm:gap-1 py-4";
      break;

    case 'HORIZONTAL_STRIP':
    default:
      // Centered strip that scrolls if needed
      layoutClasses = "relative flex flex-row gap-0.5 sm:gap-1 overflow-x-auto px-1 sm:px-4 py-8 items-center scrollbar-hide snap-x w-fit mx-auto max-w-full min-h-[12rem]";
      break;
  }

  const handleCardClick = React.useCallback((item: CardItem) => {
    if (!disabled && onItemClick) {
      onItemClick(item);
    }
  }, [disabled, onItemClick]);

  return (
    <div className={`${baseContainerClasses} ${disabled ? 'grayscale pointer-events-none opacity-50' : ''}`}>

      {/* Helper for hiding scrollbar in Horizontal Strip */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .scrollbar-hide::-webkit-scrollbar {
              display: none;
          }
          .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
          }
        `}} />

      <div className={layoutClasses}>
        <AnimatePresence initial={false} mode="popLayout">
          {cards.map((card, idx) => {
            const isLast = idx === cards.length - 1;

            // For Horizontal Strip, snap alignment
            // wrapperClass defines the inner layout of the Item+Arrow group
            const wrapperClass = layout === 'HORIZONTAL_STRIP'
              ? 'snap-center flex-shrink-0 flex items-center'
              : 'flex flex-col items-center';

            return (
              <motion.div
                key={card.key}
                layout
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={`${wrapperClass} gap-0.5 sm:gap-1`} // Ensure gap between Card and Arrow matches container gap
              >
                <Card
                  item={card}
                  // We disable the internal arrows of the Card since we are rendering them externally 
                  // (Note: Original code passed mobileDirection=null explicitly, so we keep that behavior)
                  mobileDirection={null}
                  disableResponsiveOverrides={true}
                  onClick={handleCardClick}
                  isSelected={card.isSelected}
                  isTargetCandidate={card.isCandidate}
                  isDisabled={card.isDisabled}
                  mirrorLabel={card.mirrorLabel}
                  variant={layout === 'VERTICAL_LIST' ? 'wide' : 'standard'}
                  showRoles={showRoles}
                />

                {!isLast && (
                  <div className={`text-stone-600 ${layout === 'VERTICAL_LIST' ? 'rotate-90' : ''}`}>
                    <Play size={10} fill="currentColor" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default InventoryGrid;

