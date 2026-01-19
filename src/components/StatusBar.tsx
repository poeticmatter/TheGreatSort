import React from 'react';
import {
  AlertCircle, TrendingUp, TrendingDown
} from 'lucide-react';
import { GamePhase, GameMode } from '../../types';
import { TOOLS } from '../constants';
import ReportCard from './ReportCard';

interface StatusBarProps {
  phase: GamePhase;
  selectedTool: string | null;
  selection: number | null;
  detectedMode: 'ASC' | 'DESC' | null;
  levelScore: number;
  optimalScore: number | null;
  gameMode: GameMode;
  onShareResult: () => void;
  onRetryPractice: () => void;
}

const StatusBar: React.FC<StatusBarProps> = ({
  phase, selectedTool, selection, detectedMode, levelScore, optimalScore, gameMode,
  onShareResult, onRetryPractice
}) => {

  return (
    <div className="mt-8 mb-12 w-full max-w-3xl min-h-[5rem] flex items-center justify-center">

      {phase === GamePhase.PLANNING && (
        <div className="bg-stone-800 border border-stone-600 px-6 py-4 rounded shadow-lg text-center max-w-lg transition-all">
          {!selectedTool && (
            <div className="flex items-center gap-3 text-stone-400">
              <AlertCircle size={20} className="text-amber-500/50" />
              <span className="font-serif italic text-lg">"Comrade, select a tool to re-educate the sequence."</span>
            </div>
          )}
          {selectedTool && !(selectedTool === 'swap' && selection !== null) && (
            <span className="text-amber-400 font-bold animate-pulse font-[Courier_Prime] uppercase tracking-wide">
              {TOOLS[selectedTool.toUpperCase()]?.desc}
            </span>
          )}
          {selectedTool === 'swap' && selection !== null && (
            <span className="text-amber-400 font-bold animate-pulse font-[Courier_Prime] uppercase tracking-wide">
              Select adjacent neighbor
            </span>
          )}
        </div>
      )}

      {phase === GamePhase.INSPECTING && (
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <span className="text-red-500 font-[Cinzel] font-bold tracking-[0.2em] text-2xl border-b-2 border-red-900 pb-2">
            INSPECTION UNDERWAY
          </span>
          <div className="h-6">
            {detectedMode === 'ASC' && (
              <span className="flex items-center gap-2 text-xs font-bold bg-stone-800 text-amber-500 px-3 py-1 rounded-full border border-amber-900 uppercase fade-in">
                <TrendingUp size={14} /> Protocol: Ascending
              </span>
            )}
            {detectedMode === 'DESC' && (
              <span className="flex items-center gap-2 text-xs font-bold bg-stone-800 text-amber-500 px-3 py-1 rounded-full border border-amber-900 uppercase fade-in">
                <TrendingDown size={14} /> Protocol: Descending
              </span>
            )}
          </div>
        </div>
      )}

      {phase === GamePhase.RESULTS && (
        <ReportCard
          levelScore={levelScore}
          optimalScore={optimalScore}
          gameMode={gameMode}
          onShareResult={onShareResult}
          onRetryPractice={onRetryPractice}
        />
      )}
    </div>
  );
};

export default StatusBar;
