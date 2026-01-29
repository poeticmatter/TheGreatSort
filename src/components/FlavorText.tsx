import React from 'react';
import { FlavorKey, FLAVOR_COLORS } from '../config/flavorText';

interface FlavorTextProps {
    mood: FlavorKey;
    text: string;
}

export const FlavorText: React.FC<FlavorTextProps> = ({ mood, text }) => {
    const textColorClass = FLAVOR_COLORS[mood] || "text-stone-500";

    return (
        <div className={`font-mono text-[10px] tracking-widest uppercase font-bold drop-shadow-md text-center transition-colors duration-500 ${textColorClass} border-stone-800/30 p-1`}>
            {text}
        </div>
    );
};
