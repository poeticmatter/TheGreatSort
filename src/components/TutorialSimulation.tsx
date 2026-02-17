import React, { useState, useEffect, useMemo } from 'react';
import { InventoryGrid } from './InventoryGrid';
import { RenderableCard } from '../hooks/useGridPresentation';
import { ArrowLeftRight } from 'lucide-react';
import { useSimulationFSM } from '../hooks/useSimulationFSM';

const TutorialSimulation: React.FC = () => {
    const { phase, items } = useSimulationFSM();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Convert to RenderableCards
    const renderableCards: RenderableCard[] = useMemo(() => {
        return items.map((item, idx) => {
            // Highlighting Logic
            let isSelected = false;
            if (phase === 'HIGHLIGHT_ANCHOR' && idx === 0) isSelected = true;
            if (phase === 'HIGHLIGHT_PROTOCOL' && idx === 1) isSelected = true;

            return {
                ...item,
                key: item.id,
                isSelected,
                isCandidate: false,
                isDisabled: false,
                mirrorLabel: null,
            };
        });
    }, [items, phase]);

    // Helper text mapping
    const getPhaseText = () => {
        switch (phase) {
            case 'IDLE': return "INITIATING SEQUENCE...";
            case 'HIGHLIGHT_ANCHOR': return "ANCHOR ESTABLISHED // FIRST ITEM SURVIVES";
            case 'HIGHLIGHT_PROTOCOL': return "PROTOCOL SET: ASCENDING";
            case 'SCAN_FAIL': return "IRREGULARITY DETECTED // YIELD: 10";
            case 'TOOL_ACTIVATE': return "DEPLOYING SWAP TOOL...";
            case 'SWAP_EXECUTE': return "REORDERING...";
            case 'SCAN_PASS': return "VERIFYING COMPLIANCE...";
            case 'SUCCESS': return "OPTIMAL CONFIGURATION // YIELD: 14";
            case 'RESET': return "REBOOTING SIMULATION...";
            default: return "";
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-4 bg-stone-950/50 rounded-lg border border-stone-800 w-full mb-4 relative overflow-hidden">

            {/* Simulation Label */}
            <div className="absolute top-2 left-2 text-[10px] text-stone-600 font-mono uppercase tracking-widest">
                Sim_Mode: Training_Loop_V0.4
            </div>

            <div className="relative mt-6 w-full flex justify-center">
                <InventoryGrid
                    cards={renderableCards}
                    layout={isMobile ? 'VERTICAL_LIST' : 'HORIZONTAL_STRIP'}
                    disabled={true} // Disable interactions
                />

                {/* Swap Overlay */}
                {phase === 'TOOL_ACTIVATE' && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                        <div className="flex items-center justify-center">
                            {/* Positioning hack */}
                            <div className={`
                                bg-amber-500 text-stone-900 p-2 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.6)] animate-bounce 
                                ${isMobile ? 'mt-10 rotate-90' : 'ml-20'}
                            `}>
                                <ArrowLeftRight size={24} strokeWidth={3} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Status Text */}
            <div className="mt-2 h-6 flex items-center justify-center">
                <span className={`
            font-mono text-xs tracking-widest uppercase transition-colors duration-300
            ${phase === 'SCAN_FAIL' ? 'text-red-500 animate-pulse' : ''}
            ${phase === 'SUCCESS' ? 'text-green-500' : ''}
            ${(phase !== 'SCAN_FAIL' && phase !== 'SUCCESS') ? 'text-amber-500/80' : ''}
        `}>
                    {getPhaseText()}
                </span>
            </div>

        </div>
    );
};

export default TutorialSimulation;
