/**
 * Generates a unique ID for widgets.
 * @returns {string} Unique ID
 */
export const generateId = () => `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Removes surrounding quotes from a string.
 * @param {string} str - The string to clean
 * @returns {string} Cleaned string
 */
export const cleanString = (str) => {
    if (!str) return '';
    let s = str.trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        return s.slice(1, -1);
    }
    return s;
};

/**
 * Converts a Visual FoxPro color code (integer) to an RGB string.
 * @param {number} colorCode - VFP color integer
 * @returns {string|null} RGB string or null if invalid
 */
export const vfpColorToRgb = (colorCode) => {
    if (colorCode === undefined || colorCode === null || isNaN(colorCode)) return null;
    const r = colorCode & 255;
    const g = (colorCode >> 8) & 255;
    const b = (colorCode >> 16) & 255;
    return `rgb(${r}, ${g}, ${b})`;
};

/**
 * Capitalizes the first letter of a string.
 * @param {string} s - String to capitalize
 * @returns {string} Capitalized string
 */
export const capitalize = (s) => {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
};
