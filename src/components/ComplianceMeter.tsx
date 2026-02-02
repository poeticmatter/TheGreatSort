import React from 'react';
import { LayoutType } from './InventoryGrid';

interface ComplianceMeterProps {
    compliancePercentage: number;
    layout: LayoutType;
    className?: string;
    resistanceMode?: boolean;
    trueYield?: number;
}

export const ComplianceMeter: React.FC<ComplianceMeterProps> = ({
    compliancePercentage,
    layout,
    className,
    resistanceMode = false,
    trueYield = 0
}) => {
    const isHorizontal = layout === 'HORIZONTAL_STRIP';

    // Container: 
    // - Horizontal: Fixed at bottom/top or passed className (App uses it in place of Minimap)
    // - Vertical: Left sidebar column

    const finalContainerClasses = layout === 'HORIZONTAL_STRIP'
        ? "relative w-[400px] flex flex-col gap-1 items-center pointer-events-none mt-auto mb-4" // Static in document flow
        : "w-full h-full flex flex-col items-center py-2 gap-2 pointer-events-none"; // Vertical Sidebar

    // Progress Bar Wrapper
    const barWrapperClasses = `
    relative bg-stone-900/90 border border-stone-700/50 backdrop-blur-sm shadow-xl rounded-sm overflow-hidden p-1
    ${isHorizontal ? 'w-full h-8 flex items-center' : 'w-12 h-64 flex flex-col-reverse justify-start items-center'}
  `;

    // The Bar Itself
    const barFillClasses = `
    transition-all duration-700 ease-out shadow-[0_0_10px_rgba(255,255,255,0.1)]
    ${compliancePercentage >= 95 ? 'bg-gradient-to-r from-amber-500 to-yellow-300' :
            (compliancePercentage >= 90 ? 'bg-stone-300' : 'bg-stone-600')
        }
    ${isHorizontal ? 'h-full rounded-sm' : 'w-full rounded-sm'}
  `;

    const barStyle = isHorizontal
        ? { width: `${compliancePercentage}%` }
        : { height: `${compliancePercentage}%` };

    return (
        <div className={`${finalContainerClasses} ${className || ''}`}>

            {/* Resistance Mode: True Yield Digital Display */}
            {resistanceMode ? (
                <div className="w-full h-full flex items-center justify-center">
                    <div className="bg-black/80 border border-blue-900/50 p-2 rounded w-full flex flex-col items-center shadow-[0_0_15px_rgba(30,58,138,0.5)]">
                        <div className="text-[10px] uppercase tracking-widest text-blue-400 font-mono mb-0.5">TRUE YIELD</div>
                        <div className="text-2xl font-mono text-blue-500 font-bold tracking-tighter leading-none glow-text">
                            {trueYield}
                        </div>
                    </div>
                </div>
            ) : (
                /* Standard Compliance Mode */
                <>
                    {/* Percentage Label */}
                    <div className={`font-mono text-xs text-stone-500 ${layout === 'VERTICAL_LIST' ? '' : 'absolute -right-8 top-2'}`}>
                        {compliancePercentage}%
                    </div>

                    <div className={barWrapperClasses}>
                        <div className={barFillClasses} style={barStyle} />
                    </div>
                </>
            )}
        </div>
    );
};
