/**
 * Shared utilities for parsing FoxPro SCCTEXT files.
 */

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

/**
 * Parses a single property line from SCCTEXT.
 * @param {string} line - The line to parse
 * @param {object} props - The properties object to populate
 */
export const parsePropertyLine = (line, props) => {
    const propMatch = line.match(/^(\w+)\s*=\s*(.*)/);
    if (propMatch) {
        const pName = propMatch[1];
        let pVal = propMatch[2];

        if ((pVal.startsWith('"') && pVal.endsWith('"')) || (pVal.startsWith("'") && pVal.endsWith("'"))) {
            pVal = pVal.slice(1, -1);
        } else if (pVal === '.T.') pVal = true;
        else if (pVal === '.F.') pVal = false;
        else if (!isNaN(Number(pVal))) pVal = Number(pVal);

        props[pName.toLowerCase()] = pVal;
    }
};

/**
 * Parses method code from the buffer.
 * @param {string} buffer - The raw method code buffer
 * @param {object} methods - The methods object to populate
 */
export const parseMethods = (buffer, methods) => {
    const procedures = buffer.split('PROCEDURE');
    procedures.forEach(proc => {
        if (!proc.trim()) return;
        const lines = proc.trim().split('\n');
        const name = lines[0].trim();
        const codeLines = lines.slice(1).filter(l => l.trim() !== 'ENDPROC');
        const code = 'pass\n' + codeLines.map(l => '# ' + l).join('\n');
        if (name && codeLines.length > 0) methods[name.toLowerCase()] = code;
    });
};

/**
 * Parses the raw SCCTEXT lines into structured objects.
 * @param {string[]} lines - Array of lines from the file
 * @returns {object[]} Array of parsed objects
 */
export const parseCommonObjects = (lines) => {
    const objects = [];
    let currentRecord = {};
    let inProperties = false;
    let inMethods = false;
    let methodBuffer = "";

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line === '[ RECORD]') {
            if (currentRecord.objName) {
                objects.push(currentRecord);
            }
            currentRecord = { props: {}, methods: {} };
            inProperties = false;
            inMethods = false;
            continue;
        }

        // Parse Metadata
        const metaMatch = line.match(/^\[([\w\s]+)\]\s*(.*)/);
        if (metaMatch) {
            const key = metaMatch[1].trim();
            const val = metaMatch[2].trim();

            if (key === 'CLASS') currentRecord.class = val.toLowerCase();
            if (key === 'BASECLASS') currentRecord.baseClass = val.toLowerCase();
            if (key === 'OBJNAME') currentRecord.objName = val;
            if (key === 'PARENT') currentRecord.parent = val;
            if (key === 'PLATFORM') currentRecord.platform = val.toLowerCase(); // Important for DOS detection

            if (key === 'START PROPERTIES') { inProperties = true; continue; }
            if (key === 'END PROPERTIES') { inProperties = false; continue; }
            if (key === 'START METHODS') { inMethods = true; continue; }
            if (key === 'END METHODS') {
                inMethods = false;
                parseMethods(methodBuffer, currentRecord.methods);
                methodBuffer = "";
                continue;
            }
        }

        if (inProperties) {
            parsePropertyLine(line, currentRecord.props);
        }

        if (inMethods) {
            methodBuffer += lines[i] + '\n';
        }
    }
    // Push last record
    if (currentRecord.objName) objects.push(currentRecord);

    // Assign IDs
    objects.forEach(obj => {
        obj.id = generateId();
    });

    return objects;
};
