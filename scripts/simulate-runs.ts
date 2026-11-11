import { DEFAULT_RUN_CONFIG } from '../src/engine/run/index.ts';
import {
    Bot,
    createPatientBot,
    greedyBot,
    idleBot,
    oracleBot,
    SimulationSummary,
    simulateRuns
} from '../src/engine/simulation/index.ts';

const DEFAULT_RUN_COUNT = 1000;
const PATIENT_THRESHOLDS = [2, 4, 6];

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;

const printSummary = (summary: SimulationSummary): void => {
    console.log(`\n${summary.botName}`);
    console.log(`  win rate            ${formatPercent(summary.winRate)}`);
    console.log(`  mean strikes        ${summary.meanStrikes.toFixed(2)}`);
    console.log(`  yield per sequence  ${summary.meanYieldPerSequence.toFixed(1)}`);
    console.log(`  quota met by shift  ${summary.quotaMetRateByShift.map(formatPercent).join('  ')}`);
    for (const lengthSummary of summary.byShiftLength) {
        console.log(
            `  ${lengthSummary.sequenceCount}-sequence shifts   ` +
            `quota met ${formatPercent(lengthSummary.quotaMetRate)}, ` +
            `mean banked ${lengthSummary.meanBankedYield.toFixed(0)} ` +
            `(${lengthSummary.shiftsPlayed} shifts)`
        );
    }
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
const bots: Bot[] = [idleBot, greedyBot, ...PATIENT_THRESHOLDS.map(createPatientBot), oracleBot];

console.log(`Simulating ${runCount} runs per bot.`);
console.log(`Quota curve: ${DEFAULT_RUN_CONFIG.quotaCurve.join(', ')}`);

for (const bot of bots) {
    printSummary(simulateRuns(bot, seeds, DEFAULT_RUN_CONFIG));
}
