import {
  applyRunMove,
  canAffordTool,
  canApplyRunMove,
  CardItem,
  createRun,
  DEFAULT_RUN_CONFIG,
  findRunTool,
  gradeLevel,
  RunConfig,
  RunState,
  submitSequence,
  TOOL_REGISTRY,
  undoRunMove,
} from '../../engine';

export interface RunSessionState {
  run: RunState;
  selectedToolId: string | null;
  /** First pick of a two-pick tool, waiting for its second pick. */
  selectedIndex: number | null;
  /** The graded sequence shown after inspection, until the player moves on. */
  inspectedCards: CardItem[] | null;
}

export type RunSessionAction =
  | { type: 'TOOL_CLICKED'; toolId: string }
  | { type: 'CARD_CLICKED'; index: number }
  | { type: 'UNDO_REQUESTED' }
  | { type: 'INSPECTION_REQUESTED' }
  | { type: 'NEXT_SEQUENCE_REQUESTED' }
  | { type: 'RUN_RESTARTED'; seed: number };

export const createRunSession = (seed: number, config: RunConfig = DEFAULT_RUN_CONFIG): RunSessionState => ({
  run: createRun(seed, config),
  selectedToolId: null,
  selectedIndex: null,
  inspectedCards: null,
});

const clearSelection = (state: RunSessionState): RunSessionState => ({
  ...state,
  selectedToolId: null,
  selectedIndex: null,
});

const isPlanning = (state: RunSessionState): boolean =>
  state.run.status === 'IN_PROGRESS' && state.inspectedCards === null;

const selectTool = (state: RunSessionState, toolId: string): RunSessionState => {
  if (state.selectedToolId === toolId) return clearSelection(state);
  if (!canAffordTool(state.run, toolId)) return state;
  return { ...state, selectedToolId: toolId, selectedIndex: null };
};

const applySelectedTool = (state: RunSessionState, toolId: string, index: number, selection?: number): RunSessionState =>
  clearSelection({ ...state, run: applyRunMove(state.run, toolId, index, selection) });

const clickCard = (state: RunSessionState, index: number): RunSessionState => {
  const tool = state.selectedToolId === null ? undefined : findRunTool(state.run, state.selectedToolId);
  if (tool === undefined) return state;

  if (!TOOL_REGISTRY[tool.type].requiresSelection) {
    return canApplyRunMove(state.run, tool.id, index) ? applySelectedTool(state, tool.id, index) : state;
  }

  const firstPick = state.selectedIndex;
  if (firstPick === null) return { ...state, selectedIndex: index };
  if (firstPick === index) return { ...state, selectedIndex: null };

  // An invalid second pick restarts the pair from the card just clicked.
  return canApplyRunMove(state.run, tool.id, index, firstPick)
    ? applySelectedTool(state, tool.id, index, firstPick)
    : { ...state, selectedIndex: index };
};

export const runSessionReducer = (state: RunSessionState, action: RunSessionAction): RunSessionState => {
  if (action.type === 'RUN_RESTARTED') return createRunSession(action.seed, state.run.config);

  if (action.type === 'NEXT_SEQUENCE_REQUESTED') {
    return state.inspectedCards === null ? state : { ...state, run: submitSequence(state.run), inspectedCards: null };
  }

  if (!isPlanning(state)) return state;

  switch (action.type) {
    case 'TOOL_CLICKED':
      return selectTool(state, action.toolId);
    case 'CARD_CLICKED':
      return clickCard(state, action.index);
    case 'UNDO_REQUESTED':
      return clearSelection({ ...state, run: undoRunMove(state.run) });
    case 'INSPECTION_REQUESTED':
      return clearSelection({ ...state, inspectedCards: gradeLevel(state.run.sequence.cards).gradedList });
  }
};
