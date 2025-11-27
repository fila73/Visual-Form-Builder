import { componentRegistry } from '../data/componentRegistry.js';

export const parseSPRContent = (text, setCanvasSize, setWidgets, setSelectedId, setFormEvents, setFormName) => {
    const lines = text.split('\n');
    const newWidgets = [];
    const procedures = {}; // Map Name -> Code

    // Conversion constants
    const ROW_HEIGHT = 25;
    const COL_WIDTH = 10;
    const PADDING_TOP = 10;
    const PADDING_LEFT = 10;

    // Helper to generate IDs
    const generateId = () => `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let formName = 'Form1';
    let formWidth = 800;
    let formHeight = 600;

    // --- PASS 1: Extract Procedures ---
    let currentProcName = null;
    let currentProcCode = [];
    let inProcedure = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.match(/^PROCEDURE\s+(\w+)/i)) {
            const match = line.match(/^PROCEDURE\s+(\w+)/i);
            currentProcName = match[1];
            inProcedure = true;
            currentProcCode = [];
            continue;
        }

        if (inProcedure) {
            // Check for end of procedure (often implicit by next procedure or EOF, but let's look for RETURN or just collect until next PROC)
            // Actually, in SPRs, procedures are usually at the end.
            // We'll assume everything until the next PROCEDURE or EOF is part of the current one.
            // But wait, we are iterating lines.

            // If we hit another PROCEDURE, save previous and start new (handled by top if)
            // But we need to handle the "save previous" part.
            // Let's refactor the loop slightly.
        }
    }

    // Better Pass 1 Loop
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const procMatch = line.match(/^PROCEDURE\s+(\w+)/i);

        if (procMatch) {
            if (currentProcName) {
                procedures[currentProcName.toUpperCase()] = currentProcCode.join('\n');
            }
            currentProcName = procMatch[1];
            currentProcCode = [];
            inProcedure = true;
        } else if (inProcedure) {
            // Stop at EOF marker if present
            if (line.startsWith('*-eof')) {
                inProcedure = false;
                continue;
            }
            currentProcCode.push(lines[i]); // Keep original indentation
        }
    }
    // Save last procedure
    if (currentProcName) {
        procedures[currentProcName.toUpperCase()] = currentProcCode.join('\n');
    }


    // --- PASS 2: Parse Widgets ---
    const sayPattern = /@\s*([\d\.]+)\s*,\s*([\d\.]+)\s+SAY\s+(.*)/i;
    const getPattern = /@\s*([\d\.]+)\s*,\s*([\d\.]+)\s+GET\s+(.*)/i;
    const windowPattern = /DEFINE\s+WINDOW\s+(\w+)/i;

    const finalFormEvents = {};

    lines.forEach(line => {
        const cleanLine = line.trim();
        if (!cleanLine || cleanLine.startsWith('*')) return;
        if (cleanLine.startsWith('PROCEDURE')) return; // Skip procedures in Pass 2

        // Check for Window definition
        const winMatch = cleanLine.match(windowPattern);
        if (winMatch) {
            formName = winMatch[1];

            const SROWS = 25;
            const SCOLS = 80;

            const evalExpr = (expr) => {
                try {
                    if (!expr) return 0;
                    // Replace SROWS() and SCOLS() with constants
                    let e = expr.toUpperCase().replace(/SROWS\(\)/g, SROWS).replace(/SCOLS\(\)/g, SCOLS);
                    // Replace INT(...) with Math.floor(...)
                    e = e.replace(/INT\(/g, 'Math.floor(');
                    // Safe eval
                    return new Function(`return ${e}`)();
                } catch (err) {
                    console.error('Error evaluating expression:', expr, err);
                    return 0;
                }
            };

            // Robust parsing using substring
            const upperLine = cleanLine.toUpperCase();
            const fromIdx = upperLine.indexOf(' FROM ');
            const toIdx = upperLine.indexOf(' TO ');

            if (fromIdx !== -1 && toIdx !== -1) {
                // Better: Regex for the whole block using the known structure
                const dimMatch = cleanLine.match(/FROM\s+(.+?)\s+TO\s+(.+?)(?:\s+(?:FLOAT|NOCLOSE|SHADOW|TITLE|COLOR|SYSTEM|GROW|MINIMIZE|CLOSE|ZOOM|DOUBLE|PANEL|NONE)|$)/i);

                if (dimMatch) {
                    const fromPart = dimMatch[1];
                    const toPart = dimMatch[2];

                    // Helper to split coordinates "r, c"
                    const splitCoords = (str) => {
                        const commaIdx = str.indexOf(',');
                        if (commaIdx === -1) return [0, 0];
                        return [str.substring(0, commaIdx), str.substring(commaIdx + 1)];
                    };

                    const [r1s, c1s] = splitCoords(fromPart);
                    const [r2s, c2s] = splitCoords(toPart);

                    const row1 = evalExpr(r1s);
                    const col1 = evalExpr(c1s);
                    const row2 = evalExpr(r2s);
                    const col2 = evalExpr(c2s);

                    if (!isNaN(row1) && !isNaN(col1) && !isNaN(row2) && !isNaN(col2)) {
                        // FoxPro coordinates are inclusive, so add 1 to width/height in chars/rows
                        const wChars = col2 - col1 + 1;
                        const hRows = row2 - row1 + 1;

                        formWidth = Math.round(wChars * COL_WIDTH);
                        formHeight = Math.round(hRows * ROW_HEIGHT);
                    }
                }
            }
        }

        let match;

        // Parse SAY (Labels)
        if ((match = cleanLine.match(sayPattern))) {
            const row = parseFloat(match[1]);
            const col = parseFloat(match[2]);
            let content = match[3];
            let w = 10;
            let h = 1;

            // Check for SIZE clause
            const sizeMatch = content.match(/\s+SIZE\s+([\d\.]+)\s*,\s*([\d\.]+)/i);
            if (sizeMatch) {
                h = parseFloat(sizeMatch[1]);
                w = parseFloat(sizeMatch[2]);
                content = content.substring(0, sizeMatch.index);
            }

            let text = content;
            const textMatch = content.match(/^['"](.*)['"]$/);
            if (textMatch) text = textMatch[1];
            else text = content.trim();

            if (!sizeMatch) w = text.length;

            const x = Math.round(col * COL_WIDTH + PADDING_LEFT);
            const y = Math.round(row * ROW_HEIGHT + PADDING_TOP);
            const width = Math.round(w * COL_WIDTH);
            const height = Math.round(h * ROW_HEIGHT);

            const id = generateId();
            newWidgets.push({
                id,
                type: 'label',
                x, y,
                props: {
                    text,
                    width,
                    height,
                    name: `Label_${id.substr(4)}`,
                    style: { fontSize: '14px', color: '#000000' }
                }
            });
        }
        // Parse GET
        else if ((match = cleanLine.match(getPattern))) {
            const row = parseFloat(match[1]);
            const col = parseFloat(match[2]);
            let content = match[3];
            let w = 10;
            let h = 1;

            // Check for SIZE clause
            const sizeMatch = content.match(/\s+SIZE\s+([\d\.]+)\s*,\s*([\d\.]+)/i);
            if (sizeMatch) {
                h = parseFloat(sizeMatch[1]);
                w = parseFloat(sizeMatch[2]);
                content = content.substring(0, sizeMatch.index);
            }

            // Extract VALID clause
            let validProc = null;
            const validMatch = cleanLine.match(/\s+VALID\s+(\w+)(\(\))?/i);
            if (validMatch) {
                validProc = validMatch[1];
            }

            // Extract variable name
            const varMatch = content.match(/^([^\s]+)/);
            const varName = varMatch ? varMatch[1].replace(/^m\./i, '') : 'unknown';

            // Check for PICTURE / FUNCTION
            const picMatch = cleanLine.match(/PICTURE\s+['"](.*?)['"]/i);
            const funcMatch = cleanLine.match(/FUNCTION\s+['"](.*?)['"]/i);
            const clauses = (picMatch ? picMatch[1] : '') + (funcMatch ? funcMatch[1] : '');

            let type = 'textbox';
            let props = { name: varName, text: varName };
            let isGroup = false;
            let groupOptions = [];
            let groupOrientation = 'H'; // Default Horizontal

            // Analyze Clauses
            if (clauses.includes('*')) {
                // Button (@*N)
                if (clauses.includes('N') || (clauses.includes('H') && !clauses.includes('R')) || (clauses.includes('V') && !clauses.includes('R'))) {
                    type = 'button';

                    // Check orientation
                    if (clauses.includes('V')) groupOrientation = 'V';

                    // Extract Caption(s)
                    // PICTURE "@*HN Add;Edit;Delete"
                    // Look for the part after the codes
                    const captionPartMatch = clauses.match(/@\*[A-Z]+\s+(.*)$/i);
                    let captionPart = captionPartMatch ? captionPartMatch[1] : '';

                    // Remove hotkey markers
                    captionPart = captionPart.replace(/\\<|\\/g, '');

                    if (captionPart.includes(';')) {
                        isGroup = true;
                        groupOptions = captionPart.split(';');
                    } else {
                        props.text = captionPart || 'Button';
                    }
                }
                // Checkbox (@*C)
                else if (clauses.includes('C')) {
                    type = 'checkbox';
                    const captionMatch = clauses.match(/\*C\s+(.*)/);
                    if (captionMatch) {
                        props.text = captionMatch[1].replace(/\\<|\\/g, '').replace(/['"]/g, '');
                    }
                }
                // Radio (@*R)
                else if (clauses.includes('R')) {
                    type = 'radio';
                    if (clauses.includes('V')) groupOrientation = 'V';

                    const captionPartMatch = clauses.match(/@\*R[HV]?\s+(.*)$/i);
                    let captionPart = captionPartMatch ? captionPartMatch[1] : '';
                    captionPart = captionPart.replace(/\\<|\\/g, '');

                    if (captionPart.includes(';')) {
                        isGroup = true;
                        groupOptions = captionPart.split(';');
                    } else {
                        // Single radio? Rare but possible.
                        props.text = captionPart;
                    }
                }
                // Invisible (@*I)
                else if (clauses.includes('I')) {
                    type = 'button';
                    props.text = '';
                    props.style = { opacity: 0.2, border: '1px dashed red' }; // Visual hint for invisible button
                }
            }
            // Popup (@^)
            else if (clauses.includes('^')) {
                type = 'combobox';
                const captionPartMatch = clauses.match(/@\^\s+(.*)$/i);
                let captionPart = captionPartMatch ? captionPartMatch[1] : '';
                if (captionPart) {
                    props.options = captionPart.split(';').map(o => o.trim());
                }
            }

            // Create Widgets
            const startX = Math.round(col * COL_WIDTH + PADDING_LEFT);
            const startY = Math.round(row * ROW_HEIGHT + PADDING_TOP);

            if (isGroup) {
                // Create multiple widgets
                groupOptions.forEach((opt, idx) => {
                    const id = generateId();
                    const widget = {
                        id,
                        type: type === 'radio' ? 'radio' : 'button', // Group implies buttons or radios
                        x: startX + (groupOrientation === 'H' ? idx * (Math.round(w * COL_WIDTH) + 0) : 0), // +0 rozestup mezi tlacitky vertikálně
                        y: startY + (groupOrientation === 'V' ? idx * (Math.round(h * ROW_HEIGHT) + 0) : 0), // +0 rozestup mezi tlacitky horizontálně
                        props: {
                            text: opt,
                            width: Math.round(w * COL_WIDTH),
                            height: Math.round(h * ROW_HEIGHT),
                            name: `${type === 'radio' ? 'Option' : 'Command'}_${id.substr(4)}`,
                            style: { fontSize: '14px', color: '#000000' }
                        }
                    };

                    if (validProc) {
                        finalFormEvents[`${id}_Click`] = procedures[validProc.toUpperCase()];
                    }

                    newWidgets.push(widget);
                });
            } else {
                // Single Widget
                const width = Math.round(w * COL_WIDTH);
                const height = Math.round(h * ROW_HEIGHT);
                const id = generateId();

                const widget = {
                    id,
                    type,
                    x: startX,
                    y: startY,
                    props: {
                        ...props,
                        width,
                        height,
                        style: { fontSize: '14px', color: '#000000', ...props.style }
                    }
                };

                // Attach VALID code
                if (validProc && procedures[validProc.toUpperCase()]) {
                    const eventName = (type === 'button' || type === 'checkbox' || type === 'radio') ? 'Click' : 'LostFocus'; // VALID triggers on exit for textboxes
                    finalFormEvents[`${id}_${eventName}`] = procedures[validProc.toUpperCase()];
                }

                newWidgets.push(widget);
            }
        }
    });

    setCanvasSize({ width: formWidth, height: formHeight });
    setWidgets(newWidgets);
    setFormEvents(finalFormEvents);
    if (setFormName) setFormName(formName);
    setSelectedId(null);
    alert(`Načteno ${newWidgets.length} prvků z SPR formátu.`);
};
