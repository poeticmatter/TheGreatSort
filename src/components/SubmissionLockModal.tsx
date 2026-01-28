import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface SubmissionLockModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const SubmissionLockModal: React.FC<SubmissionLockModalProps> = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 border-2 border-red-800 rounded-sm shadow-[0_0_50px_rgba(153,27,27,0.4)] max-w-md w-full p-8 flex flex-col gap-6 transform scale-100 animate-in zoom-in-95 duration-200 relative overflow-hidden">

        {/* Background Glitch Elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-red-600/50 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-full h-1 bg-red-600/50 animate-pulse delay-75"></div>

        <div className="flex items-start gap-5 relative z-10">
          <div className="p-4 bg-red-900/20 rounded-full shrink-0 border border-red-500/30">
             <ShieldAlert className="text-red-500" size={40} />
          </div>
          <div>
            <h3 className="text-xl font-['Cinzel'] text-red-500 font-bold tracking-widest uppercase mb-3">
              Compliance Alert
            </h3>
            <p className="text-stone-300 text-sm leading-relaxed font-mono">
              <span className="text-red-400 font-bold">SUBOPTIMAL PERFORMANCE DETECTED.</span>
              <br/><br/>
              Submitting this result will be permanently logged on your record. This action cannot be undone.
              <br/><br/>
              Confirm submission?
            </p>
          </div>
        </div>

        <div className="flex gap-4 justify-end mt-4 relative z-10">
          <button
            onClick={onCancel}
            className="px-6 py-3 text-stone-400 hover:text-stone-100 font-mono uppercase tracking-wider text-xs border border-transparent hover:border-stone-700 transition-all rounded-sm"
          >
            Revise
          </button>
          <button
            onClick={onConfirm}
            className="bg-red-900 hover:bg-red-800 text-red-100 border border-red-700 hover:border-red-500 font-bold py-3 px-8 rounded-sm uppercase tracking-wider text-xs shadow-lg transition-all active:translate-y-0.5 hover:shadow-red-900/50"
          >
            Submit Log
          </button>
        </div>

      </div>
    </div>
  );
};

export default SubmissionLockModal;
