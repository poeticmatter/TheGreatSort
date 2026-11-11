# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Dev server on port 3000
npm run build      # Production build → dist/
npm run preview    # Preview production build
npm test           # Run tests (Vitest)
npm run test:stress  # Stress test solver optimality
npm run simulate -- 1000  # Simulate roguelike runs per bot and print balance stats
```

## Architecture

**The Great Sort** is a React/TypeScript puzzle game where players sort number sequences using a set of tools, with a narrative "resistance" mechanic layered on top.

### State Management

All game state flows through a single `useGame` hook that composes several specialized hooks:

- `useCoreGame` → board state, tools, moves, undo, phase transitions (via `gameReducer`)
- `useMetaGame` → game mode (DAILY/PRACTICE/TUTORIAL), audit board orchestration
- `useDailyChallenge` → daily puzzle init, lock/result persistence
- `useSolverService` → runs solver to find optimal/worst scores
- `useResistanceSystem` → narrative mechanic triggered by poor scores (via `resistanceReducer`)

State is held in `GameContext` (React Context + useReducer) and consumed via `useGame`.

### Game Flow

1. Puzzle loaded from `src/data/daily_puzzles.json` via `puzzleRepository` + `gameHydrationService`
2. Player applies tools to sort the list → moves recorded in `gameReducer`
3. On submit, `src/engine/solver.ts` calculates optimal/worst scores; player score is compared
4. Results saved to localStorage via `PersistenceService`
5. Daily completion triggers audit board display

### Key Directories

- `src/hooks/` — game logic orchestration (start here for feature work)
- `src/reducers/` — state transitions (`gameReducer.ts`, `resistanceReducer.ts`, `gameState.ts`)
- `src/engine/` — UI-free rules engine, imported via `src/engine/index.ts`. Must not import anything outside its own folder (enforced by `engineBoundary.test.ts`)
  - `grading.ts` — Stalin-sort judging and yield (`gradeLevel`, `calculateBatchScore`)
  - `moves.ts` — `applyMove`
  - `generation.ts` / `random.ts` — seeded sequence and tool generation
  - `solver.ts` / `solutions.ts` — exhaustive search for optimal/worst scores
  - `tools/implementations.ts` — all 13 tool implementations (demote, swap, promote, longswap, sink, halve, shield, shrink, hop, mirror, cycle, equalize, transfer)
  - `run/` — roguelike run rules as pure state transitions (`createRun`, `applyRunMove`, `undoRunMove`, `submitSequence`); tunable numbers live in `run/runConfig.ts`
  - `simulation/` — bots (idle, greedy, patient, oracle) and `simulateRuns`; not part of the app bundle, import it directly rather than through the engine index
- `src/features/run/` — prototype run screen at `/run` (`?seed=N` replays a seed); UI state in `runSessionReducer.ts`
- `src/utils/gameLogic.ts` — Daily-mode scoring on top of the engine: compliance, flavor selection, resistance triggers and mission verification
- `src/services/` — persistence (localStorage), analytics (GA), puzzle hydration
- `src/components/views/` — `GameView` → `PuzzleBoard` / `AuditBoard`
- `src/config/` — resistance status UI config, flavor text

### Resistance System

Players who score at worst-case unlock a "resistance" mechanic. Status states: `INACTIVE → ACTIVE → COMPROMISED/SUCCESS/CAREFUL/EXPOSED`. Once joined, membership persists globally in localStorage. Config/text in `src/config/resistanceStatusConfig.ts` and `src/config/flavorText.ts`.

### Persistence

All persistence is localStorage via `src/services/persistence/index.ts`:
- Daily board state (keyed by date)
- Daily results and history
- Solution cache (performance)
- Resistance membership status

### Environment Variables

- `VITE_GA_ID` — Google Analytics measurement ID

### Testing

- Unit tests: Vitest (`npm test`)
- E2E tests: Playwright (`npx playwright test`)
- Solver stress tests: `npm run test:stress`

### Deployment

Netlify — build command `npm run build`, publish dir `dist/`. All routes redirect to `index.html` (SPA config in `netlify.toml`).
