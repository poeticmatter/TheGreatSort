import React from 'react';
import { Star, FileText, Stamp } from 'lucide-react';
import BannerWrapper from './BannerWrapper';
import ToolBelt from '../ToolBelt';
import Card from '../Card';
import { TOOLS } from '../../constants';
import { CardItem, AgentRole, ToolInstance } from '../../../types';

const BannersPage: React.FC = () => {
    // Mock Tools for Variation 5
    const mockTools: ToolInstance[] = Object.values(TOOLS).map((def, index) => ({
        instanceId: `mock-tool-${index}`,
        type: def.id,
        used: false,
        isTemporary: false
    })).slice(0, 5); // Just take the first 5 for a clean look

    // Mock Sequence for Variation 6
    const mockSequence: CardItem[] = Array.from({ length: 5 }, (_, i) => ({
        id: `mock-card-${i}`,
        val: i + 1,
        status: 'pending',
        role: AgentRole.WORKER
    }));

    // Add a couple of specific states for visual interest
    mockSequence[2].status = 'safe'; // One safe card
    mockSequence[3].role = AgentRole.STATE; // One state agent

    return (
        <div className="min-h-screen bg-stone-900 p-8 space-y-12">
            <h1 className="text-3xl text-stone-200 font-[Cinzel] text-center mb-8">Game Banners</h1>

            {/* Variation 1: Standard Header Style (Compact) */}
            <BannerWrapper title="Variation 1: Compact Header" filename="banner_header">
                <div className="w-full h-full border-b-[16px] border-red-900 bg-gradient-to-r from-red-950 to-stone-900 shadow-xl p-8 flex flex-col justify-center items-center gap-6">
                    <div className="relative">
                        <Star className="text-amber-500 fill-amber-500 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]" size={128} />
                        <div className="absolute inset-0 blur-md bg-amber-500/30 rounded-full"></div>
                    </div>
                    <h1 className="text-8xl font-[Cinzel] font-bold text-amber-500 tracking-widest uppercase drop-shadow-lg whitespace-nowrap">
                        The Great Sort
                    </h1>
                </div>
            </BannerWrapper>

            {/* Variation 2: Marketing Hero (Large) */}
            <BannerWrapper title="Variation 2: Marketing Hero" filename="banner_marketing">
                <div className="w-full h-full relative bg-stone-800 flex items-center justify-center">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-stone-800 via-stone-900 to-black opacity-80"></div>
                    <div className="relative z-10 px-16 py-16 flex flex-col items-center text-center">
                        <div className="mb-12 relative">
                            <Star className="text-amber-500 fill-amber-500 animate-pulse" size={128} />
                            <div className="absolute inset-0 blur-2xl bg-amber-500/40 rounded-full"></div>
                        </div>
                        <h1 className="text-9xl font-[Cinzel] font-bold text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-600 drop-shadow-sm mb-8">
                            The Great Sort
                        </h1>
                        <p className="font-[Courier_Prime] text-stone-400 text-4xl max-w-4xl mb-16">
                            Order from Chaos. Compliance is Mandatory.
                        </p>
                        <div className="px-12 py-6 bg-red-700 text-stone-100 font-bold uppercase tracking-wider rounded shadow-[0_8px_0_theme(colors.red.900)] text-3xl">
                            Begin Auditing
                        </div>
                    </div>
                </div>
            </BannerWrapper>

            {/* Variation 3: Minimalist (Icon + Text) */}
            <BannerWrapper title="Variation 3: Minimalist" filename="banner_minimalist">
                <div className="w-full h-full bg-stone-950 p-12 flex flex-col justify-center items-center gap-12 border-4 border-stone-800">
                    <Star className="text-stone-500" size={128} />
                    <span className="font-[Cinzel] font-bold text-7xl text-stone-300 tracking-[0.3em]">THE GREAT SORT</span>
                </div>
            </BannerWrapper>

            {/* Variation 4: Bureaucratic / Classified */}
            <BannerWrapper title="Variation 4: Classified File" filename="banner_classified">
                <div className="w-full h-full bg-[#f0e6d2] p-16 relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute top-12 right-12 border-8 border-red-800 text-red-800 p-6 font-black uppercase text-3xl opacity-70">
                        Top Secret
                    </div>
                    <div className="flex items-center gap-8 mb-12 border-b-4 border-stone-800 pb-12 max-w-5xl">
                        <FileText className="text-stone-800" size={96} />
                        <h1 className="text-7xl font-[Cinzel] font-black text-stone-900 tracking-tighter">THE GREAT SORT Protocol</h1>
                    </div>
                    <div className="font-[Courier_Prime] text-stone-800 space-y-8 text-3xl">
                        <p>Subject: Cognitive Calibration Initiative</p>
                        <p>Status: <span className="bg-stone-900 text-stone-100 px-4 py-1">MANDATORY</span></p>
                        <p className="text-2xl opacity-80 max-w-4xl leading-relaxed">
                            Failure to comply will result in immediate re-education. Start your shift immediately.
                        </p>
                    </div>
                    <div className="mt-16 flex justify-end">
                        <div className="flex items-center gap-6 text-stone-900 font-bold border-8 border-stone-900 px-10 py-6 text-4xl">
                            <Stamp size={48} />
                            <span>APPROVED</span>
                        </div>
                    </div>
                </div>
            </BannerWrapper>

            {/* Variation 5: Tools of the Trade */}
            <BannerWrapper title="Variation 5: Tools of the Trade" filename="banner_tools">
                <div className="w-full h-full bg-stone-900 relative flex flex-col items-center justify-center p-16 overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

                    <h2 className="text-5xl font-[Cinzel] text-stone-500 mb-16 tracking-widest uppercase border-b-2 border-stone-700 pb-4">Authorized Equipment</h2>

                    <div className="scale-150 transform origin-center">
                        <ToolBelt
                            toolsAvailable={mockTools}
                            selectedTool={null}
                            shouldShake={false}
                            phase={1} // PLANNING
                            onToolClick={() => { }}
                            isDisabled={false}
                        />
                    </div>

                    <div className="absolute bottom-8 text-stone-600 font-mono text-xl uppercase tracking-widest">
                        Department of Order & Control
                    </div>
                </div>
            </BannerWrapper>

            {/* Variation 6: The Sequence */}
            <BannerWrapper title="Variation 6: The Sequence" filename="banner_sequence">
                <div className="w-full h-full bg-stone-800 relative flex flex-col items-center justify-center p-16">
                    <div className="absolute inset-0 bg-gradient-to-br from-stone-900 to-stone-800"></div>

                    <div className="relative z-10 flex gap-8 items-center justify-center transform scale-125">
                        {mockSequence.map(item => (
                            <Card
                                key={item.id}
                                item={item}
                                onClick={() => { }}
                                isSelected={false}
                                isTargetCandidate={false}
                                disableResponsiveOverrides={true} // Force desktop styling
                                showRoles={true}
                            />
                        ))}
                    </div>

                    <div className="absolute top-12 left-12">
                        <h1 className="text-4xl text-amber-500 font-[Cinzel] font-bold">SORT. VERIFY. REPEAT.</h1>
                    </div>
                </div>
            </BannerWrapper>
        </div>
    );
};

export default BannersPage;

