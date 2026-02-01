import React from 'react';
import { LucideIcon } from 'lucide-react';
import { ButtonVariant } from '../config/submitButtonConfig';

interface SubmitButtonProps {
  label: string;
  variant: ButtonVariant;
  Icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  compact?: boolean;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({
  label,
  variant,
  Icon,
  onClick,
  disabled,
  compact = false
}) => {

  const variantStyles: Record<ButtonVariant, string> = {
    gold: "bg-amber-500 hover:bg-amber-400 border-amber-200 text-amber-950 shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-pulse border-2",
    silver: "bg-slate-400 hover:bg-slate-300 border-slate-200 text-slate-900 shadow-[0_4px_0_rgb(71,85,105)] border-2",
    bronze: "bg-orange-700 hover:bg-orange-600 border-orange-300 text-orange-50 shadow-[0_4px_0_rgb(124,45,18)] border-2",
    neutral: "bg-stone-700 hover:bg-stone-600 text-stone-200 border-stone-500 shadow-[0_4px_0_rgb(41,37,36)] border",
    warning: "bg-amber-800 hover:bg-amber-700 text-amber-100 border-amber-600 shadow-[0_4px_0_rgb(120,53,15)] border",
    info: "bg-sky-800 hover:bg-sky-700 text-sky-100 border-sky-500 shadow-[0_4px_0_rgb(12,74,110)] border",
    destructive: "bg-red-950 hover:bg-red-900 text-red-500 border-red-800 shadow-[0_0_15px_rgba(220,38,38,0.4)] border-2"
  };

  const baseStyle = variantStyles[variant] || variantStyles.neutral;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`
        group relative rounded-sm font-bold flex items-center justify-center transition-all duration-300
        ${compact
          ? 'w-16 h-16 p-1 flex-col gap-0.5 rounded shadow-sm'
          : 'px-6 py-4 w-72 gap-3 font-[Cinzel] tracking-widest text-lg shadow-lg active:shadow-none active:translate-y-1'
        }
        ${baseStyle}
        ${disabled ? 'opacity-50 cursor-not-allowed filter grayscale' : ''}
      `}
    >
      <Icon size={compact ? 24 : 24} className={variant === 'gold' ? 'animate-bounce' : ''} />

      {compact ? (
        <span className="text-[9px] uppercase font-bold leading-none text-center mt-1">
          {label}
        </span>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
};

export default SubmitButton;
