import { SequenceOutcome } from '../../engine';

// Narrative only: the manager's mood reflects each sequence's yield against
// its share of the quota, and changes nothing in the rules.
const DISPLEASED_LINES = [
  'The shift manager appears displeased.',
  'The shift manager makes a note on his clipboard.',
  'The shift manager lingers behind your chair.',
  'A cough from the manager\'s desk. Not a friendly one.',
];

const SATISFIED_LINES = [
  'The shift manager nods and moves on.',
  'The shift manager says nothing. That is good.',
  'The manager\'s pen stays in his pocket.',
];

const FAVOR_LINE = 'Someone will remember that you kept the marked one.';

/** Picks a line by position so the same sequence always draws the same reaction. */
const pickLine = (lines: string[], position: number): string => lines[position % lines.length];

export const describeManagerReaction = (outcome: SequenceOutcome, sequencePosition: number): string =>
  pickLine(outcome.isBelowTarget ? DISPLEASED_LINES : SATISFIED_LINES, sequencePosition);

export const describeFavor = (outcome: SequenceOutcome): string | null =>
  outcome.favorsEarned > 0 ? FAVOR_LINE : null;
