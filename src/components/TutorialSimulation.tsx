import React, { useState, useEffect, useMemo } from 'react';
import { InventoryGrid } from './InventoryGrid';
import { CardItem, AgentRole, CardStatus } from '../../types';
import { RenderableCard } from '../hooks/useGridPresentation';
import { ArrowLeftRight } from 'lucide-react';

type SimulationPhase =
    | 'IDLE'
    | 'HIGHLIGHT_ANCHOR'
    | 'HIGHLIGHT_PROTOCOL'
    | 'SCAN_FAIL'
    | 'TOOL_ACTIVATE'
    | 'SWAP_EXECUTE'
    | 'SCAN_PASS'
    | 'SUCCESS'
    | 'RESET';

const TutorialSimulation: React.FC = () => {
    const [phase, setPhase] = useState<SimulationPhase>('IDLE');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Base items: 3, 7, 4
    const [items, setItems] = useState<CardItem[]>([
        { id: 't1', val: 3, status: 'pending', role: AgentRole.NONE },
        { id: 't2', val: 7, status: 'pending', role: AgentRole.NONE },
        { id: 't3', val: 4, status: 'pending', role: AgentRole.NONE },
    ]);

    useEffect(() => {
        let timer: NodeJS.Timeout;

        const runPhase = () => {
            switch (phase) {
                case 'IDLE':
                    // Start -> Wait 1.2s -> HIGHLIGHT_ANCHOR
                    timer = setTimeout(() => {
                        setPhase('HIGHLIGHT_ANCHOR');
                    }, 1200);
                    break;

                case 'HIGHLIGHT_ANCHOR':
                    // Highlight index 0
                    // Wait 2.4s -> HIGHLIGHT_PROTOCOL
                    timer = setTimeout(() => {
                        setPhase('HIGHLIGHT_PROTOCOL');
                    }, 2400);
                    break;

                case 'HIGHLIGHT_PROTOCOL':
                    // Highlight index 1
                    // Wait 2.4s -> SCAN_FAIL
                    timer = setTimeout(() => {
                        setPhase('SCAN_FAIL');
                    }, 2400);
                    break;

                case 'SCAN_FAIL':
                    // Update items to show error
                    setItems(prev => {
                        const next = [...prev];
                        next[2] = { ...next[2], status: 'eliminated' }; // The 4 fails
                        return next;
                    });
                    // Wait 2.4s -> TOOL_ACTIVATE (Longer to read Yield)
                    timer = setTimeout(() => {
                        setPhase('TOOL_ACTIVATE');
                    }, 2400);
                    break;

                case 'TOOL_ACTIVATE':
                    // Show Swap Icon Overlay
                    // Wait 1.2s -> SWAP_EXECUTE
                    timer = setTimeout(() => {
                        setPhase('SWAP_EXECUTE');
                    }, 1200);
                    break;

                case 'SWAP_EXECUTE':
                    // Perform Swap: [3, 7, 4] -> [3, 4, 7]
                    // Reset status to pending
                    setItems([
                        { id: 't1', val: 3, status: 'pending', role: AgentRole.NONE },
                        { id: 't3', val: 4, status: 'pending', role: AgentRole.NONE },
                        { id: 't2', val: 7, status: 'pending', role: AgentRole.NONE },
                    ]);
                    // Wait 0.6s -> SCAN_PASS
                    timer = setTimeout(() => {
                        setPhase('SCAN_PASS');
                    }, 600);
                    break;

                case 'SCAN_PASS':
                    // Set all to scanning
                    setItems(prev => prev.map(i => ({ ...i, status: 'scanning' })));
                    // Wait 2.4s -> SUCCESS
                    timer = setTimeout(() => {
                        setPhase('SUCCESS');
                    }, 2400);
                    break;

                case 'SUCCESS':
                    // Set all to safe
                    setItems(prev => prev.map(i => ({ ...i, status: 'safe' })));
                    // Wait 3s -> RESET (Read yield)
                    timer = setTimeout(() => {
                        setPhase('RESET');
                    }, 3000);
                    break;

                case 'RESET':
                    // Reset to initial state
                    setItems([
                        { id: 't1', val: 3, status: 'pending', role: AgentRole.NONE },
                        { id: 't2', val: 7, status: 'pending', role: AgentRole.NONE },
                        { id: 't3', val: 4, status: 'pending', role: AgentRole.NONE },
                    ]);
                    // Wait 0.6s -> IDLE
                    timer = setTimeout(() => {
                        setPhase('IDLE');
                    }, 600);
                    break;
            }
        };

        runPhase();

        return () => clearTimeout(timer);
    }, [phase]);

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
                            {/* Positioning hack: We want the arrow between index 1 and 2 */}
                            {/* 
                   Cards are roughly w-20 (80px) + gap.
                   We have 3 cards. Center is card 1. 
                   We want arrow between card 1 (7) and card 2 (4).
                   That's roughly to the right of the center.
                */}
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
