import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, ChevronDown, Lock, GraduationCap, ShieldAlert } from 'lucide-react';
import { GameMode, GamePhase } from '../../types';
import { PersistenceService } from '../services/persistence';

interface HeaderProps {
  level: number;
  levelScore: number;
  totalScore: number;
  totalOptimalScore: number;
  gameMode: GameMode;
  phase: GamePhase;
  optimalScore: number | null;
  detectedMode: 'ASC' | 'DESC' | null;
  onChangeMode: (mode: GameMode) => void;

  onOpenRules: () => void;
}

const Header: React.FC<HeaderProps> = ({
  level, levelScore, totalScore, totalOptimalScore, gameMode,
  phase, optimalScore, detectedMode,
  onChangeMode, onOpenRules
}) => {
  const [showModeMenu, setShowModeMenu] = useState(false);
  const navigate = useNavigate();



  const totalEfficiency = totalOptimalScore > 0
    ? Math.round((totalScore / totalOptimalScore) * 100)
    : 0;

  return (
    <header className="px-6 py-4 border-b-4 border-red-900 bg-gradient-to-r from-red-950 to-stone-900 shadow-xl flex flex-col md:flex-row justify-center items-center gap-6 md:gap-12 z-50 sticky top-0">
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Star className="text-amber-500 fill-amber-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" size={32} />
            <div className="absolute inset-0 blur-sm bg-amber-500/30 rounded-full"></div>
          </div>
          <h1 className="text-xl sm:text-3xl font-[Cinzel] font-bold text-amber-500 tracking-widest uppercase drop-shadow-md whitespace-nowrap">
            The Great Sort
          </h1>
        </div>

        <div className="flex items-center gap-6 mt-2 ml-1 z-50">
          {/* Manual Button */}
          <button
            onClick={onOpenRules}
            className="flex items-center gap-1 text-[12px] font-[Courier] uppercase tracking-[0.2em] text-stone-400 hover:text-amber-500 transition-colors"
          >
            Manual <span className="text-amber-500 font-bold">?</span>
          </button>

          {/* Mode Selector */}
          <div className="relative">
            <button
              onClick={() => setShowModeMenu(!showModeMenu)}
              disabled={phase === GamePhase.INSPECTING}
              className={`flex items-center gap-1 text-[12px] font-[Courier] uppercase tracking-[0.2em] transition-colors ${phase === GamePhase.INSPECTING
                ? 'text-stone-600 cursor-not-allowed opacity-50'
                : 'text-stone-400 hover:text-amber-500'
                }`}
            >
              Mode: <span className="text-amber-500 font-bold">{gameMode === 'PRACTICE' ? 'TRAINING' : (gameMode === 'RESISTANCE' ? 'DAILY' : gameMode)}</span> <ChevronDown size={12} />
            </button>

            {showModeMenu && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-stone-900 border border-stone-700 shadow-xl rounded-sm flex flex-col p-1 z-50">
                {/* Standard Modes */}
                <button
                  onClick={() => { onChangeMode('DAILY'); setShowModeMenu(false); }}
                  className={`text-left px-3 py-2 text-xs font-[Courier] uppercase tracking-wider hover:bg-stone-800 ${gameMode === 'DAILY' ? 'text-amber-500 font-bold' : 'text-stone-400'}`}
                >
                  Daily Challenge
                </button>

                <button
                  onClick={() => { onChangeMode('PRACTICE'); setShowModeMenu(false); }}
                  className={`text-left px-3 py-2 text-xs font-[Courier] uppercase tracking-wider hover:bg-stone-800 ${gameMode === 'PRACTICE' ? 'text-amber-500 font-bold' : 'text-stone-400'}`}
                >
                  Training
                </button>

                <div className="h-px bg-stone-700 my-1 opacity-50" />

                {/* Tutorial */}
                <button
                  onClick={() => {
                    navigate('/tutorial');
                    setShowModeMenu(false);
                  }}
                  className={`text-left px-3 py-2 text-xs font-[Courier] uppercase tracking-wider hover:bg-stone-800 flex items-center gap-2 ${gameMode === 'TUTORIAL' ? 'text-amber-500 font-bold' : 'text-stone-400'}`}
                >
                  <GraduationCap size={14} />
                  Tutorial
                </button>

                {/* Resistance Mode */}
                {(() => {
                  const isUnlocked = PersistenceService.loadResistanceStatus();
                  return (
                    <button
                      disabled={!isUnlocked}
                      onClick={() => {
                        if (isUnlocked) {
                          onChangeMode('RESISTANCE' as GameMode);
                          setShowModeMenu(false);
                        }
                      }}
                      className={`text-left px-3 py-2 text-xs font-[Courier] uppercase tracking-wider flex items-center gap-2 w-full
                            ${!isUnlocked ? 'opacity-50 cursor-not-allowed text-stone-600' : 'hover:bg-stone-800 cursor-pointer'}
                            ${gameMode === 'RESISTANCE' ? 'text-amber-500 font-bold' : (!isUnlocked ? 'text-stone-600' : 'text-stone-400')}
                        `}
                      title={!isUnlocked ? "Decrypting..." : "Resistance Mode"}
                    >
                      {!isUnlocked ? <Lock size={14} /> : <ShieldAlert size={14} />}
                      Resistance
                    </button>
                  );
                })()}

              </div>
            )}
          </div>





        </div>
      </div>
    </header>
  );
};

export default Header;
