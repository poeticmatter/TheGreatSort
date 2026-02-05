import React from 'react';
import { GamePhase, ToolType, GameMode } from '../../types';

interface TooltipProps {
  phase: GamePhase;
  selectedTool: ToolType | null;
  selection: number | null;
  detectedMode: 'ASC' | 'DESC' | null;
  levelScore: number;
  optimalScore: number | null;
  worstScore: number | null; // For calculating relative efficiency if needed
  gameMode: GameMode;
  onShareResult: () => void;
  onRetryPractice?: () => void;
  onViewAudit?: () => void;
  isLocked?: boolean;
  isResistanceActive?: boolean;
}

import { TOOLS } from '../constants';

const Tooltip: React.FC<TooltipProps> = ({
  phase,
  selectedTool,
  selection,
  gameMode,
  isLocked,
  isResistanceActive
}) => {

  const getInstruction = () => {
    if (phase === GamePhase.RESULTS) return "Sequence Complete. Review results.";
    if (phase === GamePhase.INSPECTING) return "Processing sequence...";

    if (isResistanceActive) {
      return "The state (in red) agent must be eliminated. The resistance (in blue) agent must survive.";
    }

    if (gameMode === 'DAILY' && isLocked) return "Quota Locked. Training Mode Active.";

    if (!selectedTool) return "Comrade, select a tool to re-educate the sequence.";

    // Get tool definition
    const toolDef = TOOLS[selectedTool.toUpperCase()];
    const toolName = toolDef ? toolDef.name : selectedTool;
    const toolDesc = toolDef ? toolDef.desc : "";

    if (selection === null) {
      // First click needed: Show Description to guide user on what the tool does
      return toolDesc || `Select target for ${toolName}...`;
    } else {
      // Second click needed
      return `Select destination for ${toolName}...`;
    }
  };

  const instruction = getInstruction();

  return (
    <div className="w-full flex justify-center py-2 pointer-events-none select-none">
      <div className="relative flex items-center gap-3 px-6 py-2 bg-[#1c1917]/95 border border-amber-900/40 rounded shadow-2xl backdrop-blur-sm min-w-[320px] max-w-2xl justify-center">
        {/* Icon */}
        <div className="text-amber-600/80 shrink-0 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        {/* Instruction Text */}
        <div className="text-base font-serif text-stone-300 tracking-wide italic text-center drop-shadow-sm">
          "{instruction}"
        </div>

        {/* Decorative Corner Accents (Subtle) */}
        <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-amber-700/50 opacity-40" />
        <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-amber-700/50 opacity-40" />
        <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-amber-700/50 opacity-40" />
        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-amber-700/50 opacity-40" />
      </div>
    </div>
  );
};

export default Tooltip;
