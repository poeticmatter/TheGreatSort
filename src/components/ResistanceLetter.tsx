import React, { useState } from 'react';
import { HandFist } from 'lucide-react';

const NOISE_SVG = `data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.5'/%3E%3C/svg%3E`;

interface ResistanceLetterProps {
  onClose: () => void;
}

export const ResistanceLetter: React.FC<ResistanceLetterProps> = ({ onClose }) => {
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    setClosing(true);
    // Short delay for fade out if we were doing animations, 
    // but for now immediate close matching spec instructions works fine
    setTimeout(onClose, 300);
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-stone-950 transition-opacity duration-1000 ${closing ? 'opacity-0' : 'opacity-100'}`}>
      <div 
        className="relative w-full max-w-md text-stone-900 p-8 md:p-12 shadow-2xl rounded-sm transform rotate-1 overflow-hidden isolate bg-[#dcd8cf] shadow-[inset_0_0_60px_rgba(0,0,0,0.1)]"
        style={{
          backgroundImage: `url("${NOISE_SVG}"), linear-gradient(to bottom right, #dcd8cf, #d4d0c5)`,
          backgroundBlendMode: 'overlay'
        }}
      >

        <div className="relative z-10 font-[Courier_Prime] flex flex-col gap-6">
          {/* Header */}
          <div className="w-full flex justify-end">
             <div className="border-2 border-red-800 text-red-800 px-2 py-1 transform -rotate-6 text-sm font-bold uppercase tracking-widest opacity-80 mix-blend-multiply">
                 Eyes Only
             </div>
          </div>

          <div className="space-y-4 text-sm md:text-base leading-relaxed tracking-tight font-bold text-stone-900 drop-shadow-[0_0_1px_rgba(0,0,0,0.3)]">
            <p>
              We see you, and we appreciate your efforts. But the course of action you've taken is only going to get you punished.
            </p>
            <p>
              Join the resistance, and we will guide your actions to be meaningful, but within the parameters that will keep you safe.
            </p>
            <p>
              Stay vigilant, friends.
            </p>
          </div>

          {/* Footer / Stamp */}
          <div className="flex flex-col items-center gap-6 mt-8">
             <div className="transform -rotate-12 mix-blend-multiply opacity-95">
                <div 
                  className="border-[6px] border-red-900 p-4 flex items-center justify-center rounded-[55%_45%_60%_40%_/_50%_60%_45%_55%]"
                  style={{
                    maskImage: `url("${NOISE_SVG}")`,
                    maskMode: 'alpha',
                    WebkitMaskImage: `url("${NOISE_SVG}")`,
                    maskRepeat: 'repeat',
                    maskSize: '100px'
                  }}
                >
                    <HandFist size={64} strokeWidth={2.5} className="text-red-900 fill-red-900" />
                </div>
             </div>

             <button 
               onClick={handleClose}
               className="text-stone-500 text-xs uppercase tracking-widest hover:text-stone-900 hover:underline transition-all mt-4"
             >
               [ Burn Message ]
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
