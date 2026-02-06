// Explicit import to ensure TOOL_REGISTRY is populated in worker bundle
import { TOOL_REGISTRY } from '../tools';
import { findOptimalScore, findWorstScore, generateLevel, generateTools } from '../utils/gameLogic';
import { CardItem, ToolInstance, ToolType } from '../../types';

// Verify registry is populated (prevents tree-shaking)
if (Object.keys(TOOL_REGISTRY).length === 0) {
  console.error('[Solver Worker] TOOL_REGISTRY is empty!');
}

// Define the payload structure
export interface WorkerPayload {
  list: CardItem[];
  tools: ToolInstance[];
  mode: 'OPTIMAL' | 'BOTH';
  id: number | string | undefined;
}

// Define the response structure
export interface WorkerResponse {
  type: 'RESULT';
  id: number | string | undefined;
  optimalScore: number;
  worstScore?: number;
}

self.onmessage = (e: MessageEvent<WorkerPayload>) => {
  const { list, tools, mode, id } = e.data;

  // Calculate Optimal Score
  const optimalScore = findOptimalScore(list, tools);

  let worstScore: number | undefined = undefined;

  // Calculate Worst Score if requested (usually for efficiency metrics)
  if (mode === 'BOTH') {
    worstScore = findWorstScore(list, tools);
  }

  // Send back the results
  const response: WorkerResponse = {
    type: 'RESULT',
    id,
    optimalScore,
    worstScore
  };

  self.postMessage(response);
};
