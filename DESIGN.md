# The Great Sort — Design Document

## Overview

The Great Sort is a strategic sorting puzzle game with a dystopian narrative layer. Players manipulate sequences of numbered cards using a set of single-use tools to maximize a score, with an optional underground resistance mission woven through the daily challenge mode.

The core tension is between **optimization** (achieving the highest possible score) and **compliance** (performing well enough relative to the theoretical best). A secondary narrative tension emerges through the Resistance system, where players can secretly subvert the sorting process to protect or expose specific agents embedded in the sequence.

---

## Core Game Loop

**Sort → Inspect → Score**

1. **Planning Phase**: The player is given a sequence of 9 numbered cards and 4 single-use tools. They apply tools in any order to rearrange or modify the sequence.
2. **Inspection Phase**: The system evaluates the final sequence card by card, determining which cards "survive." This plays out as an animation.
3. **Results Phase**: The final score (sum of surviving card values) is shown alongside a compliance percentage comparing the player's result to the theoretical optimal and worst outcomes.

---

## Survival Rules

The scoring model is a linear survival simulation:

- The **first card always survives**.
- Each subsequent card is compared to the last survivor:
  - If the first difference was an increase, **ASC mode** is set: a card survives only if `val >= lastSurvivorVal`.
  - If the first difference was a decrease, **DESC mode** is set: a card survives only if `val <= lastSurvivorVal`.
- A card with a **shield** always survives regardless of the comparison.
- The final score is the **sum of all survivor values**.

The mode is not visible to the player until inspection begins, creating strategic uncertainty. Players must anticipate what ordering will produce the most survivors given where the first drop or rise occurs.

---

## Scoring & Compliance

Three values define the scoring context for any puzzle:

- **optimalYield**: The highest theoretically achievable score, computed by the solver.
- **worstYield**: The lowest theoretically achievable score.
- **currentYield**: The player's actual score.

**Compliance %** is calculated as:

```
((currentYield - worstYield) / (optimalYield - worstYield)) × 100
```

This gives 0% for the worst possible result and 100% for the optimal, with everything else proportionally between. If optimal equals worst (a trivial puzzle), the fallback is `(current / optimal) × 100`.

---

## Tools

Players receive 4 tools per puzzle, randomly selected from 13 types with weighted probabilities. Each tool is single-use.

### Positioning Tools

| Tool | Effect |
|------|--------|
| **Demote** | Moves a card to the end of the sequence |
| **Promote** | Moves a card to the beginning |
| **Swap** | Swaps two adjacent cards |
| **LongSwap** | Swaps two non-adjacent cards |
| **Hop** | Swaps the two neighbors of a card (card stays in place) |
| **Mirror** | Swaps a card with its mirror position from the other end |
| **Cycle** | Rotates a 3-card block left or right |

### Value-Modifying Tools

| Tool | Effect |
|------|--------|
| **Halve** | Floors a card's value to `val / 2` |
| **Shrink** | Decreases a card's value by 3 |
| **Sink** | Sets two adjacent cards to `min(val1, val2)` |
| **Transfer** | Moves 2 value from one card to a non-adjacent card |
| **Equalize** | Sets two non-adjacent cards to `floor((val1 + val2) / 2)` |

### Special Tools

| Tool | Effect |
|------|--------|
| **Shield** | Grants a card unconditional survival; removes the card to its immediate left as the cost |

### Tool Selection Weights

Common tools (weight 20): Demote, Promote, Swap
Mid-weight tools (weight 10): LongSwap, Hop
Rare tools (weight 5): Shrink, Sink, Halve, Equalize, Transfer, Mirror
Very rare (weight 2): Shield, Cycle

### Interaction Model

Single-target tools (Demote, Promote, Halve, Shield, Shrink, Hop, Mirror) activate on one click after tool selection.

Two-target tools (Swap, LongSwap, Sink, Transfer, Equalize, Cycle) require two card selections. The player can select a tool first then two cards, or select the first card then the tool then the second card.

---

## Game Modes

### Daily

One puzzle per calendar date, drawn from a pre-generated database (`daily_puzzles.json`). Each puzzle has a fixed sequence, a fixed set of 4 tools, and pre-calculated optimal/worst targets.

- Daily puzzles can only be played once per day; the result is locked on completion.
- Mid-puzzle progress is auto-saved and can be resumed.
- Daily puzzles include `resistanceData` for the Resistance system.

### Practice

Procedurally generated puzzles with a random 9-card sequence (values 1–18) and randomly weighted tool selection. No solver is invoked, so no compliance score is shown. No persistence between sessions. Unlimited replays.

---

## The Resistance System

The Resistance is a hidden narrative mechanic that activates once per player lifetime in Daily mode. It reframes the sorting task as an act of covert sabotage.

### Activation

The Resistance invitation triggers the first time a player achieves the **worst possible score** on a Daily puzzle (compliance = 0%), provided they have at least one move and have not already joined.

