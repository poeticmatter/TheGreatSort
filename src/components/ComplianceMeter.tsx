import React from 'react';
import { LayoutType } from './InventoryGrid';

interface ComplianceMeterProps {
    compliancePercentage: number;
    moodText: string;
    moodColor: string;
    layout: LayoutType;
    className?: string;
}

export const ComplianceMeter: React.FC<ComplianceMeterProps> = ({
    compliancePercentage,
    moodText,
    moodColor,
    layout,
    className
}) => {
    const isHorizontal = layout === 'HORIZONTAL_STRIP';

    // Container: 
    // - Horizontal: Fixed at bottom/top or passed className (App uses it in place of Minimap)
    // - Vertical: Left sidebar column

    const containerClasses = isHorizontal
        ? "fixed bottom-24 left-1/2 -translate-x-1/2 z-30 w-[300px] flex flex-col gap-1 pointer-events-none" // Desktop Floating Position (similar to where minimap was or Footer area)
        : "w-full h-full flex flex-col items-center justify-center gap-2 pointer-events-none"; // Vertical Sidebar

    // Progress Bar Wrapper
    const barWrapperClasses = `
    relative bg-stone-900/90 border border-stone-700/50 backdrop-blur-sm shadow-xl rounded-sm overflow-hidden p-1
    ${isHorizontal ? 'w-full h-8 flex items-center' : 'w-12 h-64 flex flex-col-reverse justify-start items-center'}
  `;

    // The Bar Itself
    // We use inline style for width/height based on percentage
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

    // Text
    // Horizontal: Below bar? Or Inside? Design says "below it".
    // Vertical: Below bar (at bottom of column).
    const textClasses = isHorizontal
        ? `text-center text-[10px] font-mono tracking-widest uppercase font-bold drop-shadow-md ${moodColor}`
        : `text-center text-[9px] font-mono tracking-widest uppercase font-bold rotate-180 py-4 ${moodColor} [writing-mode:vertical-rl]`;


    // If replacing minimap, we need to respect the className passed from App used for positioning if any.
    // The App passes `className` to Minimap in some contexts? Minimap definition allowed it.
    // In App.tsx, Minimap is used:
    // 1. Vertical Layout: Inside a div, no className passed.
    // 2. Standard Layout: `<Minimap sequence={...} layout={layout} />` (No className)
    // But Minimap had its own fixed positioning logic inside.

    // We need to coordinate the "floating" nature.
    // Minimap logic:
    // if Horizontal: "w-full flex justify-center z-30 shrink-0 py-2 px-4" (In standard layout, checks `layout`)
    // Wait, in App.tsx line 300: `<Minimap ... layout={layout} />` is rendered in valid flow or absolute?
    // In App line 223 (Vertical): It's in a sidebar div.
    // In App line 300 (Standard): It's just rendered. Minimap itself had `fixed top-1/2 left-4` logic for standard floating.

    // Requirement: "ComplianceMeter ... Render a progress bar that is horizontal on desktop and vertical on mobile".
    // "Standard" (Desktop) -> Horizontal Meter.
    // "Vertical" (Mobile/Small) -> Vertical Meter.

    // Let's refine the positioning logic based on `layout`.

    const finalContainerClasses = layout === 'HORIZONTAL_STRIP'
        ? "fixed bottom-24 left-1/2 -translate-x-1/2 z-30 w-[400px] flex flex-col gap-1 items-center pointer-events-none" // Floating Desktop
        : "w-full h-full flex flex-col items-center py-2 gap-2 pointer-events-none"; // Vertical Sidebar

    return (
        <div className={`${finalContainerClasses} ${className || ''}`}>
            {/* Percentage Label (Optional, but nice to see exact number) */}
            <div className={`font-mono text-xs text-stone-500 ${layout === 'VERTICAL_LIST' ? '' : 'absolute -right-8 top-2'}`}>
                {compliancePercentage}%
            </div>

            <div className={barWrapperClasses}>
                <div className={barFillClasses} style={barStyle} />
            </div>

            <div className={textClasses}>
                {moodText}
            </div>
        </div>
    );
};
