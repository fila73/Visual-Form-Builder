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

    // Counters for sequential naming
    const counters = {
        label: 0,
        textbox: 0,
        button: 0,
        checkbox: 0,
        radio: 0,
        combobox: 0,
        grid: 0,
        image: 0,
        shape: 0,
        container: 0,
        editbox: 0,
        spinner: 0
    };

    const getNextName = (type) => {
        if (counters[type] === undefined) counters[type] = 0;
        counters[type]++;
        const prefix = type.charAt(0).toUpperCase() + type.slice(1);
        return `${prefix}${counters[type]}`;
    };

    // Helper to parse caption sequences
    const parseCaption = (caption) => {
        let text = caption || '';
        let enabled = true;
        let hotkey = null;
        let isDefault = false;
        let isCancel = false;

        if (text.includes('\\\\')) {
            enabled = false;
            text = text.replace(/\\\\/g, '');
        }
        if (text.includes('\\!')) {
            isDefault = true;
            text = text.replace(/\\!/g, '');
        }
        if (text.includes('\\?')) {
            isCancel = true;
            text = text.replace(/\\\?/g, '');
        }

        const hotkeyMatch = text.match(/\\<(.?)/);
        if (hotkeyMatch) {
            hotkey = hotkeyMatch[1];
            text = text.replace(/\\</g, '');
        }

        // Cleanup other VFP sequences if any
        text = text.replace(/\\/g, '');

        return { text, enabled, hotkey, isDefault, isCancel };
    };

    // --- PASS 1: Extract Procedures ---
    let currentProcName = null;
    let currentProcCode = [];
    let inProcedure = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.match(/^PROCEDURE\s+(\w+)/i)) {
            const match = line.match(/^PROCEDURE\s+(\w+)/i);
            if (currentProcName) {
                procedures[currentProcName.toUpperCase()] = 'pass\n' + currentProcCode.map(l => '# ' + l).join('\n');
            }
            currentProcName = match[1];
            inProcedure = true;
            currentProcCode = [];
            continue;
        }

        if (inProcedure) {
            if (line.startsWith('*-eof')) {
                inProcedure = false;
                continue;
            }
            currentProcCode.push(lines[i]);
        }
    }
    if (currentProcName) {
        procedures[currentProcName.toUpperCase()] = 'pass\n' + currentProcCode.map(l => '# ' + l).join('\n');
    }

    // --- PASS 2: Parse Widgets ---
    const sayPattern = /@\s*([\d\.]+)\s*,\s*([\d\.]+)\s+SAY\s+(.*)/i;
    const getPattern = /@\s*([\d\.]+)\s*,\s*([\d\.]+)\s+GET\s+(.*)/i;
    const windowPattern = /DEFINE\s+WINDOW\s+(\w+)/i;

    const finalFormEvents = {};

    lines.forEach(line => {
        const cleanLine = line.trim();
        if (!cleanLine || cleanLine.startsWith('*')) return;
        if (cleanLine.startsWith('PROCEDURE')) return;

        // Check for Window definition
        const winMatch = cleanLine.match(windowPattern);
        if (winMatch) {
            const isNested = cleanLine.match(/\s+IN\s+(\w+)/i);

            if (!isNested) {
                formName = winMatch[1];

                const SROWS = 25;
                const SCOLS = 80;

                const evalExpr = (expr) => {
                    try {
                        if (!expr) return 0;
                        let e = expr.toUpperCase().replace(/SROWS\(\)/g, SROWS).replace(/SCOLS\(\)/g, SCOLS);
                        e = e.replace(/INT\(/g, 'Math.floor(');
                        return new Function(`return ${e}`)();
                    } catch (err) {
                        console.error('Error evaluating expression:', expr, err);
                        return 0;
                    }
                };

                const dimMatch = cleanLine.match(/FROM\s+(.+?)\s+TO\s+(.+?)(?:\s+(?:NOFLOAT\b|NOCLOSE\b|NOSHADOW\b|NOGROW\b|NOZOOM\b|NOMINIMIZE\b|FLOAT\b|SHADOW\b|TITLE\b|COLOR\b|SCHEME\b|SYSTEM\b|GROW\b|MINIMIZE\b|CLOSE\b|ZOOM\b|DOUBLE\b|PANEL\b|NONE\b|FONT\b|STYLE\b|ICON\b|MDI\b|HALFHEIGHT\b|FOOTER\b|FILL\b|FILE\b|IN\b|NAME\b)|$)/i);

                if (dimMatch) {
                    const fromPart = dimMatch[1];
                    const toPart = dimMatch[2];

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
                        const wChars = col2 - col1 + 1;
                        const hRows = row2 - row1 + 1;

                        formWidth = Math.round(wChars * COL_WIDTH);
                        formHeight = Math.round(hRows * ROW_HEIGHT);
                    }
                }
            }
        }

        // Parse READ CYCLE
        const readCycleMatch = cleanLine.match(/READ\s+CYCLE/i);
        if (readCycleMatch) {
            const showMatch = cleanLine.match(/SHOW\s+(\w+)/i);
            const activateMatch = cleanLine.match(/ACTIVATE\s+(\w+)/i);
            const deactivateMatch = cleanLine.match(/DEACTIVATE\s+(\w+)/i);

            // Helper to parse embedded widgets (Container, Grid)
            const parseEmbeddedWidgets = (procCode) => {
                // Check for nested window definition
                const nestedWinMatch = procCode.match(/DEFINE\s+WINDOW\s+(\w+)\s+FROM\s+([\d\.,\s\(\)\+\-\*\/]+)\s+TO\s+([\d\.,\s\(\)\+\-\*\/]+)\s+IN\s+(\w+)/i);

                if (nestedWinMatch) {
                    const winName = nestedWinMatch[1];
                    const fromPart = nestedWinMatch[2];
                    const toPart = nestedWinMatch[3];

                    const SROWS = 25;
                    const SCOLS = 80;
                    const evalExpr = (expr) => {
                        try {
                            if (!expr) return 0;
                            let e = expr.toUpperCase().replace(/SROWS\(\)/g, SROWS).replace(/SCOLS\(\)/g, SCOLS);
                            e = e.replace(/INT\(/g, 'Math.floor(');
                            return new Function(`return ${e}`)();
                        } catch (err) { return 0; }
                    };
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
                        const wChars = col2 - col1 + 1;
                        const hRows = row2 - row1 + 1;
                        const width = Math.round(wChars * COL_WIDTH);
                        const height = Math.round(hRows * ROW_HEIGHT);
                        const x = Math.round(col1 * COL_WIDTH + PADDING_LEFT);
                        const y = Math.round(row1 * ROW_HEIGHT + PADDING_TOP);

                        const id = generateId();
                        newWidgets.push({
                            id,
                            type: 'container',
                            x, y,
                            props: {
                                width,
                                height,
                                name: getNextName('container'),
                                style: { border: '1px solid #ccc', backgroundColor: '#f0f0f0' }
                            }
                        });
                    }
                }

                // Check for BROWSE command
                const browseMatch = procCode.match(/BROWSE\s+FIELDS\s+(.+?)\s+IN\s+(\w+)/i);
                if (browseMatch) {
                    const fieldsPart = browseMatch[1];
                    const containerName = browseMatch[2];

                    const foundContainer = newWidgets.find(w => w.type === 'container'); // Fallback

                    if (foundContainer) {
                        const columns = [];
                        const fieldDefs = fieldsPart.split(/,(?=(?:[^']*'[^']*')*[^']*$)/).map(f => f.trim());

                        fieldDefs.forEach(def => {
                            const nameMatch = def.match(/^(?:[\w]+\.)?(\w+)/);
                            const name = nameMatch ? nameMatch[1] : 'Column';

                            const isReadOnly = /:R/i.test(def);
                            const headerMatch = def.match(/:H\s*=\s*['"](.*?)['"]/i);
                            const header = headerMatch ? headerMatch[1] : name;

                            columns.push({
                                id: generateId(),
                                header: header,
                                field: name,
                                width: 100,
                                readonly: isReadOnly
                            });
                        });

                        const gridId = generateId();
                        newWidgets.push({
                            id: gridId,
                            type: 'grid',
                            x: 0,
                            y: 0,
                            parentId: foundContainer.id,
                            props: {
                                width: foundContainer.props.width,
                                height: foundContainer.props.height,
                                name: getNextName('grid'),
                                columns: columns,
                                data: [],
                                style: { fontSize: '14px', border: '1px solid #999' }
                            }
                        });
                    }
                }
            };

            if (activateMatch) {
                const procName = activateMatch[1].toUpperCase();
                if (procedures[procName]) {
                    finalFormEvents['Form1_Load'] = procedures[procName];
                    parseEmbeddedWidgets(procedures[procName]);
                }
            }
            if (showMatch) {
                const procName = showMatch[1].toUpperCase();
                if (procedures[procName]) {
                    finalFormEvents['Form1_Init'] = procedures[procName];
                    parseEmbeddedWidgets(procedures[procName]);
                }
            }
            if (deactivateMatch) {
                const procName = deactivateMatch[1].toUpperCase();
                if (procedures[procName]) finalFormEvents['Form1_Unload'] = procedures[procName];
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
                    name: getNextName('label'),
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

            const sizeMatch = content.match(/\s+SIZE\s+([\d\.]+)\s*,\s*([\d\.]+)/i);
            if (sizeMatch) {
                h = parseFloat(sizeMatch[1]);
                w = parseFloat(sizeMatch[2]);
                content = content.substring(0, sizeMatch.index);
            }

            let validProc = null;
            const validMatch = cleanLine.match(/\s+VALID\s+(\w+)(\(\))?/i);
            if (validMatch) {
                validProc = validMatch[1];
            }

            const varMatch = content.match(/^([^\s]+)/);
            const varName = varMatch ? varMatch[1].replace(/^m\./i, '') : 'unknown';

            const picMatch = cleanLine.match(/PICTURE\s+['"](.*?)['"]/i);
            const funcMatch = cleanLine.match(/FUNCTION\s+['"](.*?)['"]/i);
            const clauses = (picMatch ? picMatch[1] : '') + (funcMatch ? funcMatch[1] : '');

            let type = 'textbox';
            let props = { name: varName, text: varName };
            let isGroup = false;
            let groupOptions = [];
            let groupOrientation = 'H';

            // Check for * (Button/Radio/Check)
            const clauseMatch = clauses.match(/^(?:@?)\*([A-Z]*)(?:\s+(.*))?$/i);

            if (clauseMatch) {
                const modifiers = clauseMatch[1].toUpperCase();
                const rawCaptionPart = clauseMatch[2] || '';

                if (modifiers.includes('C')) {
                    type = 'checkbox';
                    props.text = rawCaptionPart.replace(/\\<|\\/g, '').replace(/['"]/g, '');
                }
                else if (modifiers.includes('R')) {
                    type = 'radio';
                    if (modifiers.includes('V')) groupOrientation = 'V';

                    if (rawCaptionPart.includes(';')) {
                        isGroup = true;
                        groupOptions = rawCaptionPart.split(';');
                    } else {
                        const parsed = parseCaption(rawCaptionPart);
                        props.text = parsed.text;
                        if (!parsed.enabled) props.enabled = false;
                        if (parsed.hotkey) props.hotkey = parsed.hotkey;
                    }
                }
                else {
                    // Button (default)
                    type = 'button';
                    if (modifiers.includes('V')) groupOrientation = 'V';

                    if (rawCaptionPart.includes(';')) {
                        isGroup = true;
                        groupOptions = rawCaptionPart.split(';');
                    } else {
                        const parsed = parseCaption(rawCaptionPart || 'Button');
                        props.text = parsed.text;
                        if (!parsed.enabled) props.enabled = false;
                        if (parsed.hotkey) props.hotkey = parsed.hotkey;
                        if (parsed.isDefault) props.default = true;
                        if (parsed.isCancel) props.cancel = true;
                    }
                }
            }
            else if (clauses.includes('^')) {
                type = 'combobox';
                const captionPartMatch = clauses.match(/@\^\s+(.*)$/i);
                let captionPart = captionPartMatch ? captionPartMatch[1] : '';
                if (captionPart) {
                    props.options = captionPart.split(';').map(o => o.trim());
                }
            }

            const startX = Math.round(col * COL_WIDTH + PADDING_LEFT);
            const startY = Math.round(row * ROW_HEIGHT + PADDING_TOP);

            if (isGroup) {
                groupOptions.forEach((opt, idx) => {
                    const parsed = parseCaption(opt);
                    const id = generateId();
                    const widget = {
                        id,
                        type: type === 'radio' ? 'radio' : 'button',
                        x: startX + (groupOrientation === 'H' ? idx * (Math.round(w * COL_WIDTH) + 0) : 0),
                        y: startY + (groupOrientation === 'V' ? idx * (Math.round(h * ROW_HEIGHT) + 0) : 0),
                        props: {
                            text: parsed.text,
                            width: Math.round(w * COL_WIDTH),
                            height: Math.round(h * ROW_HEIGHT),
                            name: getNextName(type === 'radio' ? 'radio' : 'button'),
                            style: {
                                fontSize: '14px',
                                color: '#000000',
                                backgroundColor: type === 'radio' ? undefined : '#f0f0f0'
                            }
                        }
                    };
                    if (!parsed.enabled) widget.props.enabled = false;
                    if (parsed.hotkey) widget.props.hotkey = parsed.hotkey;
                    if (parsed.isDefault) widget.props.default = true;
                    if (parsed.isCancel) widget.props.cancel = true;

                    if (validProc) {
                        finalFormEvents[`${id}_Click`] = procedures[validProc.toUpperCase()];
                    }
                    newWidgets.push(widget);
                });
            } else {
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
                        style: {
                            fontSize: '14px',
                            color: '#000000',
                            backgroundColor: type === 'button' ? '#f0f0f0' : undefined,
                            ...props.style
                        }
                    }
                };
                if (validProc && procedures[validProc.toUpperCase()]) {
                    const eventName = (type === 'button' || type === 'checkbox' || type === 'radio') ? 'Click' : 'LostFocus';
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
    if (typeof alert !== 'undefined') alert(`Načteno ${newWidgets.length} prvků z SPR formátu.`);

    return {
        widgets: newWidgets,
        formEvents: finalFormEvents,
        formName: formName,
        canvasSize: { width: formWidth, height: formHeight }
    };
};
