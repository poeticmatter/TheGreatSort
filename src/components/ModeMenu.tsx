import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Lock, GraduationCap, ShieldAlert } from 'lucide-react';
import { GameMode, GamePhase } from '../../types';

interface ModeMenuProps {
    gameMode: GameMode;
    phase: GamePhase;
    onChangeMode: (mode: GameMode) => void;
    hasJoinedResistance: boolean;
    onShowResistanceLocked: () => void;
}

const ModeMenu: React.FC<ModeMenuProps> = ({
    gameMode,
    phase,
    onChangeMode,
    hasJoinedResistance,
    onShowResistanceLocked
}) => {
    const [showModeMenu, setShowModeMenu] = useState(false);
    const navigate = useNavigate();

    const getCurrentModeLabel = () => {
        if (gameMode === 'TUTORIAL') return 'TUTORIAL';
        if (gameMode === 'PRACTICE') return 'TRAINING';
        return hasJoinedResistance ? 'RESISTANCE' : 'DAILY QUOTA';
    };

    return (
        <div className="relative">
            <button
                onClick={() => setShowModeMenu(!showModeMenu)}
                disabled={phase === GamePhase.INSPECTING}
                className={`flex items-center gap-1 text-[12px] font-['Courier_Prime'] uppercase tracking-[0.2em] transition-colors ${phase === GamePhase.INSPECTING
                    ? 'text-stone-600 cursor-not-allowed opacity-50'
                    : 'text-stone-400 hover:text-amber-500'
                    }`}
            >
                Mode: <span className="text-amber-500 font-bold">
                    {getCurrentModeLabel()}
                </span> <ChevronDown size={12} />
            </button>

            {showModeMenu && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-stone-900 border border-stone-700 shadow-xl rounded-sm flex flex-col p-1 z-50">

                    {/* Daily Quota / Active Resistance Toggle */}
                    <button
                        onClick={() => {
                            if (gameMode === 'TUTORIAL') {
                                navigate('/');
                            }
                            onChangeMode('DAILY');
                            setShowModeMenu(false);
                        }}
                        className={`text-left px-3 py-2 text-xs font-['Courier_Prime'] uppercase tracking-wider flex items-center gap-2 w-full hover:bg-stone-800 cursor-pointer
                    ${(gameMode === 'DAILY') ? 'text-amber-500 font-bold' : 'text-stone-400'}
                `}
                    >
                        {hasJoinedResistance ? <ShieldAlert size={14} /> : null}
                        {hasJoinedResistance ? 'Resistance' : 'Daily'}
                    </button>

                    {/* Training (Always Available) */}
                    <button
                        onClick={() => {
                            if (gameMode === 'TUTORIAL') {
                                navigate('/');
                            }
                            onChangeMode('PRACTICE');
                            setShowModeMenu(false);
                        }}
                        className={`text-left px-3 py-2 text-xs font-['Courier_Prime'] uppercase tracking-wider hover:bg-stone-800 ${gameMode === 'PRACTICE' ? 'text-amber-500 font-bold' : 'text-stone-400'}`}
                    >
                        Training
                    </button>

                    <div className="h-px bg-stone-700 my-1 opacity-50" />

                    {/* Tutorial (Always Available) */}
                    <button
                        onClick={() => {
                            navigate('/tutorial');
                            setShowModeMenu(false);
                        }}
                        className={`text-left px-3 py-2 text-xs font-['Courier_Prime'] uppercase tracking-wider hover:bg-stone-800 flex items-center gap-2 ${gameMode === 'TUTORIAL' ? 'text-amber-500 font-bold' : 'text-stone-400'}`}
                    >
                        <GraduationCap size={14} />
                        Tutorial
                    </button>

                    {/* Legacy Locked Slot - Only show if specifically NOT joined */}
                    {!hasJoinedResistance && (
                        <button
                            onClick={() => {
                                onShowResistanceLocked();
                                setShowModeMenu(false);
                            }}
                            className={`text-left px-3 py-2 text-xs font-['Courier_Prime'] uppercase tracking-wider flex items-center gap-2 w-full hover:bg-stone-800 cursor-pointer text-stone-500`}
                            title="Decrypting..."
                        >
                            <Lock size={14} />
                            Resistance
                        </button>
                    )}

                </div>
            )}
        </div>
    );
};

export default ModeMenu;
