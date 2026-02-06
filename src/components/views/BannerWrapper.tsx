import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Download, Loader2 } from 'lucide-react';

interface BannerWrapperProps {
    children: React.ReactNode;
    title: string;
    filename: string;
}

const BannerWrapper: React.FC<BannerWrapperProps> = ({ children, title, filename }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        if (ref.current === null) {
            return;
        }

        setIsExporting(true);

        try {
            // Small delay to ensure styles are fully calculated/fonts loaded
            // though usually not strictly necessary if already rendered.
            const dataUrl = await toPng(ref.current, { cacheBust: true, width: 1280, height: 720 });

            const link = document.createElement('a');
            link.download = `${filename}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Failed to export banner:', err);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <section className="space-y-2">
            <div className="flex justify-between items-end">
                <h2 className="text-stone-400 font-mono text-sm uppercase">{title}</h2>
                <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-3 py-1 bg-stone-800 text-stone-300 hover:text-amber-500 hover:bg-stone-700 text-xs font-mono border border-stone-600 rounded disabled:opacity-50 transition-colors"
                >
                    {isExporting ? <Loader2 className="animate-spin" size={12} /> : <Download size={12} />}
                    {isExporting ? 'Generating...' : 'Export PNG'}
                </button>
            </div>

            {/* Container to center the banner preview */}
            <div className="flex justify-center mx-auto overflow-hidden border border-stone-800 bg-stone-950 p-4 rounded">
                {/* The actual banner element to export */}
                <div ref={ref} className="w-[1280px] h-[720px] aspect-video flex-shrink-0 relative overflow-hidden bg-stone-900 shadow-2xl">
                    {children}
                </div>
            </div>
        </section>
    );
};

export default BannerWrapper;
