import React from 'react';
import { LayoutType } from './InventoryGrid';

interface ResistanceYieldProps {
    visibleYield: number;
    trueYield: number;
    layout: LayoutType;
    className?: string;
}

export const ResistanceYield: React.FC<ResistanceYieldProps> = ({
    visibleYield,
    trueYield,
    layout,
    className
}) => {
    // Replicate container logic from ComplianceMeter for consistency
    const finalContainerClasses = layout === 'HORIZONTAL_STRIP'
        ? "relative w-[400px] flex flex-col gap-1 items-center pointer-events-none mt-auto mb-4" // Static in document flow
        : "w-full h-full flex flex-col items-center py-2 gap-2 pointer-events-none"; // Vertical Sidebar

    return (
        <div className={`${finalContainerClasses} ${className || ''}`}>
            <div className="w-full flex items-center justify-center">
                <div className="bg-black/80 border border-blue-900/50 p-2 rounded w-full flex flex-row items-center justify-around shadow-[0_0_15px_rgba(30,58,138,0.5)]">
                    {/* Visible Yield */}
                    <div className="flex flex-col items-center">
                        <div className="text-[8px] uppercase tracking-widest text-stone-400 font-mono">YIELD</div>
                        <div className="text-lg font-mono text-stone-300 font-bold tracking-tighter leading-none">
                            {visibleYield}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-8 bg-blue-900/50" />

                    {/* True Yield */}
                    <div className="flex flex-col items-center">
                        <div className="text-[8px] uppercase tracking-widest text-blue-400 font-mono">TRUE</div>
                        <div className="text-lg font-mono text-blue-500 font-bold tracking-tighter leading-none glow-text">
                            {trueYield}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
