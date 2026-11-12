import { DEFAULT_RUN_CONFIG } from '../src/engine/run/index.ts';
import {
    Bot,
    createGreedyBot,
    createOracleBot,
    createPatientBot,
    idleBot,
    SimulationSummary,
    simulateRuns
} from '../src/engine/simulation/index.ts';

const DEFAULT_RUN_COUNT = 1000;
const PATIENT_MIN_GAIN_PER_ENERGY = 2;
// How much yield a bot will trade for one favor: 0 ignores stars altogether.
const FAVOR_VALUES = [0, 5, 15];

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;

const printSummary = (summary: SimulationSummary): void => {
    console.log(`\n${summary.botName}`);
    console.log(`  win rate             ${formatPercent(summary.winRate)}`);
    console.log(`  mean strikes         ${summary.meanStrikes.toFixed(2)}`);
    console.log(`  yield per sequence   ${summary.meanYieldPerSequence.toFixed(1)}`);
    console.log(`  stars kept           ${formatPercent(summary.favorRate)}`);
    console.log(`  sequences below par  ${formatPercent(summary.belowTargetRate)}`);
    console.log(`  quota met by shift   ${summary.quotaMetRateByShift.map(formatPercent).join('  ')}`);
    console.log(`  tool uses/sequence   ${summary.meanToolUsesPerSequence.toFixed(2)}  (${summary.toolUseShares.map((share, uses) => `${uses}: ${formatPercent(share)}`).join('  ')})`);
};

const parseRunCount = (argument: string | undefined): number => {
    if (argument === undefined) return DEFAULT_RUN_COUNT;
    const runCount = Number.parseInt(argument, 10);
    if (!Number.isInteger(runCount) || runCount < 1) {
        throw new Error(`Run count must be a positive integer, received "${argument}".`);
    }
    return runCount;
};

const runCount = parseRunCount(process.argv[2]);
const seeds = Array.from({ length: runCount }, (_, index) => index + 1);
const bots: Bot[] = [
    idleBot,
    ...FAVOR_VALUES.map(createGreedyBot),
    ...FAVOR_VALUES.map(favorValue => createPatientBot({ minGainPerEnergy: PATIENT_MIN_GAIN_PER_ENERGY, favorValue })),
    ...FAVOR_VALUES.map(createOracleBot),
];

console.log(`Simulating ${runCount} runs per bot.`);
console.log(`Quota curve: ${DEFAULT_RUN_CONFIG.quotaCurve.join(', ')} over ${DEFAULT_RUN_CONFIG.sequencesPerShift} sequences per shift`);
console.log(`Energy: ${JSON.stringify(DEFAULT_RUN_CONFIG.energy)}`);

for (const bot of bots) {
    printSummary(simulateRuns(bot, seeds, DEFAULT_RUN_CONFIG));
}
