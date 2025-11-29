import { componentRegistry } from '../data/componentRegistry.js';
import { generateId, cleanString, vfpColorToRgb, capitalize } from './parserUtils';

/**
 * Parses SCCTEXT (SCA) content and populates the form state.
 * 
 * SCCTEXT is a text-based representation of Visual FoxPro forms.
 * This parser extracts object definitions, properties, and methods.
 * 
 * @param {string} text - The raw SCCTEXT content
 * @param {Function} setCanvasSize - State setter for canvas dimensions
 * @param {Function} setWidgets - State setter for form elements
 * @param {Function} setSelectedId - State setter for selection
 * @param {Function} setFormEvents - State setter for form events
 * @param {Function} setFormName - State setter for form name
 */
export const parseSCAContent = (text, setCanvasSize, setWidgets, setSelectedId, setFormEvents, setFormName) => {
    const lines = text.split('\n');
    const objects = parseObjects(lines);

    // Process Form Properties
    const formProps = { width: 800, height: 600 };
    let formMethods = {};

    objects.forEach(obj => {
        if (obj.baseClass === 'form') {
            if (obj.props.width) formProps.width = obj.props.width;
            if (obj.props.height) formProps.height = obj.props.height;
            if (obj.objName && setFormName) setFormName(obj.objName);
            if (obj.props.name && setFormName) setFormName(obj.props.name);
            formMethods = obj.methods;
        }
    });

    // Process Widgets
    const { newWidgets, finalFormEvents } = createWidgets(objects, formMethods);

    setCanvasSize(formProps);
    setWidgets(newWidgets);
    if (setFormEvents) setFormEvents(finalFormEvents);
    setSelectedId(null);
    alert(`Načteno ${newWidgets.length} prvků z SCCTEXT formátu.`);
};

// --- Helper Functions ---

const parseObjects = (lines) => {
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

const parsePropertyLine = (line, props) => {
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

const parseMethods = (buffer, methods) => {
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

const createWidgets = (objects, formMethods) => {
    const newWidgets = [];
    const objectsMap = {};
    const nameToIdMap = {};

    objects.forEach(obj => {
        if (obj.objName) {
            objectsMap[obj.objName] = obj;
            nameToIdMap[obj.objName] = obj.id;
        }
    });

    const getParentOffset = (parentName) => {
        const parts = parentName.split('.');
        const immediateParentName = parts[parts.length - 1];
        const parentObj = objectsMap[immediateParentName];

        if (!parentObj) return { x: 0, y: 0 };
        if (parentObj.baseClass === 'form') return { x: 0, y: 0 };

        const grandParentOffset = parentObj.parent ? getParentOffset(parentObj.parent) : { x: 0, y: 0 };
        return {
            x: (parentObj.props.left || 0) + grandParentOffset.x,
            y: (parentObj.props.top || 0) + grandParentOffset.y
        };
    };

    const typeMap = {
        'commandbutton': 'button',
        'textbox': 'textbox',
        'editbox': 'editbox',
        'spinner': 'spinner',
        'label': 'label',
        'checkbox': 'checkbox',
        'optionbutton': 'radio',
        'combobox': 'combobox',
        'grid': 'grid',
        'image': 'image',
        'shape': 'shape',
        'form': 'form',
        'container': 'container'
    };

    const prefixedFormEvents = {};
    Object.keys(formMethods).forEach(evt => {
        prefixedFormEvents[`Form1_${capitalize(evt)}`] = formMethods[evt];
    });
    const finalFormEvents = { ...prefixedFormEvents };

    objects.forEach(obj => {
        const mappedType = typeMap[obj.baseClass] || typeMap[obj.class];

        if (mappedType && mappedType !== 'form') {
            const parentName = obj.parent;
            const offset = parentName ? getParentOffset(parentName) : { x: 0, y: 0 };

            const registryItem = componentRegistry.find(c => c.type === mappedType);
            const defaultProps = registryItem ? registryItem.defaultProps : {};

            let parentId = null;
            if (obj.parent) {
                const parts = obj.parent.split('.');
                const immediateParentName = parts[parts.length - 1];
                const parentObj = objectsMap[immediateParentName];
                if (parentObj && parentObj.baseClass !== 'form') {
                    parentId = nameToIdMap[immediateParentName];
                }
            }

            let finalName = obj.objName;
            const nameExists = newWidgets.some(w => w.name === finalName);
            if (nameExists) {
                finalName = `${finalName}_${obj.id}`;
            }

            const newWidget = {
                id: obj.id,
                type: mappedType,
                name: finalName,
                parentId: parentId,
                x: (obj.props.left || 0) + (parentId ? 0 : offset.x),
                y: (obj.props.top || 0) + (parentId ? 0 : offset.y),
                props: { ...defaultProps },
            };

            // Map Properties
            mapWidgetProperties(newWidget, obj, mappedType);

            // Map Methods
            if (obj.methods) {
                Object.keys(obj.methods).forEach(evt => {
                    finalFormEvents[`${newWidget.id}_${capitalize(evt)}`] = obj.methods[evt];
                });
            }

            newWidgets.push(newWidget);
        }
    });

    return { newWidgets, finalFormEvents };
};

const mapWidgetProperties = (widget, obj, type) => {
    if (obj.props.width) widget.props.width = obj.props.width;
    else if (type === 'textbox') widget.props.width = 100;

    if (obj.props.height) widget.props.height = obj.props.height;
    else if (type === 'textbox') widget.props.height = 23;

    const styleUpdates = {};
    if (obj.props.width) styleUpdates.width = `${obj.props.width}px`;
    if (obj.props.height) styleUpdates.height = `${obj.props.height}px`;

    const bg = vfpColorToRgb(obj.props.backcolor);
    if (bg) styleUpdates.backgroundColor = bg;

    const fg = vfpColorToRgb(obj.props.forecolor);
    if (fg) styleUpdates.color = fg;

    widget.props.style = { ...widget.props.style, ...styleUpdates };

    if (obj.props.caption) widget.props.text = obj.props.caption;
    if (obj.props.value) widget.props.text = obj.props.value;

    widget.props.name = widget.name; // Sync name prop

    if (obj.props.visible !== undefined) widget.props.visible = obj.props.visible;
    if (obj.props.enabled !== undefined) widget.props.enabled = obj.props.enabled;
};
