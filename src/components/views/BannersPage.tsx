import React from 'react';
import { Star } from 'lucide-react';
import BannerWrapper from './BannerWrapper';

const BannersPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-stone-900 p-8 space-y-12">
            <h1 className="text-3xl text-stone-200 font-[Cinzel] text-center mb-8">Header Variations</h1>

            {/* Variation 1: Base (Compacted, No Border, Subtitle) */}
            <BannerWrapper title="Variation 1: Base (Compact)" filename="header_base">
                <div className="w-full h-full bg-gradient-to-r from-red-950 to-stone-900 shadow-xl p-8 flex flex-col justify-center items-center gap-4">
                    <div className="relative">
                        <Star className="text-amber-500 fill-amber-500 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]" size={112} />
                        <div className="absolute inset-0 blur-md bg-amber-500/30 rounded-full"></div>
                    </div>
                    <div className="text-center">
                        <h1 className="text-8xl font-[Cinzel] font-bold text-amber-500 tracking-widest uppercase drop-shadow-lg whitespace-nowrap mb-2">
                            The Great Sort
                        </h1>
                        <p className="font-[Courier_Prime] text-stone-400 text-2xl tracking-wider uppercase">
                            Compliance is Mandatory
                        </p>
                    </div>
                </div>
            </BannerWrapper>

            {/* Variation 2: Large & Centered (More Breathing Room) */}
            <BannerWrapper title="Variation 2: Large & Centered" filename="header_large">
                <div className="w-full h-full bg-gradient-to-b from-stone-900 to-red-950 flex flex-col justify-center items-center gap-12 relative overflow-hidden">
                    {/* Subtle Background Star */}
                    <Star className="absolute text-red-900/10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" size={600} />

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="relative mb-8">
                            <Star className="text-amber-500 fill-amber-500 drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]" size={140} />
                            <div className="absolute inset-0 blur-xl bg-amber-500/20 rounded-full"></div>
                        </div>
                        <h1 className="text-7xl xl:text-8xl font-[Cinzel] font-bold text-transparent bg-clip-text bg-gradient-to-br from-amber-400 to-amber-600 drop-shadow-2xl tracking-widest uppercase text-center mx-4">
                            The Great Sort
                        </h1>
                        <div className="h-1 w-32 bg-amber-600/50 my-6"></div>
                        <p className="font-[Courier_Prime] text-stone-300 text-3xl tracking-[0.2em] uppercase font-bold text-shadow text-center">
                            Compliance is Mandatory
                        </p>
                    </div>
                </div>
            </BannerWrapper>

            {/* Variation 2b: Large & Centered (650x500) */}
            <BannerWrapper title="Variation 2b: Large & Centered 650x500" filename="header_large_650x500" width={650} height={500}>
                <div className="w-full h-full bg-gradient-to-b from-stone-900 to-red-950 flex flex-col justify-center items-center relative overflow-hidden">
                    {/* Subtle Background Star */}
                    <Star className="absolute text-red-900/10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" size={350} />

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="relative mb-6">
                            <Star className="text-amber-500 fill-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]" size={80} />
                            <div className="absolute inset-0 blur-lg bg-amber-500/20 rounded-full"></div>
                        </div>
                        <h1 className="text-5xl font-[Cinzel] font-bold text-transparent bg-clip-text bg-gradient-to-br from-amber-400 to-amber-600 drop-shadow-xl tracking-widest uppercase text-center mx-4">
                            The Great Sort
                        </h1>
                        <div className="h-[2px] w-24 bg-amber-600/50 my-5"></div>
                        <p className="font-[Courier_Prime] text-stone-300 text-xl tracking-[0.2em] uppercase font-bold text-shadow text-center">
                            Compliance is Mandatory
                        </p>
                    </div>
                </div>
            </BannerWrapper>

            {/* Variation 2c: Large & Centered (1500x500 Bluesky) */}
            <BannerWrapper title="Variation 2c: Large & Centered 1500x500 Bluesky" filename="header_large_1500x500_bluesky" width={1500} height={500}>
                <div className="w-full h-full bg-gradient-to-b from-stone-900 to-red-950 flex flex-col justify-center items-center gap-10 relative overflow-hidden">
                    {/* Subtle Background Star */}
                    <Star className="absolute text-red-900/10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" size={600} />

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="relative mb-6">
                            <Star className="text-amber-500 fill-amber-500 drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]" size={120} />
                            <div className="absolute inset-0 blur-xl bg-amber-500/20 rounded-full"></div>
                        </div>
                        <h1 className="text-7xl xl:text-8xl font-[Cinzel] font-bold text-transparent bg-clip-text bg-gradient-to-br from-amber-400 to-amber-600 drop-shadow-2xl tracking-widest uppercase text-center mx-4">
                            The Great Sort
                        </h1>
                        <div className="h-1 w-32 bg-amber-600/50 my-5"></div>
                        <p className="font-[Courier_Prime] text-stone-300 text-3xl tracking-[0.2em] uppercase font-bold text-shadow text-center">
                            Compliance is Mandatory
                        </p>
                    </div>
                </div>
            </BannerWrapper>

            {/* Variation 3: Split Layout (Left/Right) */}
            <BannerWrapper title="Variation 3: Split Layout" filename="header_split">
                <div className="w-full h-full bg-stone-950 relative flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-950 via-red-950/40 via-[75%] to-stone-950"></div>

                    <div className="flex items-center gap-16 relative z-10">
                        <div className="relative">
                            <Star className="text-amber-500 fill-amber-500 drop-shadow-2xl" size={240} />
                            <div className="absolute inset-0 blur-2xl bg-amber-500/20 rounded-full"></div>
                        </div>
                        <div className="flex flex-col items-start border-l-4 border-amber-600/30 pl-16 py-8">
                            <h1 className="text-8xl font-[Cinzel] font-bold text-stone-100 tracking-widest uppercase leading-tight mb-4">
                                The<br />Great<br /><span className="text-amber-500">Sort</span>
                            </h1>
                            <p className="font-[Inter] text-stone-400 text-3xl font-light tracking-widest uppercase border-t border-stone-800 pt-4 mt-2 w-full">
                                Compliance is Mandatory
                            </p>
                        </div>
                    </div>
                </div>
            </BannerWrapper>



            {/* Variation 5: Floating (Glass) */}
            <BannerWrapper title="Variation 5: Floating" filename="header_floating">
                <div className="w-full h-full bg-[radial-gradient(circle_at_center,_#292524_0%,_#0c0a09_100%)] relative flex items-center justify-center">

                    <div className="relative p-20 border border-stone-700/50 rounded-2xl bg-stone-800/20 backdrop-blur-sm shadow-2xl flex flex-col items-center gap-8">
                        <div className="absolute -top-12 bg-stone-900 p-6 rounded-full border border-stone-700 shadow-xl">
                            <Star className="text-amber-500 fill-amber-500" size={80} />
                        </div>

                        <h1 className="text-8xl font-[Cinzel] font-bold text-stone-200 tracking-widest uppercase mt-4">
                            The Great Sort
                        </h1>
                        <div className="w-24 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>
                        <p className="font-[Inter] text-amber-500/80 text-2xl tracking-widest uppercase font-semibold">
                            // Compliance is Mandatory //
                        </p>
                    </div>
                </div>
            </BannerWrapper>

        </div>
    );
};

export default BannersPage;
