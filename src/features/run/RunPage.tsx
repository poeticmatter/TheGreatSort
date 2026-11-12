import { useEffect, useMemo, useReducer, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { GamePhase, ToolInstance } from '../../../types';
import { InventoryGrid, LayoutType } from '../../components/InventoryGrid';
import ToolBelt from '../../components/ToolBelt';
import { canAffordTool, CardItem, findRunTool, getSequenceOutcome } from '../../engine';
import { useGridPresentation } from '../../hooks/useGridPresentation';
import { describeFavor, describeManagerReaction } from './managerReactions';
import { createRunSession, runSessionReducer } from './runSessionReducer';
import { RunStatusPanel } from './RunStatusPanel';
import { RunSummary } from './RunSummary';
import { ToolCostList } from './ToolCostList';

const SEED_PARAM = 'seed';
const MAX_RANDOM_SEED = 2 ** 31;
const DESKTOP_MIN_WIDTH = 1024;
const NO_INDICES: number[] = [];

const createRandomSeed = (): number => Math.floor(Math.random() * MAX_RANDOM_SEED);

/** A seed in the URL replays a specific run; anything else starts a random one. */
const readSeed = (seedParam: string | null): number => {
  const seed = seedParam === null ? Number.NaN : Number.parseInt(seedParam, 10);
  return Number.isInteger(seed) && seed >= 0 ? seed : createRandomSeed();
};

const getResponsiveLayout = (): LayoutType =>
  window.innerWidth < DESKTOP_MIN_WIDTH ? 'VERTICAL_LIST' : 'HORIZONTAL_STRIP';

const useResponsiveLayout = (): LayoutType => {
  const [layout, setLayout] = useState<LayoutType>(getResponsiveLayout);

  useEffect(() => {
    const handleResize = () => setLayout(getResponsiveLayout());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return layout;
};

export function RunPage() {
  const [searchParams] = useSearchParams();
  const [session, dispatch] = useReducer(runSessionReducer, searchParams.get(SEED_PARAM), seedParam =>
    createRunSession(readSeed(seedParam))
  );
  const layout = useResponsiveLayout();

  const { run, selectedToolId, selectedIndex, inspectedCards } = session;
  const isInspected = inspectedCards !== null;
  const displayedCards = inspectedCards ?? run.sequence.cards;
  const selectedTool = selectedToolId === null ? undefined : findRunTool(run, selectedToolId);
  const outcome = getSequenceOutcome(run);
  const favorLine = describeFavor(outcome);

  const cards = useGridPresentation({
    sequence: displayedCards,
    highlightIndices: NO_INDICES,
    selectedIndex,
    candidateIndices: NO_INDICES,
    disabledIndices: NO_INDICES,
    selectedTool: selectedTool?.type ?? null,
  });

  const beltTools: ToolInstance[] = useMemo(
    () => run.tools.map(tool => ({ instanceId: tool.id, type: tool.type, used: !canAffordTool(run, tool.id) })),
    [run]
  );

  const handleCardClick = (card: CardItem) => {
    const index = displayedCards.findIndex(candidate => candidate.id === card.id);
    if (index >= 0) dispatch({ type: 'CARD_CLICKED', index });
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-200 font-sans selection:bg-red-500/30 flex flex-col items-center gap-6 p-4">
      <header className="w-full max-w-4xl flex items-baseline justify-between">
        <h1 className="font-mono tracking-widest uppercase text-amber-500">The Long Shift (prototype)</h1>
        <Link to="/" className="font-mono text-xs tracking-widest uppercase text-stone-500 hover:text-stone-300">
          Back to daily
        </Link>
      </header>

      {run.status !== 'IN_PROGRESS' ? (
        <RunSummary run={run} onNewRun={() => dispatch({ type: 'RUN_RESTARTED', seed: createRandomSeed() })} />
      ) : (
        <main className="w-full max-w-4xl flex flex-col items-center gap-6">
          <RunStatusPanel run={run} outcome={outcome} />

          <InventoryGrid cards={cards} layout={layout} onItemClick={handleCardClick} disabled={isInspected} />

          <ToolBelt
            toolsAvailable={beltTools}
            selectedTool={selectedToolId}
            shouldShake={false}
            phase={isInspected ? GamePhase.RESULTS : GamePhase.PLANNING}
            onToolClick={toolId => dispatch({ type: 'TOOL_CLICKED', toolId })}
            secondaryAction={{
              onClick: () => dispatch({ type: 'UNDO_REQUESTED' }),
              disabled: isInspected || run.sequence.moves.length === 0,
            }}
          />

          <ToolCostList run={run} />

          {isInspected && (
            <div className="flex flex-col items-center gap-1 font-mono text-sm text-center">
              <p className={outcome.isBelowTarget ? 'text-red-400/90' : 'text-stone-300'}>
                {describeManagerReaction(outcome, run.shift.index + run.shift.sequenceIndex)}
              </p>
              {favorLine !== null && <p className="text-sky-300/90">{favorLine}</p>}
            </div>
          )}

          <button
            type="button"
            onClick={() => dispatch({ type: isInspected ? 'NEXT_SEQUENCE_REQUESTED' : 'INSPECTION_REQUESTED' })}
            className="px-8 py-3 font-mono tracking-widest uppercase border-2 border-amber-500 text-amber-500 hover:bg-stone-800"
          >
            {isInspected ? 'Next sequence' : 'Run inspection'}
          </button>
        </main>
      )}
    </div>
  );
}
