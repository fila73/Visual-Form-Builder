
// CP895 (Kamenických) to Unicode mapping for the upper 128 bytes (0x80 - 0xFF)
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
    0xA0: '\u00E1', // á
    0xA1: '\u00ED', // í
    0xA2: '\u00F3', // ó
    0xA3: '\u00FA', // ú
    0xA4: '\u0148', // ň
    0xA5: '\u0147', // Ň
    0xA6: '\u016E', // Ů
    0xA7: '\u00D4', // Ô
    0xA8: '\u0161', // š
    0xA9: '\u0159', // ř
    0xAA: '\u0155', // ŕ
    0xAB: '\u0154', // Ŕ
    0xAC: '\u003F', // ?
    0xAD: '\u00A7', // §
    0xAE: '\u00BB', // »
    0xAF: '\u00AB', // «
    0xB0: '\u003F', // ?
    0xB1: '\u003F', // ?
    0xB2: '\u003F', // ?
    0xB3: '\u007C', // |
    0xB4: '\u002B', // +
    0xB5: '\u003F', // ?
    0xB6: '\u003F', // ?
    0xB7: '\u003F', // ?
    0xB8: '\u003F', // ?
    0xB9: '\u002B', // +
    0xBA: '\u007C', // |
    0xBB: '\u002B', // +
    0xBC: '\u002B', // +
    0xBD: '\u003F', // ?
    0xBE: '\u003F', // ?
    0xBF: '\u002B', // +
    0xC0: '\u002B', // +
    0xC1: '\u002B', // +
    0xC2: '\u002B', // +
    0xC3: '\u002B', // +
    0xC4: '\u002D', // -
    0xC5: '\u002B', // +
    0xC6: '\u003F', // ?
    0xC7: '\u003F', // ?
    0xC8: '\u002B', // +
    0xC9: '\u002B', // +
    0xCA: '\u002B', // +
    0xCB: '\u002B', // +
    0xCC: '\u002B', // +
    0xCD: '\u002D', // -
    0xCE: '\u002B', // +
    0xCF: '\u003F', // ?
    0xD0: '\u003F', // ?
    0xD1: '\u003F', // ?
    0xD2: '\u003F', // ?
    0xD3: '\u003F', // ?
    0xD4: '\u003F', // ?
    0xD5: '\u003F', // ?
    0xD6: '\u003F', // ?
    0xD7: '\u003F', // ?
    0xD8: '\u003F', // ?
    0xD9: '\u002B', // +
    0xDA: '\u002B', // +
    0xDB: '\u002D', // -
    0xDC: '\u002D', // -
    0xDD: '\u003F', // ?
    0xDE: '\u003F', // ?
    0xDF: '\u002D', // -
    0xE0: '\u003F', // ?
    0xE1: '\u003F', // ?
    0xE2: '\u003F', // ?
    0xE3: '\u00B6', // ¶
    0xE4: '\u003F', // ?
    0xE5: '\u003F', // ?
    0xE6: '\u00B5', // µ
    0xE7: '\u003F', // ?
    0xE8: '\u003F', // ?
    0xE9: '\u003F', // ?
    0xEA: '\u003F', // ?
    0xEB: '\u003F', // ?
    0xEC: '\u003F', // ?
    0xED: '\u003F', // ?
    0xEE: '\u003F', // ?
    0xEF: '\u003F', // ?
    0xF0: '\u003F', // ?
    0xF1: '\u00B1', // ±
    0xF2: '\u003F', // ?
    0xF3: '\u003F', // ?
    0xF4: '\u003F', // ?
    0xF5: '\u003F', // ?
    0xF6: '\u00F7', // ÷
    0xF7: '\u003F', // ?
    0xF8: '\u00B0', // °
    0xF9: '\u003F', // ?
    0xFA: '\u00B7', // ·
    0xFB: '\u003F', // ?
    0xFC: '\u003F', // ?
    0xFD: '\u0032', // 2
    0xFE: '\u003F', // ?
    0xFF: '\u003F', // ?
};

// CP852 (Latin 2) partial map for critical characters
const CP852_MAP = {
    0x88: '\u0142', // ł
    0x96: '\u013E', // ľ
    // Add more if needed, but these are the ones conflicting with CP895 ě/ů
};

export const decodeText = (buffer, encoding) => {
    console.log(`Decoding with: ${encoding}`);

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
        try {
            // Try to use native TextDecoder for all other encodings
            // This supports utf-8, windows-1250, windows-1252, ibm866, etc.
            // Note: 'ibm852', 'ibm437', 'ibm850' are often supported by modern browsers
            const decoder = new TextDecoder(encoding);
            return decoder.decode(buffer);
        } catch (e) {
            console.warn(`Encoding ${encoding} not supported by TextDecoder, falling back to windows-1252:`, e);
            // Fallback to Windows-1252 to show SOMETHING
            const decoder = new TextDecoder('windows-1252');
            return decoder.decode(buffer);
        }
    }
};
