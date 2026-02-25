import React from 'react';
import Header from '../Header';
import { GamePhase } from '../../../types';
import { Mail } from 'lucide-react';

export const CareerPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-stone-900 text-stone-200 font-sans selection:bg-red-500/30 flex flex-col relative">
            <Header
                gameMode="DAILY" // Dummy, as we are simply showing a page, but maintains interface bounds
                phase={GamePhase.PLANNING}
                onChangeMode={() => { }}
                onOpenRules={() => { }}
                onShowResistanceLocked={() => { }}
                hasJoinedResistance={false}
            />

            <main className="flex-1 flex items-center justify-center p-6">
                <div className="max-w-2xl w-full bg-stone-950/50 p-8 border-2 border-amber-900/50 rounded-sm shadow-2xl relative overflow-hidden">
                    {/* Background decorations */}
                    <div className="absolute -top-10 -right-10 text-amber-500/5 w-64 h-64 font-black">CAREER</div>
                    <div className="absolute top-0 right-0 p-32 opacity-5 pointer-events-none"></div>

                    <div className="relative z-10 space-y-8">
                        {/* Header */}
                        <div className="text-center space-y-4">
                            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-widest text-amber-500 font-[Cinzel]">
                                Career Mode
                            </h1>
                            <div className="inline-block px-3 py-1 bg-stone-800 border-l-2 border-amber-500 text-xs text-stone-300 font-mono tracking-widest uppercase">
                                STATUS: In Development
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-6 text-stone-300 font-serif leading-relaxed">
                            <p className="first-letter:text-5xl first-letter:font-bold first-letter:text-amber-500 first-letter:mr-3 first-letter:float-left">
                                A completely new way to experience the Sort. Career mode will reimagine the core mechanics into a high-stakes, roguelite experience.
                            </p>

                            <p>
                                Instead of unlimited freedom, the tools you rely on will be drawn from a limited deck of cards. You will need to carefully deploy these across a randomized, unpredictable series of sequences—without knowing what challenges wait the next cycle.
                            </p>

                            <p>
                                It is no longer just about finding the optimal solution; it's about making perfectly efficient moves, rationing your abilities for the hurdles ahead, and leveraging items that survive the sequences to give you powerful benefits or mitigate devastating maluses.
                            </p>
                        </div>

                        {/* Calls to Action */}
                        <div className="pt-8 mt-8 border-t border-stone-800">
                            <h2 className="text-xl font-bold uppercase tracking-wider text-stone-400 mb-6 text-center">
                                Join the Resistance & Support the Creation
                            </h2>

                            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                                {/* Discord Button */}
                                <a
                                    href="https://discord.gg/PpzQeQ5TNn"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-4 bg-[#5865F2]/10 hover:bg-[#5865F2]/20 border border-[#5865F2]/30 hover:border-[#5865F2] text-[#5865F2] font-bold uppercase tracking-widest transition-all rounded shadow-lg group relative overflow-hidden"
                                >
                                    <div className="absolute inset-x-0 -bottom-1 h-1 bg-[#5865F2] transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                                    </svg>
                                    Join Discord
                                </a>

                                {/* Newsletter Button */}
                                <a
                                    href="https://timeshapers.com/#newsletter"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-4 bg-amber-600/10 hover:bg-amber-600/20 border border-amber-600/30 hover:border-amber-600 text-amber-500 font-bold uppercase tracking-widest transition-all rounded shadow-lg group relative overflow-hidden"
                                >
                                    <div className="absolute inset-x-0 -bottom-1 h-1 bg-amber-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                                    <Mail className="w-6 h-6" />
                                    Get Updates
                                </a>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div >
    );
};
