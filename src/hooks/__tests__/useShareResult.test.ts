import { describe, test, expect } from 'vitest';
import { generateEmojiGrid, formatSharePayload, getWeightedFlavor } from '../useShareResult';
import { CardItem } from '../../types';
import { SHARE_FLAVOR_DATABASE } from '../../config/shareFlavor';

describe('Smart Share Logic', () => {

    test('generateEmojiGrid creates correct string', () => {
        const items = [
            { status: 'safe' },
            { status: 'eliminated' },
            { status: 'safe' }
        ] as CardItem[];

        // Expectation: Yellow (Safe), Red (Eliminated), Yellow (Safe)
        expect(generateEmojiGrid(items)).toBe('🟨🟥🟨');
    });

    test('getWeightedFlavor returns valid text for mood', () => {
        const flavor = getWeightedFlavor('SOLVED');
        const possibleTexts = SHARE_FLAVOR_DATABASE['SOLVED'].map(e => e.text);
        expect(possibleTexts).toContain(flavor);
    });

    test('formatSharePayload constructs correct format', () => {
        const output = formatSharePayload(1000, 95, "Test Flavor", "😐💀", "2024-01-01");
        const lines = output.split('\n');

        expect(lines[0]).toBe('THE GREAT SORT 2024-01-01');
        expect(lines[1]).toBe('Citizen Yield: 1000');
        expect(lines[2]).toBe('Compliance: 95%');
        expect(lines[4]).toBe('"Test Flavor"');
        expect(lines[6]).toBe('😐💀');
    });
});
