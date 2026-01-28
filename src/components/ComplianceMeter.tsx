import React from 'react';

export interface ComplianceMeterProps {
  efficiency: number | null;
  status: 'normal' | 'warning' | 'critical' | 'calibrating';
  layout: 'HORIZONTAL_STRIP' | 'VERTICAL_LIST';
  className?: string;
}

const ComplianceMeter: React.FC<ComplianceMeterProps> = ({
  efficiency,
  status,
  layout,
  className
}) => {
  const isHorizontal = layout === 'HORIZONTAL_STRIP';

  // Styles based on Status and Efficiency
  let colorClass = "text-stone-400"; // Default/Calibrating
  let barColorClass = "bg-stone-600";
  let glowClass = "";

  if (efficiency !== null) {
      if (efficiency === 100) {
          colorClass = "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]";
          barColorClass = "bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)]";
          glowClass = "animate-pulse";
      } else if (efficiency >= 95) {
          colorClass = "text-amber-300"; // Gold
          barColorClass = "bg-amber-400";
      } else if (efficiency >= 90) {
          colorClass = "text-slate-300"; // Silver
          barColorClass = "bg-slate-400";
      } else if (status === 'critical') {
          colorClass = "text-red-500 font-black animate-pulse";
          barColorClass = "bg-red-600";
      } else if (status === 'warning') {
           colorClass = "text-orange-500";
           barColorClass = "bg-orange-600";
      }
  }

  const containerClasses = isHorizontal
    ? "w-full flex justify-center z-30 shrink-0 py-2 px-4"
    : "flex flex-col items-center gap-2 py-4 h-full justify-center";

  const wrapperClasses = `
    bg-stone-900/90 border border-stone-700/50 backdrop-blur-sm
    p-4 rounded-lg shadow-xl pointer-events-auto flex items-center justify-center
    ${isHorizontal ? 'flex-row gap-6 h-16 w-full max-w-2xl' : 'flex-col gap-4 w-24 h-full'}
  `;

  return (
    <div className={`${containerClasses} ${className || ''}`}>
      <div className={wrapperClasses}>
          {/* Label */}
          <div className={`font-['Cinzel'] text-xs uppercase tracking-widest text-stone-500 ${isHorizontal ? '' : 'vertical-rl rotate-180'}`}>
              Compliance
          </div>

          {/* Value */}
          <div className={`font-mono font-bold ${colorClass} ${glowClass} ${isHorizontal ? 'text-4xl' : 'text-2xl'}`}>
              {efficiency !== null ? `${Math.round(efficiency)}%` : '--'}
          </div>

          {/* Visual Bar (Optional, maybe just a glowing line) */}
          <div className={`rounded-full ${barColorClass} transition-all duration-500 ${isHorizontal ? 'h-1.5 w-full max-w-[200px]' : 'w-1.5 h-full max-h-[200px]'}`}>
               <div className="w-full h-full opacity-50 animate-pulse bg-white/20"></div>
          </div>
      </div>
    </div>
  );
};

export default ComplianceMeter;
