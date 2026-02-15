import React from 'react';
import { RotateCcw, LucideIcon } from 'lucide-react';

interface UndoButtonProps {
  onClick: () => void;
  disabled: boolean;
  label?: string;
  Icon?: LucideIcon;
  variant?: 'default' | 'warning' | 'muted';
}

const UndoButton: React.FC<UndoButtonProps> = ({
  onClick,
  disabled,
  label = "UNDO",
  Icon = RotateCcw,
  variant = 'default'
}) => {
  // Variant styles
  const variantStyles = {
    default: "bg-stone-900 text-amber-500 border-amber-500 hover:bg-stone-800 hover:text-amber-400 border-solid",
    warning: "bg-amber-900/20 text-amber-500 border-amber-800/50 hover:bg-amber-900/40 hover:text-amber-400 hover:border-amber-500",
    muted: "bg-stone-900/50 text-stone-600 border-stone-800 hover:bg-stone-800 hover:text-stone-500 hover:border-stone-700"
  };

  const activeClass = variantStyles[variant];

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
