import React from 'react';
import { RotateCcw } from 'lucide-react';

interface UndoButtonProps {
  onClick: () => void;
  disabled: boolean;
}

const UndoButton: React.FC<UndoButtonProps> = ({ onClick, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title="Undo Last Move"
      className={`
        relative flex flex-col items-center justify-center w-16 h-16 rounded transition-all duration-200 group overflow-hidden
        border-2 border-stone-500 border-dashed
        ${disabled
          ? 'bg-transparent text-stone-700 cursor-not-allowed opacity-50'
          : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200 hover:border-stone-400 active:translate-y-0.5'
        }
      `}
    >
      <RotateCcw size={24} strokeWidth={2.5} />
      <span className="text-[10px] uppercase font-bold mt-1 tracking-tighter font-[Inter]">
        UNDO
      </span>
    </button>
  );
};

export default UndoButton;
