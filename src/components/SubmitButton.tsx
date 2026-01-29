import React from 'react';
import { Play, SearchCode, Repeat } from 'lucide-react';
import { GamePhase, GameMode } from '../../types';

interface SubmitButtonProps {
  phase: GamePhase;
  gameMode: GameMode;
  listLength: number;
  onActionClick: () => void;
  disabled?: boolean;
  isLocked?: boolean;
  compact?: boolean;
  compliancePercentage?: number; // New Prop
}

const SubmitButton: React.FC<SubmitButtonProps> = ({
  phase,
  gameMode,
  listLength,
  onActionClick,
  disabled,
  isLocked,
  compact = false,
  compliancePercentage = 0
}) => {
  const isRetry = phase === GamePhase.RESULTS && gameMode === 'DAILY';

  // Visual Tiers Logic
  // Silver: 90-94%
  // Gold: 95-99%
  // Platinum/Glowing: 100%
  // Only applies in GamePhase.RESULTS ? Or always? 
  // "SubmitButton: Update the component ... Implement logic for Silver... Gold... Glowing"
  // Usually this styling applies when the button is "Active" (i.e. Results phase -> Next).
  // But wait, user might want to see the tier *during* play? 
  // No, SubmitButton is usually "Inspector" during play.
  // The tier styling likely applies to the "Next Level" / "Result" state.
  // However, the button is "Inspector" during PLANNING.
  // If the ComplianceMeter is showing 100%, maybe the Inspector button glows?
  // Let's assume the tier styling dominates the button appearance regardless of phase OR only in Results.
  // Given "ComplianceMeter" exists separately to show status, the SubmitButton likely reflects the *Potential* or *Final* grade.
  // During Planning, we don't know the final score (unless we peek, which Projection does).
  // So we CAN show the glowing state if the current arrangement is 100%.
  // That would be a cool feedback: "You are ready to submit".

  let tierClass = "";
  if (compliancePercentage >= 100) {
    // Platinum / Glowing
    tierClass = "bg-cyan-900/80 hover:bg-cyan-800 border-cyan-400 text-cyan-50 shadow-[0_0_15px_rgba(34,211,238,0.5)] animate-pulse border-2";
  } else if (compliancePercentage >= 95) {
    // Gold
    tierClass = "bg-yellow-700 hover:bg-yellow-600 border-yellow-400 text-yellow-50 shadow-[0_4px_0_rgb(113,63,18)] border-2";
  } else if (compliancePercentage >= 90) {
    // Silver
    tierClass = "bg-slate-600 hover:bg-slate-500 border-slate-300 text-slate-50 shadow-[0_4px_0_rgb(30,41,59)] border-2";
  } else {
    // Standard / Default (Red/Amber) logic from before
    // We'll let the existing logic handle the default case if no tier triggers
    tierClass = "";
  }

  // Base Logic Reused
  const defaultClass = phase === GamePhase.RESULTS
    ? (isRetry
      ? 'bg-amber-700 hover:bg-amber-600 text-stone-950 border-amber-900 shadow-[0_4px_0_rgb(69,26,3)]'
      : 'bg-amber-700 hover:bg-amber-600 text-stone-950 border-amber-900 shadow-[0_4px_0_rgb(69,26,3)]')
    : 'bg-red-800 hover:bg-red-700 text-stone-200 border-red-600 shadow-[0_5px_0_rgb(69,10,10)] disabled:opacity-50 disabled:cursor-not-allowed';

  // If tierClass is active, it overrides defaultClass colors.
  // We need to merge carefully.
  const finalColorClass = tierClass || defaultClass;

  return (
    <button
      onClick={onActionClick}
      title={phase === GamePhase.RESULTS ? (gameMode === 'DAILY' ? (isLocked ? 'Training' : 'Retry Daily') : 'Next Level') : 'Inspect Sequence'}
      disabled={
        (disabled && isLocked && phase !== GamePhase.RESULTS)
      }
      className={`
        group relative rounded-sm font-bold flex items-center justify-center transition-all duration-300 border-2
        ${compact
          ? 'w-16 h-16 p-1 flex-col gap-0.5 rounded shadow-sm'
          : 'px-8 py-4 w-72 gap-3 font-[Cinzel] tracking-widest text-lg shadow-lg active:shadow-none active:translate-y-1'
        }
        ${finalColorClass}
        ${phase === GamePhase.INSPECTING ? 'translate-y-1 shadow-none bg-red-900 border-red-800 transform-none animation-none' : ''}
      `}
    >
      {phase === GamePhase.RESULTS ? (
        <>
          {gameMode === 'DAILY'
            ? (isLocked ? <Play size={compact ? 24 : 24} fill="currentColor" /> : <Repeat size={compact ? 24 : 24} />)
            : <Play size={compact ? 24 : 24} fill="currentColor" />}

          {compact && (
            <span className="text-[9px] uppercase font-bold leading-none text-center">
              {gameMode === 'DAILY' ? (isLocked ? 'Train' : 'Retry') : 'Next'}
            </span>
          )}

          {!compact && (
            <span className="flex items-center gap-3">
              {gameMode === 'DAILY' ? (isLocked ? 'Training' : 'Retry Quota') : 'Next Quota'}
            </span>
          )}
        </>
      ) : (
        <>
          <SearchCode size={compact ? 24 : 24} className={tierClass ? "text-current" : "text-white"} />
          {compact && (
            <span className="text-[9px] uppercase font-bold leading-none text-center mt-0.5">
              Inspect
            </span>
          )}
          {!compact && "Inspector"}
        </>
      )}
    </button>
  );
};

export default SubmitButton;
