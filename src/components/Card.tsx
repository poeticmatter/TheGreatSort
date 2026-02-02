import React, { useMemo } from 'react';
import { CardItem, UserTag } from '../../types';
import { Play, HelpCircle, Siren, Shield } from 'lucide-react';

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

const getCardVisuals = (
  status: CardItem['status'],
  isSelected: boolean,
  isTargetCandidate: boolean,
  hasShield: boolean
) => {
  let bgColor = "bg-stone-800";
  let borderColor = "border-stone-600";
  let textColor = "text-stone-300";
  let scale = "scale-100";
  let opacity = "opacity-100";
  let shadow = "shadow-lg";

  switch (status) {
    case 'safe':
      bgColor = "bg-amber-700";
      borderColor = "border-amber-400";
      textColor = "text-amber-50";
      shadow = "shadow-[0_0_15px_rgba(245,158,11,0.4)]";
      break;
    case 'eliminated':
      bgColor = "bg-red-950/40";
      borderColor = "border-red-900";
      textColor = "text-red-800 decoration-red-900 decoration-2 line-through opacity-70";
      opacity = "opacity-100";
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
  if (hasShield) {
    borderColor = "border-blue-500 border-4";
    if (status !== 'eliminated') {
      shadow = "shadow-[0_0_15px_rgba(59,130,246,0.6)]";
    }
  }

  return { bgColor, borderColor, textColor, scale, opacity, shadow };
};

const Card: React.FC<CardProps> = React.memo(({
  item,
  onClick,
  isSelected,
  isTargetCandidate,
  style,
  mobileDirection,
  disableResponsiveOverrides,
  isDisabled,
  mirrorLabel,
  variant = 'standard'
}) => {

  const { bgColor, borderColor, textColor, scale, opacity, shadow } = useMemo(() =>
    getCardVisuals(item.status, isSelected, isTargetCandidate, !!item.hasShield),
    [item.status, isSelected, isTargetCandidate, item.hasShield]
  );

  // Disabled State
  if (isDisabled) {
    return (
      <div
        style={style}
        className={`
          flex flex-col items-center justify-center 
          ${variant === 'wide' ? 'w-20 h-8 text-lg' : 'w-20 h-24 text-3xl'}
          rounded-sm border sm:border-2 border-stone-800 bg-stone-900/50 text-stone-700
          grayscale opacity-50 cursor-not-allowed select-none font-serif font-bold
        `}
      >
        {item.val}
      </div>
    );
  }

  const desktopArrowKeyClasses = disableResponsiveOverrides
    ? ""
    : "sm:left-[calc(100%+14px)] sm:right-auto sm:top-1/2 sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rotate-0";

  return (
    <div
      style={style}
      // Note: onClick is now a stable callback from parent, so it doesn't break memo
      onClick={(e) => {
        e.stopPropagation();
        onClick(item);
      }}
      className={`
        relative flex flex-col items-center justify-center 
        ${variant === 'wide'
          ? 'w-20 h-8 text-lg'         // Mobile (Vertical List): Wide, short row
          : 'w-20 h-24 text-3xl'       // Desktop (Horizontal Strip): Tall, large card
        }
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

      {/* Deduction Tags */}
      {item.userTag === UserTag.SUSPICIOUS && (
        <div className="absolute bottom-1 sm:bottom-2 -translate-x-1/2 left-1/2 text-amber-500 animate-in fade-in zoom-in duration-200">
          <HelpCircle className="w-3 h-3 sm:w-4 sm:h-4" />
        </div>
      )}
      {item.userTag === UserTag.STATE && (
        <div className="absolute bottom-1 sm:bottom-2 -translate-x-1/2 left-1/2 text-red-500 animate-in fade-in zoom-in duration-200">
          <Siren className="w-3 h-3 sm:w-4 sm:h-4" />
        </div>
      )}
      {item.userTag === UserTag.RESISTANCE && (
        <div className="absolute bottom-1 sm:bottom-2 -translate-x-1/2 left-1/2 text-blue-500 animate-in fade-in zoom-in duration-200">
          <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
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
});

const arePropsEqual = (prev: CardProps, next: CardProps) => {
  return (
    prev.isSelected === next.isSelected &&
    prev.isTargetCandidate === next.isTargetCandidate &&
    prev.isDisabled === next.isDisabled &&
    prev.mobileDirection === next.mobileDirection &&
    prev.disableResponsiveOverrides === next.disableResponsiveOverrides &&
    prev.mirrorLabel === next.mirrorLabel &&
    prev.variant === next.variant &&
    prev.onClick === next.onClick &&
    // Item checks (Deep check on relevant fields to handle reference instability)
    prev.item.val === next.item.val &&
    prev.item.status === next.item.status &&
    prev.item.hasShield === next.item.hasShield &&
    prev.item.userTag === next.item.userTag &&

    prev.item.id === next.item.id
  );
};

export default React.memo(Card, arePropsEqual);


