import React from 'react';

interface FooterAttributionProps {
    className?: string;
    vertical?: boolean;
}

export const FooterAttribution: React.FC<FooterAttributionProps> = ({ className = "", vertical = false }) => {
    return (
        <a
            href="https://timeshapers.com"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 group ${vertical ? 'flex-col' : ''} ${className}`}
        >
            <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest group-hover:text-cyan-300 transition-colors shadow-blue-500/50 drop-shadow-md font-bold">
                by Aurore Inara @ Timeshapers
            </span>
            <div
                className={`w-auto aspect-[67/67] text-cyan-400 group-hover:text-cyan-300 bg-current [mask-image:url(/TimeshapersLogo.svg)] [mask-size:contain] [mask-repeat:no-repeat] [mask-position:center] opacity-100 group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.8)] transition-all ${vertical ? 'h-6' : 'h-4'}`}
            />
        </a>
    );
};
