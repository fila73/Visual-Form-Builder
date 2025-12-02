import { componentRegistry } from '../../data/componentRegistry.js';
import { generateId, capitalize, vfpColorToRgb } from './parserCore.js';

/**
 * Parses Visual FoxPro 9 objects and converts them to widgets.
 * @param {object[]} objects - The parsed raw objects
 * @param {object} formMethods - The form methods
 * @returns {object} { newWidgets, finalFormEvents, formProps }
 */
export const parseVFP9 = (objects, formMethods) => {
    const newWidgets = [];
    const finalFormEvents = {};
    const formProps = { width: 800, height: 600, caption: 'VFP9 Form' };
    const extendedProps = {
        minButton: true,
        maxButton: true,
        closable: true,
        movable: true
    };

    // Map Form Methods
    Object.keys(formMethods).forEach(evt => {
        finalFormEvents[`Form1_${capitalize(evt)}`] = formMethods[evt];
    });

    const objectsMap = {};
    const nameToIdMap = {};

    // First pass: Index objects
    objects.forEach(obj => {
        if (obj.objName) {
            objectsMap[obj.objName] = obj;
            nameToIdMap[obj.objName] = obj.id;
        }

        // Extract Form Properties
        if (obj.baseClass === 'form') {
            if (obj.props.width) formProps.width = obj.props.width;
            if (obj.props.height) formProps.height = obj.props.height;
            if (obj.props.caption) formProps.caption = obj.props.caption;

            if (obj.props.minbutton !== undefined) extendedProps.minButton = obj.props.minbutton;
            if (obj.props.maxbutton !== undefined) extendedProps.maxButton = obj.props.maxbutton;
            if (obj.props.closable !== undefined) extendedProps.closable = obj.props.closable;
            if (obj.props.movable !== undefined) extendedProps.movable = obj.props.movable;
            if (obj.props.controlbox !== undefined) extendedProps.movable = obj.props.controlbox; // controlbox interpretujeme jako movable

            if (obj.props.left !== undefined) extendedProps.x = obj.props.left;
            if (obj.props.top !== undefined) extendedProps.y = obj.props.top;
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
        'container': 'container',
        'pageframe': 'pageframe',
        'page': 'page'
    };

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

    return { newWidgets, finalFormEvents, formProps: { ...formProps, ...extendedProps } };
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
