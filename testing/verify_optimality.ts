
import {
  generateLevel,
  generateTools,
  findOptimalSolution,
  applyMove,
  gradeLevel
} from '../src/utils/gameLogic';

async function runStressTest(iterations: number = 50, length: number = 9) {
  console.log(`Starting Logic Stress Test: ${iterations} iterations, Length ${length}`);

  let failures = 0;

  for (let i = 0; i < iterations; i++) {
    // 1. Setup
    // Use a random integer seed for this iteration
    const seed = Math.floor(Math.random() * 1000000);

    // Generate Level and Tools
    const list = generateLevel(length, seed);
    const toolInstances = generateTools(seed);
    const toolTypes = toolInstances.map(t => t.type);

    // 2. Prediction (Solver)
    // We pass the list and the tool types to the solver
    const solution = findOptimalSolution(list, toolTypes);
    const predictedScore = solution.score;

    // 3. Replay (Reality Check)
    // Deep copy the original list to ensure we start fresh
    let currentList = list.map(item => ({ ...item }));

    // Apply every move in the solution
    for (const move of solution.moves) {
      currentList = applyMove(currentList, move.tool, move.index, move.targetIndex);
    }

    // 4. Verification (Engine)
    // Grade the final state using the actual game rules
    const gradeResult = gradeLevel(currentList);
    const actualScore = gradeResult.score;

    // 5. Assertion
    if (predictedScore === actualScore) {
      process.stdout.write('.');
    } else {
      process.stdout.write('X');
      failures++;
      console.log('\n\n==========================================');
      console.log(`LOGIC FAILURE DETECTED (Iteration ${i + 1})`);
      console.log('==========================================');
      console.log(`Seed: ${seed}`);
      console.log(`Tools: ${toolTypes.join(', ')}`);
      console.log('Original List (Values):', list.map(c => c.val));
      console.log('------------------------------------------');
      console.log(`Predicted Score: ${predictedScore}`);
      console.log(`Actual Score:    ${actualScore}`);
      console.log('------------------------------------------');
      console.log('Moves Sequence:');
      solution.moves.forEach((m, idx) => {
        const targetStr = m.targetIndex !== undefined ? ` -> ${m.targetIndex}` : '';
        console.log(`  ${idx + 1}. ${m.tool.toUpperCase()} @ ${m.index}${targetStr}`);
      });
      console.log('------------------------------------------');
      console.log('Final List (Values):', currentList.map(c => c.val));
      console.log('==========================================\n');

      // We exit immediately on failure to preserve the logs
      process.exit(1);
    }
  }

  console.log(`\n\nTest Complete. ${iterations} scenarios verified.`);
  if (failures === 0) {
    console.log('Result: PASS (No Logic Desyncs)');
  } else {
    // Should be unreachable due to process.exit(1) above, but for completeness
    console.log(`Result: FAIL (${failures} discrepancies found)`);
    process.exit(1);
  }
}

// Execute
runStressTest(50, 9);
