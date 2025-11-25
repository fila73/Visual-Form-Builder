import { componentRegistry } from '../data/componentRegistry';

// Helper to find component type by label or other heuristic if needed
// In the legacy code, it imported WIDGET_TYPES. Here we might need to map differently if registry structure changed.
// For now, I'll adapt it to use our componentRegistry structure or just string types if they match.

export const parseSCAContent = (text, setCanvasSize, setWidgets, setSelectedId, setFormEvents, setFormName) => {
    const lines = text.split('\n');
    const newWidgets = [];
    let currentRecord = {};
    let inProperties = false;
    let inMethods = false;
    let methodBuffer = "";

    // Temporary storage for all objects to resolve hierarchy later
    const objects = [];

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

    // Map for quick lookup of objects and their future IDs
    const objectsMap = {};
    const nameToIdMap = {}; // Map objName -> generated ID

    objects.forEach(obj => {
        // Generate unique ID for every object
        obj.id = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        if (obj.objName) {
            objectsMap[obj.objName] = obj;
            nameToIdMap[obj.objName] = obj.id;
        }
    });

    // Helper to get absolute position of a parent container
    const getParentOffset = (parentName) => {
        // Handle dot notation if present
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

    objects.forEach(obj => {
        if (obj.baseClass === 'form') {
            if (obj.props.width) formProps.width = obj.props.width;
            if (obj.props.height) formProps.height = obj.props.height;
            if (obj.objName && setFormName) setFormName(obj.objName);
            if (obj.props.name && setFormName) setFormName(obj.props.name);
            formMethods = obj.methods;
        }
    });

    // Second pass: Create Widgets
    const flatEvents = { ...formMethods };

    // Helper to capitalize event names (load -> Load, click -> Click)
    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

    const prefixedFormEvents = {};
    Object.keys(formMethods).forEach(evt => {
        prefixedFormEvents[`Form1_${capitalize(evt)}`] = formMethods[evt];
    });

    // Reset flatEvents to just the prefixed form events
    const finalFormEvents = { ...prefixedFormEvents };

    objects.forEach(obj => {
        const mappedType = typeMap[obj.baseClass] || typeMap[obj.class];

        if (mappedType && mappedType !== 'form') {
            const parentName = obj.parent;
            const offset = parentName ? getParentOffset(parentName) : { x: 0, y: 0 };

            // Find default props from registry
            const registryItem = componentRegistry.find(c => c.type === mappedType);
            const defaultProps = registryItem ? registryItem.defaultProps : {};

            // Use the unique ID generated in the first pass
            const id = obj.id;

            // Resolve parent ID
            let parentId = null;
            if (obj.parent) {
                const parts = obj.parent.split('.');
                const immediateParentName = parts[parts.length - 1];

                const parentObj = objectsMap[immediateParentName];
                if (parentObj && parentObj.baseClass !== 'form') {
                    parentId = nameToIdMap[immediateParentName];
                }
            }

            // Unique Name Check
            let finalName = obj.objName;
            const nameExists = newWidgets.some(w => w.name === finalName);
            if (nameExists) {
                finalName = `${finalName}_${id}`;
            }

            const newWidget = {
                id,
                type: mappedType,
                name: finalName,
                parentId: parentId, // Store parent ID for dragging
                x: (obj.props.left || 0) + offset.x,
                y: (obj.props.top || 0) + offset.y,
                props: { ...defaultProps },
            };

            // Map Properties
            if (obj.props.width) newWidget.props.width = obj.props.width;
            else if (mappedType === 'textbox') newWidget.props.width = 100; // Default width for TextBox

            if (obj.props.height) newWidget.props.height = obj.props.height;
            else if (mappedType === 'textbox') newWidget.props.height = 23; // Default height for TextBox

            // We need to adapt to the new props structure where style is often used
            // But for now, let's keep it simple and assume the renderer handles it or we map it to style here
            const styleUpdates = {};
            if (obj.props.width) styleUpdates.width = `${obj.props.width}px`;
            if (obj.props.height) styleUpdates.height = `${obj.props.height}px`;
            if (obj.props.backcolor) styleUpdates.backgroundColor = `rgb(${obj.props.backcolor & 255}, ${(obj.props.backcolor >> 8) & 255}, ${(obj.props.backcolor >> 16) & 255})`;
            if (obj.props.forecolor) styleUpdates.color = `rgb(${obj.props.forecolor & 255}, ${(obj.props.forecolor >> 8) & 255}, ${(obj.props.forecolor >> 16) & 255})`;

            newWidget.props.style = { ...newWidget.props.style, ...styleUpdates };


            if (obj.props.caption) newWidget.props.text = obj.props.caption;
            if (obj.props.value) newWidget.props.text = obj.props.value; // Value overrides caption for some
            // if (obj.props.controlsource) newWidget.props.text = obj.props.controlsource; // REMOVED: ControlSource should not overwrite text

            // Map Name if present (from [OBJNAME] or Name prop)
            // Use finalName which has uniqueness check applied
            newWidget.props.name = finalName;

            if (obj.props.visible !== undefined) newWidget.props.visible = obj.props.visible;
            if (obj.props.enabled !== undefined) newWidget.props.enabled = obj.props.enabled;

            // Map Methods to flat events
            if (obj.methods) {
                Object.keys(obj.methods).forEach(evt => {
                    finalFormEvents[`${newWidget.id}_${capitalize(evt)}`] = obj.methods[evt];
                });
            }

            newWidgets.push(newWidget);
        }
    });

    setCanvasSize(formProps);
    setWidgets(newWidgets);
    if (setFormEvents) setFormEvents(finalFormEvents);
    setSelectedId(null);
    alert(`Načteno ${newWidgets.length} prvků z SCCTEXT formátu.`);
};
