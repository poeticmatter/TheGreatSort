import { RunState } from '../../engine';

interface RunSummaryProps {
  run: RunState;
  onNewRun: () => void;
}

export function RunSummary({ run, onNewRun }: RunSummaryProps) {
  const hasWon = run.status === 'WON';

  return (
    <section className="bg-stone-950/50 rounded-lg border border-stone-800 p-6 flex flex-col items-center gap-4">
      <h2 className={`font-mono text-xl tracking-widest uppercase ${hasWon ? 'text-amber-300' : 'text-red-500'}`}>
        {hasWon ? 'All shifts complete' : 'Dismissed after too many strikes'}
      </h2>

      <table className="font-mono text-sm text-stone-300">
        <thead>
          <tr className="text-xs tracking-widest uppercase text-stone-500">
            <th className="px-3 py-1 text-left">Shift</th>
            <th className="px-3 py-1 text-right">Yield</th>
            <th className="px-3 py-1 text-right">Quota</th>
            <th className="px-3 py-1 text-right">Favors</th>
          </tr>
        </thead>
        <tbody>
          {run.completedShifts.map(shift => (
            <tr key={shift.shiftIndex} className={shift.wasQuotaMet ? '' : 'text-red-400'}>
              <td className="px-3 py-1">{shift.shiftIndex + 1}</td>
              <td className="px-3 py-1 text-right">{shift.bankedYield}</td>
              <td className="px-3 py-1 text-right">{shift.quota}</td>
              <td className="px-3 py-1 text-right">{shift.favorsEarned}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="font-mono text-sm text-stone-300">Favors earned: {run.favors}</p>
      <p className="font-mono text-xs text-stone-600">Seed {run.seed}</p>

      <button
        type="button"
        onClick={onNewRun}
        className="px-6 py-2 font-mono tracking-widest uppercase border-2 border-amber-500 text-amber-500 hover:bg-stone-800"
      >
        New run
      </button>
    </section>
  );
}
