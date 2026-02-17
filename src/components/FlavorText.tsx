import React, { useState, useEffect } from 'react';
import { FlavorKey, FLAVOR_COLORS } from '../config/flavorText';

interface FlavorTextProps {
    mood: FlavorKey;
    text: string;
}

export const FlavorText: React.FC<FlavorTextProps> = ({ mood, text }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const textColorClass = FLAVOR_COLORS[mood] || "text-stone-500";

    // Typing effect logic
    useEffect(() => {
        setDisplayedText('');
        setIsTyping(true);
        let currentIndex = 0;

        const intervalId = setInterval(() => {
            currentIndex++;
            if (currentIndex <= text.length) {
                setDisplayedText(text.slice(0, currentIndex));
            } else {
                setIsTyping(false);
                clearInterval(intervalId);
            }
        }, 30); // Typing speed

        return () => clearInterval(intervalId);
    }, [text]);

    return (
        <div className={`
            font-[Courier_Prime] text-sm md:text-base tracking-wider font-bold 
            text-center transition-all duration-500 
            ${textColorClass} 
            bg-stone-950/40 border-y border-stone-800/50 
            py-3 px-6 rounded-sm min-h-[3rem] flex items-center justify-center
            relative overflow-hidden
        `}>
            {/* Scanline effect overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,11,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%] pointer-events-none" />

            <span className="relative z-10 drop-shadow-md">
                {displayedText}
                <span className={`inline-block w-2 h-4 align-middle ml-1 bg-stone-500/50 ${isTyping ? 'animate-pulse' : 'animate-bounce opacity-50'}`}></span>
            </span>
        </div>
    );
};
