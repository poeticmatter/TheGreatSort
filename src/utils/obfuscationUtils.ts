const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const SALT = 0x5A9C; // Arbitrary XOR salt
const MIN_LENGTH = 5;

export const encodePuzzleId = (index: number): string => {
    // 1. Shift and XOR to obfuscate
    // Ensure it's a positive 32-bit integer
    let num = ((index << 4) ^ SALT) >>> 0;

    // 2. Base62 Encode
    let str = "";
    while (num > 0) {
        str = BASE62[num % 62] + str;
        num = Math.floor(num / 62);
    }

    // 3. Pad to minimum length
    return str.padStart(MIN_LENGTH, BASE62[0]);
};

export const decodePuzzleId = (obfuscatedId: string): number => {
    // 1. Base62 Decode
    let num = 0;
    for (let i = 0; i < obfuscatedId.length; i++) {
        const char = obfuscatedId[i];
        const val = BASE62.indexOf(char);
        if (val === -1) {
            return NaN; // Invalid character
        }
        num = num * 62 + val;
    }

    // 2. Reverse XOR and shift
    const index = (num ^ SALT) >> 4;

    return index;
};
