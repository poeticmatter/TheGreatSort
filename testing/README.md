# Solver Testing

This directory contains scripts to test the solver logic for The Great Sort.

## Prerequisites

Ensure you have dependencies installed:
```bash
npm install
```

## Running Tests

You can run these tests using `npx tsx`:

### Main Solver Test
Tests the `findOptimalSolution` function with a predefined scenario.
```bash
npx tsx testing/test_solver.ts
```

### Solver Trace Test
Traces the exploration paths of the solver to verify tool order and recursion depth.
```bash
npx tsx testing/test_solver_trace.ts
```
