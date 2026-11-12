import { TOOLS } from '../../constants';
import { RunState } from '../../engine';

interface ToolCostListProps {
  run: RunState;
}

/** Spells out what each tool costs, which the tool belt can only show as greyed out. */
export function ToolCostList({ run }: ToolCostListProps) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1 font-mono text-xs text-stone-400">
      {run.tools.map(tool => (
        <li key={tool.id}>
          <span className="text-stone-200">{TOOLS[tool.type.toUpperCase()].name}</span>
          {' '}
          <span className={tool.cost > run.energy ? 'text-red-400/90' : 'text-amber-400'}>costs {tool.cost}</span>
        </li>
      ))}
    </ul>
  );
}
