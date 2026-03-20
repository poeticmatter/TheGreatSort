import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, BookOpen } from 'lucide-react';
import { FooterAttribution } from './FooterAttribution';
import TutorialSimulation from './TutorialSimulation';

interface RulesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-stone-950/90 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div
                className={`relative w-full max-w-lg bg-stone-900 border-4 border-amber-900 shadow-2xl transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
            >
                {/* Header */}
                <div className="bg-amber-900/20 p-6 border-b border-amber-900/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <BookOpen className="text-amber-500 w-6 h-6" />
                        <h2 className="text-xl font-black uppercase tracking-widest text-amber-500 font-[Cinzel]">
                            Operative Directive 73-B
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-stone-500 hover:text-amber-500 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">

                    <div className="space-y-4">
                        <div className="bg-stone-950/50 p-4 border border-stone-800 rounded-sm">
                            <h3 className="text-amber-600 font-bold uppercase tracking-wider text-sm mb-3">Protocol Briefing</h3>
                            <ul className="space-y-3 text-stone-300 text-sm font-[Courier_Prime]">
                                <li className="flex items-start gap-3">
                                    <span className="font-bold text-amber-500">01.</span>
                                    <span>
                                        <strong className="text-stone-200">The First Item</strong> is the Anchor. It always survives.
                                    </span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="font-bold text-amber-500">02.</span>
                                    <span>
                                        <strong className="text-stone-200">Protocol is set</strong> by the first Ascending or Descending item.
                                    </span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="font-bold text-amber-500">03.</span>
                                    <span>
                                        <strong className="text-stone-200">Purge Violators.</strong> The System automatically removes any unit that breaks the sequence.
                                    </span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="font-bold text-amber-500">04.</span>
                                    <span>
                                        <strong className="text-stone-200">Maximize Yield.</strong> Your score is the sum of all surviving values.
                                    </span>
                                </li>
                            </ul>
                        </div>

                        <TutorialSimulation />

                        <div className="p-4 rounded-sm bg-amber-900/10 border border-amber-900/30">
                            <h3 className="text-amber-500 font-bold uppercase tracking-wider text-xs mb-2">Tools of the Trade</h3>
                            <p className="text-stone-400 text-xs leading-relaxed">
                                Use your issued toolkit to manipulate the queue. Swapping, promoting, and Demoting items costs nothing but time. Use them wisely to satisfy the daily quota.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-center gap-4 pt-4 w-full">
                        <button
                            onClick={() => {
                                navigate('/tutorial');
                                onClose();
                            }}
                            className="bg-amber-600 hover:bg-amber-500 text-stone-900 font-bold uppercase tracking-widest px-8 py-3 rounded-sm shadow-lg hover:shadow-amber-900/20 transition-all active:transform active:scale-95 flex items-center gap-2"
                        >
                            <span className="font-[Cinzel]">Tutorial</span>
                        </button>

                        <button
                            onClick={onClose}
                            className="bg-transparent border border-amber-600/50 hover:border-amber-500 text-amber-600 hover:text-amber-500 font-bold uppercase tracking-widest px-6 py-3 rounded-sm transition-all flex items-center gap-2 opacity-80 hover:opacity-100"
                        >
                            <span className="font-[Cinzel]">Begin Work</span>
                        </button>
                    </div>

                    {/* Attribution */}
                    <div className="pt-6 border-t border-stone-800 flex flex-col items-center gap-2">
                        <FooterAttribution />
                    </div>

                </div>

                {/* Footer Decor */}
                <div className="bg-stone-950 p-3 border-t border-stone-800 flex justify-between items-center text-[10px] text-stone-600 font-mono uppercase">
                    <span>Doc Ref: TS-PROTO-V2</span>
                    <span>Auth: COMMAND</span>
                </div>
            </div>
        </div>
    );
};

export default RulesModal;
