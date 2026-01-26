import React from 'react';
import { ToolDefinition } from '../../types';
import { RotateCcw } from 'lucide-react';

interface ActionButtonProps {
  tool: ToolDefinition;
  instanceId?: string;
  isActive: boolean;
  isUsed: boolean;
  isUndoable?: boolean;
  isDisabled: boolean;
  onClick: (id: string) => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  tool,
  instanceId,
  isActive,
  isUsed,
  isUndoable,
  isDisabled,
  onClick
}) => {
  const ToolIcon = tool.icon;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(instanceId || tool.id);
      }}
      disabled={isDisabled}
      title={tool.desc}
      className={`
        relative flex flex-col items-center justify-center w-16 h-16 rounded transition-all duration-200 group overflow-hidden
        ${isActive
          ? 'border-2 border-amber-500 bg-stone-800 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)] scale-105'
          : isUndoable 
             ? 'border-2 border-stone-300 border-dashed bg-stone-300 text-stone-900 shadow-[0_0_15px_rgba(255,255,255,0.4)] hover:bg-stone-200'
             : isUsed
            ? 'border border-stone-800 bg-stone-950 text-stone-700 cursor-not-allowed opacity-60'
            : 'border-2 border-amber-600 bg-amber-500 text-stone-900 shadow-[0_4px_0_rgb(146,64,14)] hover:bg-amber-400 hover:-translate-y-0.5 active:shadow-none active:translate-y-1 transition-all'
        }
      `}
    >
      {isUndoable ? (
          <RotateCcw size={24} strokeWidth={2.5} />
      ) : (
          <ToolIcon size={24} strokeWidth={2.5} />
      )}
      
      <span className="text-[10px] uppercase font-bold mt-1 tracking-tighter font-[Inter]">
          {isUndoable ? `UNDO ${tool.name}` : tool.name}
      </span>

      {/* Used Stamp */}
      {isUsed && !isUndoable && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-950/70 backdrop-blur-[1px]">
          <div className="text-red-900 font-black uppercase text-[10px] rotate-[-25deg] border-2 border-red-900 px-1 opacity-80">USED</div>
        </div>
      )}

      {/* Undo Logic - Removed Overlay, handled above */}

      {/* Active Indicator */}
      {isActive && (
        <div className="absolute top-0 right-0 w-2 h-2 bg-amber-500 animate-ping rounded-full"></div>
      )}
    </button>
  );
};

export default ActionButton;
