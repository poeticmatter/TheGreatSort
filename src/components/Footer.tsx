import React from 'react';
import { LucideIcon } from 'lucide-react';
import { ButtonVariant } from '../config/submitButtonConfig';
import SubmitButton from './SubmitButton';
import { LayoutType } from './InventoryGrid';

interface FooterProps {
  layout: LayoutType;
  submitConfig: {
    label: string;
    variant: ButtonVariant;
    Icon: LucideIcon;
    onClick: () => void;
    disabled?: boolean;
  };
  toolBelt?: React.ReactNode;
}

const Footer: React.FC<FooterProps> = ({
  layout, submitConfig, toolBelt
}) => {
  if (layout === 'VERTICAL_LIST') return null;

  return (
    <footer className="p-4 border-t-4 border-red-900 bg-stone-900 pb-8 sm:pb-6 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] z-20 relative">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">

        <div className="flex items-center gap-4">
          {layout === 'HORIZONTAL_STRIP' && toolBelt}
        </div>

        {/* Attribution */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-2 text-center opacity-40 hover:opacity-100 transition-opacity">
          <a
            href="https://timeshapers.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 group"
          >
            <span className="text-[10px] text-stone-500 font-mono uppercase tracking-widest group-hover:text-amber-500 transition-colors">
              Designed by Aurore Inara
            </span>
            <img src="/TimeshapersLogo.svg" alt="Timeshapers" className="h-4 w-auto invert opacity-50 group-hover:opacity-100 transition-opacity" />
          </a>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 items-center">
          <SubmitButton
            label={submitConfig.label}
            variant={submitConfig.variant}
            Icon={submitConfig.Icon}
            onClick={submitConfig.onClick}
            disabled={submitConfig.disabled}
            compact={false}
          />
        </div>

      </div>
    </footer>
  );
};

export default Footer;
