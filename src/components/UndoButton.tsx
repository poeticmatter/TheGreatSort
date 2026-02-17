import React from 'react';
import { RotateCcw, LucideIcon } from 'lucide-react';

import { ButtonVariant } from '../config/submitButtonConfig';

interface UndoButtonProps {
  onClick: () => void;
  disabled: boolean;
  label?: string;
  Icon?: LucideIcon;
  variant?: ButtonVariant;
}

const UndoButton: React.FC<UndoButtonProps> = ({
  onClick,
  disabled,
  label = "UNDO",
  Icon = RotateCcw,
  variant = 'default'
}) => {
  // Variant styles
  const variantStyles: Record<string, string> = {
    default: "bg-stone-900 text-amber-500 border-amber-500 hover:bg-stone-800 hover:text-amber-400 border-solid",
    warning: "bg-amber-900/20 text-amber-500 border-amber-800/50 hover:bg-amber-900/40 hover:text-amber-400 hover:border-amber-500",
    muted: "bg-stone-900/50 text-stone-600 border-stone-800 hover:bg-stone-800 hover:text-stone-500 hover:border-stone-700",
    gold: "bg-yellow-900/20 text-yellow-500 border-yellow-600 hover:bg-yellow-900/40 hover:text-yellow-400 border-solid",
    silver: "bg-slate-300/20 text-slate-300 border-slate-400 hover:bg-slate-300/40 hover:text-slate-200 border-solid",
    bronze: "bg-orange-800/20 text-orange-400 border-orange-700 hover:bg-orange-800/40 hover:text-orange-300 border-solid",
    neutral: "bg-stone-800 text-stone-400 border-stone-600 hover:bg-stone-700 hover:text-stone-300 border-solid",
    info: "bg-blue-900/20 text-blue-400 border-blue-700 hover:bg-blue-900/40 hover:text-blue-300 border-solid",
    destructive: "bg-red-900/20 text-red-500 border-red-800 hover:bg-red-900/40 hover:text-red-400 border-solid",
  };

  const activeClass = variantStyles[variant] || variantStyles['default'];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`
        relative flex flex-col items-center justify-center w-16 h-16 rounded transition-all duration-200 group overflow-hidden
        border-2 border-dashed
        ${disabled
          ? 'bg-transparent text-stone-700 cursor-not-allowed opacity-50 border-stone-500'
          : `${activeClass} active:translate-y-0.5`
        }
      `}
    >
      <Icon size={24} strokeWidth={2.5} />
      <span className="text-[10px] uppercase font-bold mt-1 tracking-tighter font-[Inter]">
        {label}
      </span>
    </button>
  );
};

export default UndoButton;
