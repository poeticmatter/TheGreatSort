import React from 'react';
import { GamePhase, ToolInstance } from '../../types';
import { TOOLS } from '../constants';
import ActionButton from './ActionButton';
import UndoButton from './UndoButton';
import { LucideIcon } from 'lucide-react';

interface ToolBeltProps {
  toolsAvailable: ToolInstance[];
  selectedTool: string | null;
  shouldShake: boolean;
  phase: GamePhase;
  onToolClick: (toolInstanceId: string) => void;
  // secondaryAction replaces onUndo/canUndo
  secondaryAction: {
    label?: string;
    onClick: () => void;
    disabled: boolean;
    Icon?: LucideIcon;
    variant?: 'default' | 'warning' | 'muted';
  };
  isDisabled?: boolean;
}

const ToolBelt: React.FC<ToolBeltProps & { orientation?: 'horizontal' | 'vertical' }> = ({
  toolsAvailable,
  selectedTool,
  shouldShake,
  phase,
  onToolClick,
  secondaryAction,
  isDisabled,
  orientation = 'horizontal',
}) => {
  const containerClasses = orientation === 'vertical'
    ? "flex flex-col gap-3"
    : "flex gap-3 sm:gap-5";

  return (
    <div
      className={`${containerClasses} ${shouldShake ? 'shake-animation' : ''} ${isDisabled ? 'grayscale pointer-events-none opacity-50' : ''} transition-all`}
    >
      {toolsAvailable.map((toolInstance) => {
        const toolDef = TOOLS[toolInstance.type.toUpperCase()];
        const isActive = selectedTool === toolInstance.instanceId;
        const isUsed = toolInstance.used;

        return (
          <ActionButton
            key={toolInstance.instanceId}
            tool={toolDef}
            instanceId={toolInstance.instanceId}
            isActive={isActive}
            isUsed={isUsed}
            isDisabled={isUsed || phase !== GamePhase.PLANNING || isDisabled}
            onClick={onToolClick}
          />
        );
      })}

      <UndoButton
        onClick={secondaryAction.onClick}
        disabled={secondaryAction.disabled || (isDisabled && phase === GamePhase.PLANNING)} // Only locally disable if global disable AND planning (logic preservation)
        // Actually, logic was: disabled = !canUndo || isDisabled.
        // We defer to whatever `secondaryAction.disabled` says, but also respect `isDisabled` prop if needed.
        // But `isDisabled` prop in ToolBelt usually implies the whole belt is disabled.
        // Let's assume strict mapping:
        // override local disabled if global `isDisabled` is true?
        // Actually the `div` wrapper has `pointer-events-none` if `isDisabled` is true.
        // So we can just pass secondaryAction.disabled.
        label={secondaryAction.label}
        Icon={secondaryAction.Icon}
        variant={secondaryAction.variant}
      />
    </div>
  );
};

export default ToolBelt;
