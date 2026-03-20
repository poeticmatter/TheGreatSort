import React from 'react';
import { GamePhase, ToolType, GameMode } from '../../types';
import { FlavorKey } from '../config/flavorText';

interface TooltipProps {
  phase: GamePhase;
  selectedTool: ToolType | null;
  selection: number | null;
  detectedMode: 'ASC' | 'DESC' | null;
  levelScore: number;
  optimalScore: number | null;
  worstScore: number | null; // For calculating relative efficiency if needed
  gameMode: GameMode;

  onRetryPractice?: () => void;
  onViewAudit?: () => void;
  isLocked?: boolean;
  isResistanceActive?: boolean;
  mood?: FlavorKey;
  tutorialMessage?: string;
}


import { TOOLS } from '../constants';
import { Siren, Shield } from 'lucide-react';

const Tooltip: React.FC<TooltipProps> = ({
  phase,
  selectedTool,
  selection,
  isResistanceActive,
  mood,
  tutorialMessage
}) => {

  const getInstruction = (): React.ReactNode => {
    if (phase === GamePhase.RESULTS) return "Sequence Complete. Review audit.";
    if (phase === GamePhase.INSPECTING) return "Running Inspection...";

    if (selectedTool) {
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
    }

    if (tutorialMessage) return tutorialMessage;

    if (isResistanceActive) {
      return (
        <span>
          Eliminate the <span className="text-red-500 font-bold not-italic whitespace-nowrap">state <Siren className="inline w-5 h-5 mb-1" /></span> agent. Protect the <span className="text-blue-500 font-bold not-italic whitespace-nowrap">resistance <Shield className="inline w-5 h-5 mb-1" /></span> agent.
        </span>
      );
    }

    if (mood === 'ADEQUATE') return "Item loss is authorized. 100% compliance is the optimal solution.";
    if (mood === 'SUSPICIOUS') return "Efficiency tip: Compliance is mandatory.";
    if (mood === 'SABOTAGE') return "ERROR! ERROR! ERROR!";
    if (mood === 'SOLVED') return "Report to audit, comrade.";

    return "Select a tool to re-educate the sequence.";
  };

  const instruction = getInstruction();

  return (
    <div className="w-full flex justify-center py-2 pointer-events-none select-none">
      <div className="relative flex items-center gap-3 md:gap-5 px-6 py-2 md:px-10 md:py-4 bg-[#1c1917]/95 border border-amber-900/40 rounded shadow-2xl backdrop-blur-sm min-w-[320px] max-w-2xl justify-center transition-all duration-300">
        {/* Icon */}
        <div className="text-amber-500 shrink-0 flex items-center">
          <svg className="w-4 h-4 md:w-6 md:h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        {/* Instruction Text */}
        <div className="min-h-14 md:min-h-20 w-full flex items-center justify-start text-sm md:text-lg font-mono font-bold text-stone-400 tracking-widest text-left px-4 transition-all duration-300">
          <span>{instruction}</span>
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
