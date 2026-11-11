import { getPaceHint, getShiftCount, PaceHint, RunState } from '../../engine';

const PACE_HINT_TEXT: Record<PaceHint, string> = {
  EARLY: 'The shift has just begun.',
  MIDWAY: 'The shift is well under way.',
  WINDING_DOWN: 'The shift is winding down.',
};

interface RunStatusPanelProps {
  run: RunState;
  /** Yield the current sequence would bank if inspected now. */
  projectedYield: number;
}

interface StatProps {
  label: string;
  value: string;
  isAlert?: boolean;
}

function Stat({ label, value, isAlert }: StatProps) {
  return (
    <div className="flex flex-col items-center px-3">
      <span className="font-mono text-xs tracking-widest uppercase text-stone-500">{label}</span>
      <span className={`font-mono text-2xl ${isAlert ? 'text-red-400' : 'text-amber-400'}`}>{value}</span>
    </div>
  );
}

export function RunStatusPanel({ run, projectedYield }: RunStatusPanelProps) {
  const { shift, strikes, config } = run;

  return (
    <section className="bg-stone-950/50 rounded-lg border border-stone-800 p-4 flex flex-col items-center gap-3">
      <div className="flex flex-wrap justify-center gap-y-3">
        <Stat label="Shift" value={`${shift.index + 1} / ${getShiftCount(run)}`} />
        <Stat label="Quota" value={`${shift.bankedYield} / ${shift.quota}`} />
        <Stat label="This sequence" value={`+${projectedYield}`} />
        <Stat label="Strikes" value={`${strikes} / ${config.strikeLimit}`} isAlert={strikes > 0} />
      </div>
      <p className="font-mono text-xs tracking-widest uppercase text-amber-500/80">
        {PACE_HINT_TEXT[getPaceHint(run)]}
      </p>
    </section>
  );
}
