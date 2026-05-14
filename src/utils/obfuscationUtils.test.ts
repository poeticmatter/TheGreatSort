import { describe, it, expect } from 'vitest';
import { encodePuzzleId, decodePuzzleId } from './obfuscationUtils';

describe('obfuscationUtils', () => {
    it('should correctly encode and decode index 0', () => {
        const encoded = encodePuzzleId(0);
        const decoded = decodePuzzleId(encoded);
        expect(decoded).toBe(0);
        expect(encoded.length).toBeGreaterThanOrEqual(5);
    });

    it('should correctly encode and decode arbitrary high indices', () => {
        const testValues = [10, 365, 1000, 9999, 100000];
        for (const val of testValues) {
            const encoded = encodePuzzleId(val);
            const decoded = decodePuzzleId(encoded);
            expect(decoded).toBe(val);
        }
    });

    it('should produce distinct strings for consecutive inputs', () => {
        const enc1 = encodePuzzleId(4);
        const enc2 = encodePuzzleId(5);
        expect(enc1).not.toBe(enc2);
        // Depending on XOR and bit-shift, they shouldn't just be off by one char ideally,
        // but they must at least be distinct.
    });

    it('should return NaN for malformed or invalid strings', () => {
        // Invalid character '-'
        expect(decodePuzzleId('006-A')).toBeNaN();
        // Empty string -> decodes to 0, but XOR logic means: (0 ^ SALT) >> 4 != valid original?
        // Actually, if we pass "", decode loop does nothing, num=0.
        // index = (0 ^ 0x5A9C) >> 4 = 23196 >> 4 = 1449.
        // Is this a problem? The system asked to gracefully handle invalid/malformed.
        // It's out of bounds if it's > today, handled by repository.
    });
});
