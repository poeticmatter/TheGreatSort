import React from 'react';
import { LayoutType } from './InventoryGrid';

interface ComplianceMeterProps {
    compliancePercentage: number;
    targetPercentage?: number;
    layout: LayoutType;
    className?: string;
}

export const ComplianceMeter: React.FC<ComplianceMeterProps> = ({
    compliancePercentage,
    targetPercentage,
    layout,
    className
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
    // Determine Color State
    const isResistanceSuccess = targetPercentage !== undefined && compliancePercentage >= targetPercentage;

    const barFillClasses = `
    transition-all duration-700 ease-out shadow-[0_0_10px_rgba(255,255,255,0.1)]
    ${isResistanceSuccess
            ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)]' // Blue for Resistance Success
            : compliancePercentage >= 95 ? 'bg-gradient-to-r from-amber-500 to-yellow-300'
                : (compliancePercentage >= 90 ? 'bg-stone-300' : 'bg-stone-600')
        }
    ${isHorizontal ? 'h-full rounded-sm' : 'w-full rounded-sm'}
  `;

    const barStyle = isHorizontal
        ? { width: `${compliancePercentage}%` }
        : { height: `${compliancePercentage}%` };

    return (
        <div className={`${finalContainerClasses} ${className || ''}`}>
            {/* Percentage Label */}
            <div className={`font-mono text-xs ${isResistanceSuccess ? 'text-blue-400 font-bold' : 'text-stone-500'} ${layout === 'VERTICAL_LIST' ? '' : 'absolute -right-8 top-2'}`}>
                {compliancePercentage}%
            </div>

            <div className={barWrapperClasses}>
                <div className={barFillClasses} style={barStyle} />

                {/* Target Line */}
                {targetPercentage !== undefined && (
                    <div
                        className={`absolute bg-blue-500 shadow-[0_0_8px_#3b82f6] z-10 ${isHorizontal ? 'h-full w-0.5 top-0' : 'w-full h-0.5 left-0'}`}
                        style={isHorizontal
                            ? { left: `${targetPercentage}%`, transform: 'translateX(-50%)' }
                            : { bottom: `${targetPercentage}%`, transform: 'translateY(50%)' }
                        }
                    />
                )}
            </div>
        </div>
    );
};
