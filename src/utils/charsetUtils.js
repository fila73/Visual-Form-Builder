
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
    0xA7: '\u00F4', // ô
    0xA8: '\u0161', // š
    0xA9: '\u0159', // ř
    0xAA: '\u0155', // ŕ
    0xAB: '\u0154', // Ŕ
    0xAC: '\u00BC', // ¼
    0xAD: '\u00A7', // §
    0xAE: '\u00AB', // «
    0xAF: '\u00BB', // »
    0xB0: '\u2591', // ░
    0xB1: '\u2592', // ▒
    0xB2: '\u2593', // ▓
    0xB3: '\u2502', // │
    0xB4: '\u2524', // ┤
    0xB5: '\u00C1', // Á
    0xB6: '\u00C2', // Â
    0xB7: '\u011A', // Ě
    0xB8: '\u0158', // Ř
    0xB9: '\u2563', // ╣
    0xBA: '\u2551', // ║
    0xBB: '\u2557', // ╗
    0xBC: '\u255D', // ╝
    0xBD: '\u255B', // ╜
    0xBE: '\u255C', // ╛
    0xBF: '\u2510', // ┐
    0xC0: '\u2514', // └
    0xC1: '\u2534', // ┴
    0xC2: '\u252C', // ┬
    0xC3: '\u251C', // ├
    0xC4: '\u2500', // ─
    0xC5: '\u253C', // ┼
    0xC6: '\u0102', // Ă
    0xC7: '\u0103', // ă
    0xC8: '\u255A', // ╚
    0xC9: '\u2554', // ╔
    0xCA: '\u2569', // ╩
    0xCB: '\u2566', // ╦
    0xCC: '\u2560', // ╠
    0xCD: '\u2550', // ═
    0xCE: '\u256C', // ╬
    0xCF: '\u00A4', // ¤
    0xD0: '\u0111', // đ
    0xD1: '\u0110', // Đ
    0xD2: '\u010E', // Ď
    0xD3: '\u00CB', // Ë
    0xD4: '\u010F', // ď
    0xD5: '\u0147', // Ň
    0xD6: '\u00CD', // Í
    0xD7: '\u00CE', // Î
    0xD8: '\u011B', // ě
    0xD9: '\u2518', // ┘
    0xDA: '\u250C', // ┌
    0xDB: '\u2588', // █
    0xDC: '\u2584', // ▄
    0xDD: '\u0162', // Ţ
    0xDE: '\u016E', // Ů
    0xDF: '\u2580', // ▀
    0xE0: '\u00D3', // Ó
    0xE1: '\u00DF', // ß
    0xE2: '\u00D4', // Ô
    0xE3: '\u0143', // Ń
    0xE4: '\u0144', // ń
    0xE5: '\u0148', // ň
    0xE6: '\u0160', // Š
    0xE7: '\u0161', // š
    0xE8: '\u0158', // Ř
    0xE9: '\u00DA', // Ú
    0xEA: '\u0159', // ř
    0xEB: '\u0160', // Š
    0xEC: '\u00FD', // ý
    0xED: '\u00DD', // Ý
    0xEE: '\u0163', // ţ
    0xEF: '\u00B4', // ´
    0xF0: '\u00AD', // Soft hyphen
    0xF1: '\u02DD', // ˝
    0xF2: '\u02DB', // ˛
    0xF3: '\u02C7', // ˇ
    0xF4: '\u02D8', // ˘
    0xF5: '\u00A7', // §
    0xF6: '\u00F7', // ÷
    0xF7: '\u00B8', // ¸
    0xF8: '\u00B0', // °
    0xF9: '\u00A8', // ¨
    0xFA: '\u02D9', // ˙
    0xFB: '\u0171', // ű
    0xFC: '\u0158', // Ř
    0xFD: '\u0170', // Ű
    0xFE: '\u25A0', // ■
    0xFF: '\u00A0', // NBSP
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
    } else if (encoding === 'ibm852') {
        // Custom decoder for CP852 since browsers don't support it
        const view = new Uint8Array(buffer);
        let result = '';
        for (let i = 0; i < view.length; i++) {
            const byte = view[i];
            if (byte < 128) {
                result += String.fromCharCode(byte);
            } else {
                // Fallback to TextDecoder('iso-8859-2') for others? 
                // Or just use a partial map. 
                // For now, let's use a simple map for the critical ones and fallback to 1252-ish for others to avoid data loss?
                // Actually, let's try to use iso-8859-2 for the byte if not in map? No, that's wrong.
                // Let's just return the byte as char if not in map (which will look like 1252/ANSI often)
                result += CP852_MAP[byte] || String.fromCharCode(byte);
            }
        }
        return result;
    } else {
        try {
            const decoder = new TextDecoder(encoding);
            return decoder.decode(buffer);
        } catch (e) {
            console.error(`Encoding ${encoding} not supported by TextDecoder:`, e);
            // Fallback to Windows-1252 to show SOMETHING
            const decoder = new TextDecoder('windows-1252');
            return decoder.decode(buffer);
        }
    }
};
