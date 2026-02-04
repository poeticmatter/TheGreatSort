import React from 'react';
import { LayoutType } from './InventoryGrid';

interface InterferenceMeterProps {
    visibleYield: number;
    trueYield: number;
    layout: LayoutType;
    className?: string;
    onClick?: () => void;
}

export const InterferenceMeter: React.FC<InterferenceMeterProps> = ({
    visibleYield,
    trueYield,
    layout,
    className,
    onClick
}) => {
    const interference = trueYield - visibleYield;
    // Clamp for visual representation between -3 and 3
    const clampedInterference = Math.min(Math.max(interference, -3), 3);

    // Determine status and styling
    let statusText = "No agents detected";
    let themeColor = "text-stone-400";
    let barColor = "bg-stone-700";
    let glowColor = "";

    if (interference < 0) {
        statusText = "Resistance Agent Detected";
        themeColor = "text-rose-500";
        barColor = "bg-rose-500";
        glowColor = "shadow-[0_0_10px_rgba(244,63,94,0.6)]";
    } else if (interference > 0) {
        statusText = "State Agent Detected";
        themeColor = "text-blue-500";
        barColor = "bg-blue-500";
        glowColor = "shadow-[0_0_10px_rgba(59,130,246,0.6)]";
    }

    // Container replicates ComplianceMeter logic
    const finalContainerClasses = layout === 'HORIZONTAL_STRIP'
        ? "relative w-[400px] flex flex-col gap-1 items-center mt-auto mb-4"
        : "w-full h-full flex flex-col items-center py-2 gap-2";

    // Meter ticks generation (-3 to +3)
    const ticks = [-3, -2, -1, 0, 1, 2, 3];

    return (
        <div
            className={`${finalContainerClasses} ${className || ''} cursor-pointer group transition-transform hover:scale-105 active:scale-95`}
            onClick={onClick}
        >
            <div className={`w-full flex flex-col items-center justify-center bg-black/80 border border-stone-800 p-3 rounded shadow-lg transition-colors duration-300 ${interference !== 0 ? 'border-opacity-50' : ''}`}>

                {/* Meter Label */}
                <div className="text-[10px] uppercase tracking-widest text-stone-500 mb-1 font-mono">
                    Interference Meter
                </div>

                {/* Meter Visual */}
                <div className="w-full h-6 flex items-center justify-between px-2 relative mb-2">
                    {/* Central Line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-stone-600 -translate-x-1/2 z-0" />

                    {ticks.map((val) => {
                        const isActive = (val === 0 && clampedInterference === 0) ||
                            (val < 0 && val >= clampedInterference && clampedInterference < 0) ||
                            (val > 0 && val <= clampedInterference && clampedInterference > 0);

                        const isCenter = val === 0;

                        // Dynamic height for "Sound Wave" look
                        const heightClass = isCenter ? "h-4" : Math.abs(val) === 3 ? "h-5" : "h-3";
                        const activeClass = isActive ? barColor : "bg-stone-800";
                        const activeGlow = isActive && val !== 0 ? glowColor : "";

                        return (
                            <div
                                key={val}
                                className={`w-2 ${heightClass} ${activeClass} ${activeGlow} rounded-sm transition-all duration-300 z-10`}
                            />
                        );
                    })}
                </div>

                {/* Status Text */}
                <div className={`text-xs font-mono font-bold tracking-tight ${themeColor} h-4`}>
                    {statusText}
                </div>
            </div>
        </div>
    );
};
