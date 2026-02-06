import React from 'react';
import { LayoutType } from './InventoryGrid';

interface TrainingScoreDisplayProps {
    levelScore: number;
    optimalScore: number | null;
    layout: LayoutType;
    className?: string;
}

export const TrainingScoreDisplay: React.FC<TrainingScoreDisplayProps> = ({
    levelScore,
    optimalScore,
    layout,
    className
}) => {
    const isHorizontal = layout === 'HORIZONTAL_STRIP';
    const percentage = optimalScore ? Math.round((levelScore / optimalScore) * 100) : 0;
    const isPerfect = percentage >= 100;

    // Container adapts to layout
    const containerClasses = isHorizontal
        ? "relative w-[400px] flex flex-col gap-2 items-center mt-auto mb-4"
        : "w-full h-full flex flex-col items-center justify-center py-4 gap-3";

    return (
        <div className={`${containerClasses} ${className || ''}`}>
            {/* Label */}
            <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-[Cinzel]">
                Training Yield
            </div>

            {/* Score Display */}
            <div className={`
                relative overflow-hidden
                font-mono text-center
                bg-gradient-to-b from-stone-900 to-stone-950
                border border-stone-700/50 
                rounded-sm shadow-lg
                ${isHorizontal ? 'px-6 py-3' : 'px-4 py-3 w-16'}
            `}>
                {/* Glow effect when perfect */}
                {isPerfect && (
                    <div className="absolute inset-0 bg-amber-500/10 animate-pulse" />
                )}

                {/* Current Score */}
                <div className={`
                    relative text-2xl font-bold tracking-tight
                    ${isPerfect ? 'text-amber-400' : 'text-amber-500/90'}
                    ${isPerfect ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' : ''}
                `}>
                    {levelScore}
                </div>

                {/* Divider */}
                <div className={`
                    my-1 mx-auto 
                    ${isHorizontal ? 'w-12' : 'w-8'} 
                    h-px bg-gradient-to-r from-transparent via-stone-600 to-transparent
                `} />

                {/* Optimal Score */}
                <div className="relative text-sm text-stone-400 font-medium">
                    {optimalScore ?? '—'}
                </div>
            </div>

            {/* Percentage indicator */}
            <div className={`
                text-xs font-mono
                ${isPerfect ? 'text-amber-400' : percentage >= 90 ? 'text-stone-300' : 'text-stone-500'}
            `}>
                {percentage}%
            </div>
        </div>
    );
};
