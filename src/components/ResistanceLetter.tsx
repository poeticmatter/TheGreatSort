import React, { useState } from 'react';
import { HandFist } from 'lucide-react';

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
      <div className="relative w-full max-w-md bg-stone-200 text-stone-900 p-8 md:p-12 shadow-2xl rounded-sm transform rotate-1">
        
        {/* Paper Texture Overlay */}
        <div className="absolute inset-0 bg-[#f5f5f4] opacity-50 mix-blend-multiply pointer-events-none rounded-sm"></div>

        <div className="relative z-10 font-[Courier_Prime] flex flex-col gap-6">
          {/* Header */}
          <div className="w-full flex justify-end">
             <div className="border-2 border-red-800 text-red-800 px-2 py-1 transform -rotate-6 text-sm font-bold uppercase tracking-widest opacity-80 mix-blend-multiply">
                 Eyes Only
             </div>
          </div>

          <div className="space-y-4 text-sm md:text-base leading-relaxed font-bold">
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
             <div className="transform -rotate-12 mix-blend-multiply opacity-85">
                <div className="border-4 border-red-900 rounded-full p-4 flex items-center justify-center" style={{ filter: 'blur(0.5px) contrast(150%)' }}>
                    <HandFist size={64} strokeWidth={2.5} className="text-red-900 drop-shadow-[0_0_2px_rgba(127,29,29,0.8)]" />
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
