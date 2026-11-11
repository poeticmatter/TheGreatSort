import { isToolUsedThisSequence, RunState, RunTool } from '../../engine';
import { TOOLS } from '../../constants';

interface CooldownListProps {
  run: RunState;
}

const describeAvailability = (run: RunState, tool: RunTool): string => {
  if (isToolUsedThisSequence(run, tool.id)) return 'used';
  if (tool.sequencesUntilReady > 0) return `back in ${tool.sequencesUntilReady}`;
  return 'ready';
};

/** Spells out each tool's cooldown, which the tool belt can only show as greyed out. */
export function CooldownList({ run }: CooldownListProps) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1 font-mono text-xs text-stone-400">
      {run.tools.map(tool => (
        <li key={tool.id}>
          <span className="text-stone-200">{TOOLS[tool.type.toUpperCase()].name}</span>
          {' '}
          <span className="text-stone-500">(rests {tool.cooldown})</span>
          {' '}
          {describeAvailability(run, tool)}
        </li>
      ))}
    </ul>
  );
}
