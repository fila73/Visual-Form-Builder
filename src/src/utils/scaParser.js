import { WIDGET_TYPES } from '../constants/index.jsx';

export const parseSCAContent = (text, setCanvasSize, setWidgets, setSelectedId, setFormEvents) => {
    const lines = text.split('\n');
    const newWidgets = [];
    let currentRecord = {};
    let inProperties = false;
    let inMethods = false;
    let methodBuffer = "";

    // Temporary storage for all objects to resolve hierarchy later
    const objects = [];

    const typeMap = {
        'commandbutton': 'BUTTON',
        'textbox': 'TEXTBOX',
        'editbox': 'EDITBOX',
        'spinner': 'SPINNER',
        'label': 'LABEL',
        'checkbox': 'CHECKBOX',
        'optionbutton': 'RADIO',
        'combobox': 'COMBO',
        'grid': 'GRID',
        'image': 'IMAGE',
        'shape': 'SHAPE',
        'form': 'FORM',
        'container': 'CONTAINER'
    };

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

            if (key === 'START PROPERTIES') { inProperties = true; continue; }
            if (key === 'END PROPERTIES') { inProperties = false; continue; }
            if (key === 'START METHODS') { inMethods = true; continue; }
            if (key === 'END METHODS') {
                inMethods = false;
                // Parse methods from buffer
                const procedures = methodBuffer.split('PROCEDURE');
                procedures.forEach(proc => {
                    if (!proc.trim()) return;
                    const lines = proc.trim().split('\n');
                    const name = lines[0].trim();
                    const code = lines.slice(1).filter(l => l.trim() !== 'ENDPROC').join('\n');
                    if (name && code) currentRecord.methods[name.toLowerCase()] = code;
                });
                methodBuffer = "";
                continue;
            }
        }

        if (inProperties) {
            const propMatch = line.match(/^(\w+)\s*=\s*(.*)/);
            if (propMatch) {
                const pName = propMatch[1];
                let pVal = propMatch[2];
                // Remove quotes if string
                if ((pVal.startsWith('"') && pVal.endsWith('"')) || (pVal.startsWith("'") && pVal.endsWith("'"))) {
                    pVal = pVal.slice(1, -1);
                } else if (pVal === '.T.') pVal = true;
                else if (pVal === '.F.') pVal = false;
                else if (!isNaN(Number(pVal))) pVal = Number(pVal);

                currentRecord.props[pName.toLowerCase()] = pVal;
            }
        }

        if (inMethods) {
            methodBuffer += lines[i] + '\n'; // Keep original line for indentation
        }
    }
    // Push last record
    if (currentRecord.objName) objects.push(currentRecord);

    // Process Objects
    let formProps = { width: 800, height: 600 };
    let formMethods = {};

    // First pass: Find Form and Containers to establish offsets
    const containerOffsets = {};

    objects.forEach(obj => {
        if (obj.baseClass === 'form') {
            if (obj.props.width) formProps.width = obj.props.width;
            if (obj.props.height) formProps.height = obj.props.height;
            containerOffsets[obj.objName] = { x: 0, y: 0 };
            formMethods = obj.methods;
        }
    });

    // Calculate container absolute positions (simple 1-level nesting support for now)
    objects.forEach(obj => {
        if (obj.baseClass === 'container') {
            const parentOffset = containerOffsets[obj.parent?.split('.').pop()] || { x: 0, y: 0 };
            containerOffsets[obj.objName] = {
                x: parentOffset.x + (obj.props.left || 0),
                y: parentOffset.y + (obj.props.top || 0)
            };
        }
    });

    // Second pass: Create Widgets
    objects.forEach(obj => {
        const mappedType = typeMap[obj.baseClass] || typeMap[obj.class];

        if (mappedType && mappedType !== 'FORM') {
            const parentName = obj.parent?.split('.').pop();
            const offset = containerOffsets[parentName] || { x: 0, y: 0 };

            const newWidget = {
                id: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: mappedType,
                name: obj.objName,
                parentId: parentName, // Store parent ID for dragging
                x: (obj.props.left || 0) + offset.x,
                y: (obj.props.top || 0) + offset.y,
                props: { ...WIDGET_TYPES[mappedType].defaultProps },
                events: { click: "", init: "", interactiveChange: "" }
            };

            // Map Properties
            if (obj.props.width) newWidget.props.width = obj.props.width;
            if (obj.props.height) newWidget.props.height = obj.props.height;
            if (obj.props.caption) newWidget.props.text = obj.props.caption;
            if (obj.props.value) newWidget.props.text = obj.props.value; // Value overrides caption for some
            if (obj.props.controlsource) newWidget.props.text = obj.props.controlsource; // Bindings shown as text
            if (obj.props.backcolor) newWidget.props.bg = `rgb(${obj.props.backcolor & 255}, ${(obj.props.backcolor >> 8) & 255}, ${(obj.props.backcolor >> 16) & 255})`;
            if (obj.props.forecolor) newWidget.props.color = `rgb(${obj.props.forecolor & 255}, ${(obj.props.forecolor >> 8) & 255}, ${(obj.props.forecolor >> 16) & 255})`;
            if (obj.props.visible !== undefined) newWidget.props.visible = obj.props.visible;
            if (obj.props.enabled !== undefined) newWidget.props.enabled = obj.props.enabled;

            // Map Methods
            newWidget.events = { ...newWidget.events, ...obj.methods };

            newWidgets.push(newWidget);
        }
    });

    setCanvasSize(formProps);
    setWidgets(newWidgets);
    if (setFormEvents) setFormEvents(formMethods);
    setSelectedId(null);
    alert(`Načteno ${newWidgets.length} prvků z SCCTEXT formátu.`);
};
