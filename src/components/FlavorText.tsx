import React, { useMemo, useState, useEffect } from 'react';
import { SystemMood } from '../hooks/useSystemMood';
import { FLAVOR_TEXT, FlavorCategory } from '../config/flavorText';

interface FlavorTextProps {
    mood: SystemMood;
    moodColor: string;
    isIdle?: boolean;
}

export const FlavorText: React.FC<FlavorTextProps> = ({ mood, moodColor, isIdle }) => {
    const [displayText, setDisplayText] = useState("");

    // Determine current category
    const category: FlavorCategory = isIdle ? 'IDLE' : mood;

    // Logic: When category changes, pick a new line.
    // We use a useEffect or useMemo.
    // To avoid jitter, we store the current text in state and only update when category changes.

    useEffect(() => {
        const options = FLAVOR_TEXT[category];
        if (!options || options.length === 0) return;

        // Weighted Random
        const totalWeight = options.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        let selected = options[0].text;

        for (const item of options) {
            random -= item.weight;
            if (random < 0) {
                selected = item.text;
                break;
            }
        }
        setDisplayText(selected);
    }, [category]);

    // Use the passed moodColor for coloring, unless IDLE (which might be neutral)
    const textColorClass = isIdle ? "text-stone-500" : moodColor;

    return (
        <div className={`font-mono text-[10px] tracking-widest uppercase font-bold drop-shadow-md text-center transition-colors duration-500 ${textColorClass}`}>
            {displayText}
        </div>
    );
};
