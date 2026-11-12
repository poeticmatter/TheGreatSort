import { TOOLS } from '../../constants';
import { getToolCost, RunState } from '../../engine';

interface ToolCostListProps {
  run: RunState;
}

/** Spells out what each tool costs right now, which the tool belt can only show as greyed out. */
export function ToolCostList({ run }: ToolCostListProps) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1 font-mono text-xs text-stone-400">
      {run.tools.map(tool => {
        const cost = getToolCost(run, tool);
        return (
          <li key={tool.id}>
            <span className="text-stone-200">{TOOLS[tool.type.toUpperCase()].name}</span>
            {' '}
            <span className={cost > run.energy ? 'text-red-400/90' : 'text-amber-400'}>costs {cost}</span>
            {tool.usesThisShift > 0 && <span className="text-stone-500"> (used {tool.usesThisShift} this shift)</span>}
          </li>
        );
      })}
    </ul>
  );
}
