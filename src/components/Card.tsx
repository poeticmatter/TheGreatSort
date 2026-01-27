import React from 'react';
import { CardItem, CardStatus } from '../../types';

import { Play } from 'lucide-react';

interface CardProps {
  item: CardItem;
  onClick: (item: CardItem) => void;
  isSelected: boolean;
  isTargetCandidate: boolean;
  style?: React.CSSProperties;
  mobileDirection?: 'right' | 'left' | 'down' | null;
  disableResponsiveOverrides?: boolean;
  isDisabled?: boolean;
  mirrorLabel?: string | null;
  variant?: 'standard' | 'wide';
}

const Card: React.FC<CardProps> = ({ item, onClick, isSelected, isTargetCandidate, style, mobileDirection, disableResponsiveOverrides, isDisabled, mirrorLabel, variant = 'standard' }) => {
  let bgColor = "bg-stone-800";
  let borderColor = "border-stone-600";
  let textColor = "text-stone-300";
  let scale = "scale-100";
  let opacity = "opacity-100";
  let shadow = "shadow-lg";

  // Disabled State
  if (isDisabled) {
    return (
      <div 
        style={style}
        className={`
          flex flex-col items-center justify-center 
          ${variant === 'wide' ? 'w-20 h-10 text-lg' : 'w-9 h-12 sm:w-14 sm:h-16 md:w-16 md:h-20 lg:w-20 lg:h-24 text-lg sm:text-2xl md:text-3xl'}
          rounded-sm border sm:border-2 border-stone-800 bg-stone-900/50 text-stone-700
          grayscale opacity-50 cursor-not-allowed select-none font-serif font-bold
        `}
      >
          {/* Minimal Content for Disabled State */}
          {item.val}
      </div>
    );
  }

  // Status Styles
  switch (item.status) {
    case 'safe':
      bgColor = "bg-amber-700";
      borderColor = "border-amber-400";
      textColor = "text-amber-50";
      shadow = "shadow-[0_0_15px_rgba(245,158,11,0.4)]";
      break;
    case 'eliminated':
      bgColor = "bg-red-950/40";
      borderColor = "border-red-900";
      textColor = "text-red-800 decoration-red-900 decoration-2 line-through opacity-70"; // Changed text color and removed generic opacity
      opacity = "opacity-100"; // Keep container opaque so number is legible
      scale = "scale-95";
      shadow = "shadow-none";
      break;
    case 'scanning':
      borderColor = "border-red-500";
      bgColor = "bg-stone-700";
      scale = "scale-110 z-10";
      shadow = "shadow-[0_0_20px_rgba(239,68,68,0.5)]";
      textColor = "text-white";
      break;
    default: // pending
      if (isSelected) {
        borderColor = "border-amber-500";
        bgColor = "bg-stone-700";
        shadow = "shadow-[0_0_10px_rgba(245,158,11,0.3)]";
        textColor = "text-amber-200";
        scale = "scale-105";
      } else if (isTargetCandidate) {
        borderColor = "border-amber-500/50 border-dashed";
        bgColor = "bg-stone-800/80";
        textColor = "text-amber-200/80";
        scale = "scale-105";
      }
      break;
  }

  // Shield Visuals (Override)
  if (item.hasShield) {
    borderColor = "border-blue-500 border-4";
    if (item.status !== 'eliminated') {
         shadow = "shadow-[0_0_15px_rgba(59,130,246,0.6)]";
    }
  }

  const desktopArrowKeyClasses = disableResponsiveOverrides 
    ? "" 
    : "sm:left-[calc(100%+14px)] sm:right-auto sm:top-1/2 sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rotate-0";

  return (
    <div 
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onClick(item);
      }}
      className={`
        relative flex flex-col items-center justify-center 
        ${variant === 'wide' ? 'w-20 h-10 text-lg' : 'w-9 h-12 sm:w-14 sm:h-16 md:w-16 md:h-20 lg:w-20 lg:h-24 text-lg sm:text-2xl md:text-3xl'}
        rounded-sm border sm:border-2 ${borderColor} ${bgColor} ${textColor} ${opacity} ${shadow}
        transform transition-all duration-300 ease-out ${scale}
        cursor-pointer select-none font-serif font-bold
        overflow-visible
        group
      `}
    >
      {/* Directional Chevron (Snake Logic) */}
      {mobileDirection && (
         <div
           className={`
             absolute pointer-events-none text-amber-500/80
             transition-all duration-300 z-0 flex items-center justify-center

             /* Mobile: Right (Gap 20px -> Center at 9px) */
             ${mobileDirection === 'right' ? 'left-[calc(100%+9px)] top-1/2 -translate-y-1/2 -translate-x-1/2' : ''}

             /* Mobile: Left (Gap 20px -> Center at 9px) */
             ${mobileDirection === 'left' ? 'right-[calc(100%+9px)] top-1/2 -translate-y-1/2 translate-x-1/2 rotate-180' : ''}

             /* Mobile: Down (Gap 20px -> Center at 9px) */
             ${mobileDirection === 'down' ? 'top-[calc(100%+9px)] left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90' : ''}

             /* Desktop Override: Always Right (Gap 24px -> Center at 14px) */
             ${desktopArrowKeyClasses}
           `}
         >
           <Play className="w-3.5 h-3.5 sm:w-5 sm:h-5 fill-amber-500" />
         </div>
      )}

      {/* Decorative 'rivets' */}
      <div className={`hidden sm:block absolute top-1 left-1 w-1 h-1 rounded-full ${item.status === 'safe' ? 'bg-amber-500' : 'bg-stone-500'} opacity-50`}></div>
      <div className={`hidden sm:block absolute top-1 right-1 w-1 h-1 rounded-full ${item.status === 'safe' ? 'bg-amber-500' : 'bg-stone-500'} opacity-50`}></div>
      <div className={`hidden sm:block absolute bottom-1 left-1 w-1 h-1 rounded-full ${item.status === 'safe' ? 'bg-amber-500' : 'bg-stone-500'} opacity-50`}></div>
      <div className={`hidden sm:block absolute bottom-1 right-1 w-1 h-1 rounded-full ${item.status === 'safe' ? 'bg-amber-500' : 'bg-stone-500'} opacity-50`}></div>

      {item.val}

      {/* Rubber Stamp Effect for Eliminated */}
      {item.status === 'eliminated' && (
        <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none rotate-[-20deg]">
          <div className="border-4 border-red-900 text-red-900 px-1 py-1 text-xs sm:text-sm font-black uppercase tracking-widest">
            VOID
          </div>
        </div>
      )}
      
      {/* Link Score Badge */}
      {item.linkScore !== null && item.linkScore > 0 && (
        <div className="absolute -right-1.5 -top-1.5 sm:-right-3 sm:-top-3 z-20 animate-in fade-in zoom-in duration-300">
           <div className="bg-amber-500 text-red-950 text-[10px] sm:text-sm font-bold px-1 sm:px-1.5 py-0 sm:py-0.5 rounded-full shadow-lg border sm:border-2 border-red-900 min-w-[1.2rem] sm:min-w-[1.8rem] text-center font-mono">
             +{item.linkScore}
           </div>
        </div>
      )}
      {/* Mirror Label Badge */}
      {mirrorLabel && (
        <div className="absolute -top-2 sm:-top-3 left-1/2 -translate-x-1/2 z-30 animate-in fade-in zoom-in duration-300">
           <div className="bg-cyan-950 text-cyan-400 font-serif font-bold text-[8px] sm:text-[10px] uppercase px-1 sm:px-1.5 py-[0.5px] leading-none rounded-full border border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]">
             {mirrorLabel}
           </div>
        </div>
      )}
    </div>
  );
};

export default Card;
