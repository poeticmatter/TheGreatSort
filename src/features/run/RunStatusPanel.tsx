import { getShiftCount, RunState, SequenceOutcome } from '../../engine';

interface RunStatusPanelProps {
  run: RunState;
  /** What the current sequence would produce if inspected now. */
  outcome: SequenceOutcome;
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

export function RunStatusPanel({ run, outcome }: RunStatusPanelProps) {
  const { shift, strikes, favors, energy, config } = run;

  return (
    <section className="bg-stone-950/50 rounded-lg border border-stone-800 p-4 flex flex-wrap justify-center gap-y-3">
      <Stat label="Shift" value={`${shift.index + 1} / ${getShiftCount(run)}`} />
      <Stat label="Sequence" value={`${shift.sequenceIndex + 1} / ${config.sequencesPerShift}`} />
      <Stat label="Shift quota" value={`${shift.bankedYield} / ${shift.quota}`} />
      <Stat label="This sequence" value={`${outcome.yield} / ${outcome.target}`} isAlert={outcome.isBelowTarget} />
      <Stat label="Energy" value={`${energy} / ${config.energy.capacity}`} />
      <Stat label="Favors" value={`${favors}`} />
      <Stat label="Strikes" value={`${strikes} / ${config.strikeLimit}`} isAlert={strikes > 0} />
    </section>
  );
}
