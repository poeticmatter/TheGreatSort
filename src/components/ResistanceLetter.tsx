import React, { useState } from 'react';
import letterBg from '../assets/ResistanceLetter.png';

interface ResistanceLetterProps {
  onClose: () => void;
  onJoin?: () => void;
}

export const ResistanceLetter: React.FC<ResistanceLetterProps> = ({ onClose, onJoin }) => {
  const [closing, setClosing] = useState(false);

  const handleJoin = () => {
    localStorage.setItem('joinedResistance', 'true');
    if (onJoin) onJoin();
    setClosing(true);
    setTimeout(onClose, 300);
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-stone-950 transition-opacity duration-1000 ${closing ? 'opacity-0' : 'opacity-100'}`}>
      <style>{`
        @keyframes text-pulse-to-black {
          0%, 100% { color: #44403c; } 
          50% { color: #000000; }
        }
      `}</style>
      <div
        className="relative w-full max-w-md text-stone-900 shadow-2xl rounded-sm transform rotate-1 overflow-hidden isolate"
        style={{
          backgroundImage: `url(${letterBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          aspectRatio: '3/4'
        }}
      >
        <div className="relative z-10 font-['Courier_Prime'] flex flex-col h-full pt-20 px-12 pb-32">

          {/* Main Text Content */}
          <div className="flex-grow flex">
            <div className="space-y-4 text-sm md:text-[15px] leading-loose text-[#1c1917] mix-blend-multiply opacity-90 font-normal font-['Courier_Prime']">
              <p>
                We see you, and we appreciate your efforts. But the course of action you've taken is only going to get you punished.
              </p>
              <p>
                Join the resistance, and we will guide your actions to be meaningful, but within the parameters that will keep you safe.
              </p>
              <p>
                Stay vigilant, friend.
              </p>
            </div>
          </div>

          {/* Footer Button - Positioned at bottom */}
          <div className="absolute bottom-10 left-0 right-0 flex justify-center">
            <button
              onClick={handleJoin}
              className="text-blue-700 text-xs uppercase tracking-widest hover:text-blue-500 hover:underline transition-all font-['Courier_Prime']"
            >
              [ Join the Resistance ]
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
