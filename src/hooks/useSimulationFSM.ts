import { useState, useEffect } from 'react';
import { CardItem, AgentRole } from '../../types';

export type SimulationPhase =
    | 'IDLE'
    | 'HIGHLIGHT_ANCHOR'
    | 'HIGHLIGHT_PROTOCOL'
    | 'SCAN_FAIL'
    | 'TOOL_ACTIVATE'
    | 'SWAP_EXECUTE'
    | 'SCAN_PASS'
    | 'SUCCESS'
    | 'RESET';

const TRANSITIONS: Record<SimulationPhase, { next: SimulationPhase; delay: number }> = {
    'IDLE': { next: 'HIGHLIGHT_ANCHOR', delay: 1200 },
    'HIGHLIGHT_ANCHOR': { next: 'HIGHLIGHT_PROTOCOL', delay: 2400 },
    'HIGHLIGHT_PROTOCOL': { next: 'SCAN_FAIL', delay: 2400 },
    'SCAN_FAIL': { next: 'TOOL_ACTIVATE', delay: 2400 },
    'TOOL_ACTIVATE': { next: 'SWAP_EXECUTE', delay: 1200 },
    'SWAP_EXECUTE': { next: 'SCAN_PASS', delay: 600 },
    'SCAN_PASS': { next: 'SUCCESS', delay: 2400 },
    'SUCCESS': { next: 'RESET', delay: 3000 },
    'RESET': { next: 'IDLE', delay: 600 }
};

export function useSimulationFSM() {
    const [phase, setPhase] = useState<SimulationPhase>('IDLE');

    // Items state managed internally
    const [items, setItems] = useState<CardItem[]>([
        { id: 't1', val: 3, status: 'pending', role: AgentRole.NONE },
        { id: 't2', val: 7, status: 'pending', role: AgentRole.NONE },
        { id: 't3', val: 4, status: 'pending', role: AgentRole.NONE },
    ]);

    // Transition Timer
    useEffect(() => {
        const { next, delay } = TRANSITIONS[phase];
        const timer = setTimeout(() => {
            setPhase(next);
        }, delay);

        return () => clearTimeout(timer);
    }, [phase]);

    // Phase Entry Logic
    useEffect(() => {
        switch (phase) {
            case 'SCAN_FAIL':
                setItems(prev => {
                    const next = [...prev];
                    // 7 is at index 1, 4 is at index 2. 4 < 7 (Descending required?)
                    // Tutorial scenario: 3, 7, 4. 
                    // Anchor 3. 
                    // Protocol: ?
                    // "SCAN_FAIL"
                    // The original code set index 2 (the 4) to eliminated.

                    if (next[2]) next[2] = { ...next[2], status: 'eliminated' };
                    return next;
                });
                break;

            case 'SWAP_EXECUTE':
                // Perform Swap: [3, 7, 4] -> [3, 4, 7]
                // Reset status to pending
                setItems([
                    { id: 't1', val: 3, status: 'pending', role: AgentRole.NONE },
                    { id: 't3', val: 4, status: 'pending', role: AgentRole.NONE },
                    { id: 't2', val: 7, status: 'pending', role: AgentRole.NONE },
                ]);
                break;

            case 'SCAN_PASS':
                setItems(prev => prev.map(i => ({ ...i, status: 'scanning' })));
                break;

            case 'SUCCESS':
                setItems(prev => prev.map(i => ({ ...i, status: 'safe' })));
                break;

            case 'RESET':
                // Reset to initial state
                setItems([
                    { id: 't1', val: 3, status: 'pending', role: AgentRole.NONE },
                    { id: 't2', val: 7, status: 'pending', role: AgentRole.NONE },
                    { id: 't3', val: 4, status: 'pending', role: AgentRole.NONE },
                ]);
                break;
        }
    }, [phase]);

    return { phase, items };
}
