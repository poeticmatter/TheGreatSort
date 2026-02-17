import React from 'react';
import { Star } from 'lucide-react';
import ModeMenu from './ModeMenu';
import { GameMode, GamePhase } from '../../types';

interface HeaderProps {
  gameMode: GameMode;
  phase: GamePhase;
  onChangeMode: (mode: GameMode) => void;

  onOpenRules: () => void;
  onShowResistanceLocked: () => void;
  hasJoinedResistance: boolean;
}

const Header: React.FC<HeaderProps> = ({
  gameMode,
  phase,
  onChangeMode, onOpenRules, onShowResistanceLocked, hasJoinedResistance
}) => {






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
            className="flex items-center gap-1 text-[12px] font-['Courier_Prime'] uppercase tracking-[0.2em] text-stone-400 hover:text-amber-500 transition-colors"
          >
            Manual <span className="text-amber-500 font-bold">?</span>
          </button>

          {/* Mode Selector */}
          <ModeMenu
            gameMode={gameMode}
            phase={phase}
            onChangeMode={onChangeMode}
            hasJoinedResistance={hasJoinedResistance}
            onShowResistanceLocked={onShowResistanceLocked}
          />





        </div>
      </div>
    </header>
  );
};

export default Header;
