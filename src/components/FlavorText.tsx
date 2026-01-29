import React from 'react';
import { FlavorKey } from '../config/flavorText';

interface FlavorTextProps {
    mood: FlavorKey;
    text: string;
}

export const FlavorText: React.FC<FlavorTextProps> = ({ mood, text }) => {
    const getMoodColor = (m: FlavorKey) => {
        switch (m) {
            case 'IDLE': return "text-stone-500";
            case 'NORMAL': return "text-amber-500";
            case 'CONCERNED': return "text-yellow-500";
            case 'HOSTILE': return "text-orange-600";
            case 'CRITICAL': return "text-red-600 animate-pulse";
            default: return "text-stone-500";
        }
    };

    const textColorClass = getMoodColor(mood);

    return (
        <div className={`font-mono text-[10px] tracking-widest uppercase font-bold drop-shadow-md text-center transition-colors duration-500 ${textColorClass} border-stone-800/30 p-1`}>
            {text}
        </div>
    );
};
