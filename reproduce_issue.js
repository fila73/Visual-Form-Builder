
// Copying decodeText and map directly to avoid import issues
const CP895_MAP = {
    0x80: '\u010C', // Č
    0x81: '\u00FC', // ü
    0x82: '\u00E9', // é
    0x83: '\u010F', // ď
    0x84: '\u00E4', // ä
    0x85: '\u010E', // Ď
    0x86: '\u0164', // Ť
    0x87: '\u010D', // č
    0x88: '\u011B', // ě
    0x89: '\u011A', // Ě
    0x8A: '\u0139', // Ĺ
    0x8B: '\u00CD', // Í
    0x8C: '\u013E', // ľ
    0x8D: '\u013A', // ĺ
    0x8E: '\u00C4', // Ä
    0x8F: '\u00C1', // Á
    0x90: '\u00C9', // É
    0x91: '\u017E', // ž
    0x92: '\u017D', // Ž
    0x93: '\u00F4', // ô
    0x94: '\u00F6', // ö
    0x95: '\u00D3', // Ó
    0x96: '\u016F', // ů
    0x97: '\u00DA', // Ú
    0x98: '\u00FD', // ý
    0x99: '\u00D6', // Ö
    0x9A: '\u00DC', // Ü
    0x9B: '\u0160', // Š
    0x9C: '\u013D', // Ľ
    0x9D: '\u00DD', // Ý
    0x9E: '\u0158', // Ř
    0x9F: '\u0165', // ť
    // ...
};

const decodeText = (buffer, encoding) => {
    if (encoding === 'cp895') {
        const view = new Uint8Array(buffer);
        let result = '';
        for (let i = 0; i < view.length; i++) {
            const byte = view[i];
            if (byte < 128) {
                result += String.fromCharCode(byte);
            } else {
                result += CP895_MAP[byte] || String.fromCharCode(byte);
            }
        }
        return result;
    } else {
        const decoder = new TextDecoder(encoding);
        return decoder.decode(buffer);
    }
};

// Mock TextDecoder
if (typeof TextDecoder === 'undefined') {
    const util = require('util');
    global.TextDecoder = util.TextDecoder;
}

// Byte sequence from user's image:
// 27 50 72 6F 67 72 61 6D 20 70 72 6F 20 65 76 69
// 64 65 6E 63 69 20 7A 61 6D 88 73 74 6E 61 6E 63 96
// 'Program pro evidenci zam<88>stnanc<96>'

const bytes = [
    0x27, 0x50, 0x72, 0x6F, 0x67, 0x72, 0x61, 0x6D, 0x20, 0x70, 0x72, 0x6F, 0x20, 0x65, 0x76, 0x69,
    0x64, 0x65, 0x6E, 0x63, 0x69, 0x20, 0x7A, 0x61, 0x6D, 0x88, 0x73, 0x74, 0x6E, 0x61, 0x6E, 0x63, 0x96
];

const buffer = new Uint8Array(bytes).buffer;

console.log('--- Testing CP895 Decoding ---');
const decodedCP895 = decodeText(buffer, 'cp895');
console.log('Result (CP895):', decodedCP895);
console.log('Expected: Program pro evidenci zaměstnanců');

if (decodedCP895.includes('zaměstnanců')) {
    console.log('PASS: CP895 decoded correctly.');
} else {
    console.log('FAIL: CP895 decoding incorrect.');
}

console.log('\n--- Testing Windows-1252 Decoding (Hypothesis) ---');
const decoder1252 = new TextDecoder('windows-1252');
const decoded1252 = decoder1252.decode(buffer);
console.log('Result (Win1252):', decoded1252);
if (decoded1252.includes('zamˆstnanc–')) {
    console.log('CONFIRMED: Output matches user report when using Windows-1252.');
}
