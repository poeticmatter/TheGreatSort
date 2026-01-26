import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface AuditWarningModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const AuditWarningModal: React.FC<AuditWarningModalProps> = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 border-2 border-amber-600 rounded-sm shadow-[0_0_30px_rgba(217,119,6,0.2)] max-w-md w-full p-6 flex flex-col gap-6 transform scale-100 animate-in zoom-in-95 duration-200">
        
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-500/10 rounded-full shrink-0">
             <AlertTriangle className="text-amber-500" size={32} />
          </div>
          <div>
            <h3 className="text-xl font-[Cinzel] text-amber-500 font-bold tracking-wide uppercase mb-2">
              Security Override
            </h3>
            <p className="text-stone-300 text-sm leading-relaxed font-[Inter]">
              Viewing the audit allows you to verify the solution, but will <span className="text-amber-400 font-bold">permanently lock</span> your ability to play today's puzzle.
              <br/><br/>
              Are you sure you want to proceed?
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-stone-400 hover:text-stone-200 font-[Courier] uppercase tracking-wider text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="bg-amber-600 hover:bg-amber-500 text-stone-900 font-bold py-2 px-6 rounded-sm uppercase tracking-wider text-xs shadow-lg transition-transform active:translate-y-0.5"
          >
            Confirm Lock
          </button>
        </div>

      </div>
    </div>
  );
};

export default AuditWarningModal;
