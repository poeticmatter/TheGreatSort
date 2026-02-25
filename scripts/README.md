# Scripts Documentation

This directory contains utility scripts for **The Great Sort**.

## 🧩 proper Puzzle Generator

**File:** `generate-puzzles.ts`
This script generates deterministic, solvable "Daily Puzzles" for the game. It uses the core game logic to ensure every generated puzzle has a valid optimal solution and meets specific complexity criteria (e.g., minimum depth, unique solution paths, and constraint-based resistance layers).
### Usage

Run the script using `npx tsx`. You generally do not need to compile it first.

```bash
# Generate a single puzzle (default)
npx tsx scripts/generate-puzzles.ts

# Generate a specific number of puzzles (e.g., 30 days worth)
npx tsx scripts/generate-puzzles.ts 30
```

### Parameters

-   **`count`** (optional): The integer argument specifies how many puzzles to generate.
    -   Default: `1`
    -   Example: `npx tsx scripts/generate-puzzles.ts 100`

### Output

The script **overwrites** the file at:
`[Project Root]/src/data/daily_puzzles.json`

### Logic & Constraints

The generator enforces the following rules for "Production Quality" puzzles:
1.  **Solvability**: Every puzzle must be solvable.
2.  **Minimum Depth**: Puzzles solvable in fewer than `MIN_SOLUTION_DEPTH` (default: 4) moves are discarded to ensure baseline difficulty for the optimal path.
3.  **Unique Solutions**: Puzzles with multiple distinct max-yield end-states are discarded to prevent ambiguity in the optimal score.
4.  **Resistance Layer (Alt Path)**: Each base puzzle mandates a valid Resistance mission. The script searches for alternative solutions satisfying these constraints:
    - **Resistance Agent**: Must be eliminated in the optimal path, but survives in the alt path.
    - **State Agent**: Must be safe in the optimal path, but eliminated in the alt path.
    - **Complexity & Depth Requirement**: To ensure Resistance alt-solutions aren't trivial, they must individually require at least 4 meaningful, non-redundant tool uses (NOOP moves like swapping with self are pruned). If multiple valid missions exist for the same agents, the one with the highest sequence depth (followed by max yield) is selected for the `targetYield`.
    - **Fallback**: If a solid base puzzle cannot fulfill this strict resistance constraint, the generator discards it and attempts another seed.

### Troubleshooting

-   **`ERR_MODULE_NOT_FOUND`**: If you use `ts-node`, you may encounter module resolution errors because this project uses ES Modules (`"type": "module"` in `package.json`).
    -   **Fix**: Use `tsx` (TypeScript Execute) as shown in the commands above. It handles ESM natively.

## 📊 Analyze Puzzles

**File:** `analyze-puzzles.ts`

This script reads a **puzzle candidate file** (usually `puzzles/puzzle-candidates.json`, though the generator currently outputs to `daily_puzzles.json` so you may need to adjust the path or input file if you are analyzing raw candidates) and provides a statistical report on reliability, complexity, and fairness.

**Note:** The current `generate-puzzles.ts` outputs directly to `daily_puzzles.json`. The `analyze-puzzles.ts` script is configured to read from `puzzles/puzzle-candidates.json`. If you want to analyze the production file, you might need to point the script to `puzzles/daily_puzzles.json` or rename the file.

### Usage

```bash
npx tsx scripts/analyze-puzzles.ts
```

### Metrics Reported

-   **Yield Statistics**: Min, Max, and Median yield changes.
-   **Complexity Deep Dive**: P50, P90, and P99 percentiles for computational complexity (nodes visited).
-   **Tool Distribution**: Compares the *actual* frequency of tools appearing in puzzles vs. their *target* weight defined in `src/toolDefinitions`.
-   **Solution Mode**: Percentage of puzzles resolving to ASC vs DESC.

