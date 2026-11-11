import { describe, expect, it } from 'vitest';

import { RunConfig, ToolType } from '../../engine';
import { createRunSession, RunSessionAction, runSessionReducer, RunSessionState } from './runSessionReducer';

const SEED = 7;

const CONFIG: RunConfig = {
  quotaCurve: [0, 0],
  minSequencesPerShift: 3,
  maxSequencesPerShift: 3,
  sequenceLength: 6,
  strikeLimit: 3,
  loadout: [
    { type: 'promote', cooldown: 1 },
    { type: 'swap', cooldown: 1 },
  ],
};

const startSession = (): RunSessionState => createRunSession(SEED, CONFIG);

const play = (state: RunSessionState, ...actions: RunSessionAction[]): RunSessionState =>
  actions.reduce(runSessionReducer, state);

const toolIdOf = (state: RunSessionState, type: ToolType): string => {
  const tool = state.run.tools.find(candidate => candidate.type === type);
  if (tool === undefined) throw new Error(`Test loadout has no ${type} tool.`);
  return tool.id;
};

const cardIds = (state: RunSessionState): string[] => state.run.sequence.cards.map(card => card.id);

const clickTool = (state: RunSessionState, type: ToolType): RunSessionAction => ({
  type: 'TOOL_CLICKED',
  toolId: toolIdOf(state, type),
});

const clickCard = (index: number): RunSessionAction => ({ type: 'CARD_CLICKED', index });

describe('runSessionReducer', () => {
  it('applies a one-pick tool to the clicked card', () => {
    const start = startSession();
    const [first, second, third] = cardIds(start);

    const after = play(start, clickTool(start, 'promote'), clickCard(2));

    expect(cardIds(after).slice(0, 3)).toEqual([third, first, second]);
  });

  it('clears the tool selection after a move is applied', () => {
    const start = startSession();

    const after = play(start, clickTool(start, 'promote'), clickCard(2));

    expect(after.selectedToolId).toBeNull();
  });

  it('waits for a second pick before applying a two-pick tool', () => {
    const start = startSession();

    const after = play(start, clickTool(start, 'swap'), clickCard(0));

    expect({ ids: cardIds(after), selectedIndex: after.selectedIndex }).toEqual({
      ids: cardIds(start),
      selectedIndex: 0,
    });
  });

  it('applies a two-pick tool once both picks are made', () => {
    const start = startSession();
    const [first, second] = cardIds(start);

    const after = play(start, clickTool(start, 'swap'), clickCard(0), clickCard(1));

    expect(cardIds(after).slice(0, 2)).toEqual([second, first]);
  });

  it('restarts the pair from the clicked card when the second pick is invalid', () => {
    const start = startSession();

    const after = play(start, clickTool(start, 'swap'), clickCard(0), clickCard(3));

    expect(after.selectedIndex).toBe(3);
  });

  it('ignores card clicks when no tool is selected', () => {
    const start = startSession();

    expect(play(start, clickCard(2))).toEqual(start);
  });

  it('does not select a tool already used in this sequence', () => {
    const start = startSession();
    const used = play(start, clickTool(start, 'promote'), clickCard(2));

    const after = play(used, clickTool(used, 'promote'));

    expect(after.selectedToolId).toBeNull();
  });

  it('restores the sequence when a move is undone', () => {
    const start = startSession();
    const moved = play(start, clickTool(start, 'promote'), clickCard(2));

    const after = play(moved, { type: 'UNDO_REQUESTED' });

    expect(cardIds(after)).toEqual(cardIds(start));
  });

  it('blocks tool selection while the inspected sequence is on screen', () => {
    const start = startSession();
    const inspected = play(start, { type: 'INSPECTION_REQUESTED' });

    const after = play(inspected, clickTool(inspected, 'promote'));

    expect(after.selectedToolId).toBeNull();
  });

  it('moves to the next sequence after an inspection is dismissed', () => {
    const start = startSession();

    const after = play(start, { type: 'INSPECTION_REQUESTED' }, { type: 'NEXT_SEQUENCE_REQUESTED' });

    expect(after.run.shift.sequenceIndex).toBe(1);
  });

  it('does not advance the run before the sequence has been inspected', () => {
    const start = startSession();

    const after = play(start, { type: 'NEXT_SEQUENCE_REQUESTED' });

    expect(after.run.shift.sequenceIndex).toBe(0);
  });

  it('starts a fresh run from the requested seed on restart', () => {
    const start = startSession();
    const progressed = play(start, { type: 'INSPECTION_REQUESTED' }, { type: 'NEXT_SEQUENCE_REQUESTED' });

    const after = play(progressed, { type: 'RUN_RESTARTED', seed: SEED });

    expect(after).toEqual(start);
  });
});