The player is shown flavor text framing the invitation and can choose to join.

### Mechanics

If the player joins:
- `hasJoinedResistance: true` is saved to localStorage permanently.
- All future Daily puzzles reload with **agent cards** marked on the sequence:
  - One card is a **Resistance agent** (must survive inspection).
  - One card is a **State agent** (must be eliminated during inspection).
- Each puzzle also has a **targetYield** — a score threshold the mission requires meeting.
- The puzzle resets from scratch with these agents visible.

### Outcomes

After inspection completes, agent status is evaluated:

| Status | Condition |
|--------|-----------|
| **SUCCESS** | Resistance agent survived, State agent eliminated, `yield >= targetYield` |
| **CAREFUL** | Resistance agent survived, State agent eliminated, `yield < targetYield` |
| **EXPOSED** | Resistance agent was eliminated |
| **COMPROMISED** | State agent survived |

All outcomes are saved alongside the daily score.

---

## Solver

The solver (`solverCore.ts`) performs exhaustive depth-first search over all possible move sequences to find the theoretical optimal and worst scores.

**Inputs**: The initial card sequence, available tool types, and an objective (`MAX` or `MIN`).

**Method**: Recursive DFS with memoization. At each node, the solver tries every remaining tool applied to every valid card position. It tracks the globally best score found, the state that produced it, and the shortest path to reach it. Explored states are memoized by sequence + shield values to avoid redundant branches. NOOP moves (moves with no effect) are pruned.

**Outputs**: Best score, the resulting sequence, the move sequence to achieve it, and a computational complexity count.

The solver is also used in the stress test suite (`npm run test:stress`) to verify puzzle quality.

---

## Persistence

All persistence is via localStorage through `PersistenceService`:

| Key | Contents |
|-----|----------|
| Daily state | Current puzzle seed, move history, board snapshot — saved on every state change |
| Daily result | Final score, date, resistance status — written on completion, locks replay |
| Daily history | Per-date attempt stats |
| Solution cache | Cached solver results for performance |
| Resistance status | `hasJoinedResistance` flag |

On load, the game checks for a saved state first. If the puzzle is already completed, it jumps to the results screen. If in-progress, it restores the mid-game state by replaying moves from the initial board.

---

## Narrative & Flavor

The game is set in a dystopian bureaucratic state. Citizens perform sorting work as civic duty under government oversight. An underground resistance recruits sympathetic workers to manipulate data flows while maintaining plausible deniability.

Flavor text is keyed to game outcomes and drawn per-puzzle from weighted pools:

| Key | Context |
|-----|---------|
| `INITIAL` | Shown at start of planning phase |
| `SUSPICIOUS` | Shown during play |
| `ADEQUATE` | Mediocre result |
| `SOLVED` | Near-optimal result |
| `DONE` | Puzzle complete |
| `RES_SUCCESS` | Mission succeeded |
| `RES_CAREFUL` | Mission passed but yield was low |
| `RES_AGENT_LOST` | Resistance agent eliminated |
| `RES_STATE_ESCAPED` | State agent survived |

Sample narrative voices:
- Worker: *"My family will eat today."*
- State: *"The Manager is watching."*
- Resistance: *"The signal is strong."*

---

## Inspection Animation

The inspection phase runs as a JavaScript generator (`createInspectionStream`) yielding one step per card. Each step dispatches a state update through the reducer, showing:
- **Scanning** state: 400ms
- **Safe / Eliminated** state: 600ms

For a 9-card sequence, a full inspection takes approximately 9 seconds. The `detectedMode` (ASC/DESC) is revealed mid-stream as each card is evaluated.

---

## Puzzle Format (daily_puzzles.json)

```json
{
  "id": 0,
  "sequence": [17, 2, 11, 13, 3, 7, 14, 1, 6],
  "tools": ["swap", "longswap", "demote", "longswap"],
  "targets": { "min": 3, "max": 69 },
  "resistanceData": {
    "agents": { "4": "resistance", "5": "state" },
    "targetYield": 64,
    "solution": [...]
  }
}
```

Each entry maps one-to-one to a calendar date. The `targets` field records pre-calculated worst (`min`) and optimal (`max`) scores. `resistanceData` contains agent positions, the yield threshold, and a verified solution path.

---

## Card State Machine

Each card tracks a `status` through inspection:

```
pending → scanning → safe
                   → eliminated
```

Cards with `hasShield: true` always resolve to `safe`. Cards with a `role` of `resistance` or `state` are visually distinguished when the Resistance system is active.

---

## Tech Stack Summary

- **React 19** with TypeScript, React Router 7
- **Vite 6** build tool, **Tailwind CSS 4** for styling
- **Framer Motion** for animations
- **Vitest** for unit tests, **Playwright** for E2E
- **Netlify** deployment (SPA redirect via `netlify.toml`)
- **Google Analytics** via `VITE_GA_ID` env var
