import { componentRegistry } from '../../data/componentRegistry.js';
import { generateId, capitalize, vfpColorToRgb } from './parserCore.js';

// DOS Metrics (approximate)
const ROW_HEIGHT = 18;
const COL_WIDTH = 8;

/**
 * Parses FoxPro 2.6 DOS objects and converts them to widgets.
 * @param {object[]} objects - The parsed raw objects
 * @param {object} formMethods - The form methods
 * @returns {object} { newWidgets, finalFormEvents, formProps }
 */
export const parseFox26DOS = (objects, formMethods) => {
    const newWidgets = [];
    const finalFormEvents = {};
    const formProps = { width: 640, height: 400, caption: 'FoxPro 2.6 DOS Form' }; // Default DOS resolution

    // Map Form Methods
    Object.keys(formMethods).forEach(evt => {
        finalFormEvents[`Form1_${capitalize(evt)}`] = formMethods[evt];
    });

    // Filter for DOS platform or generic objects if platform is missing
    // In FPD2.6, platform is usually 'dos' or 'windows'. We focus on DOS.
    const dosObjects = objects.filter(obj => !obj.platform || obj.platform === 'dos');

    dosObjects.forEach(obj => {
        // FoxPro 2.6 objects don't always have a 'baseClass' like VFP.
        // We often need to infer from properties or context.
        // However, SCCTEXT usually provides *some* type info.

        // Common FPD2.6 types in SCCTEXT:
        // 'say', 'get', 'push', 'radio', 'check', 'list', 'popup'

        let type = obj.baseClass || obj.class || 'unknown';

        // Map to our internal types
        let mappedType = null;

        if (type.includes('say')) mappedType = 'label';
        else if (type.includes('get')) mappedType = 'textbox'; // Default to textbox, refine later
        else if (type.includes('push')) mappedType = 'button';
        else if (type.includes('check')) mappedType = 'checkbox';
        else if (type.includes('radio')) mappedType = 'radio';
        else if (type.includes('list')) mappedType = 'listbox'; // We might need to add listbox to registry or map to combobox
        else if (type.includes('popup')) mappedType = 'combobox';

        // Refine 'get' - could be spinner, etc. based on PICTURE/FUNCTION
        if (mappedType === 'textbox' && obj.props.function && obj.props.function.includes('^')) {
            // '^' usually denotes a popup/list in some contexts, but let's stick to simple mapping first
        }

        if (mappedType) {
            const registryItem = componentRegistry.find(c => c.type === mappedType);
            const defaultProps = registryItem ? registryItem.defaultProps : {};

            // Coordinate Conversion (Rows/Cols -> Pixels)
            // FPD2.6 uses 'row' and 'col' properties usually.
            // Sometimes 'vpos' (vertical) and 'hpos' (horizontal).

            let row = obj.props.row !== undefined ? obj.props.row : (obj.props.vpos || 0);
            let col = obj.props.col !== undefined ? obj.props.col : (obj.props.hpos || 0);

            const x = col * COL_WIDTH;
            const y = row * ROW_HEIGHT;

            // Width/Height might be in chars too
            let w = (obj.props.width || 10) * COL_WIDTH;
            let h = (obj.props.height || 1) * ROW_HEIGHT;

            const newWidget = {
                id: obj.id,
                type: mappedType,
                name: obj.objName || `obj_${obj.id}`,
                parentId: null, // DOS screens are usually flat
                x: x,
                y: y,
                props: { ...defaultProps, width: w, height: h }
            };

            // Map Properties
            if (obj.props.caption) newWidget.props.text = obj.props.caption;
            if (obj.props.value) newWidget.props.text = obj.props.value;
            if (obj.props.name) newWidget.props.name = obj.props.name;

            // Map Events (Snippets)
            // FPD2.6 uses 'valid', 'when', 'error', etc.
            if (obj.methods) {
                if (obj.methods.valid) finalFormEvents[`${newWidget.id}_LostFocus`] = obj.methods.valid; // Valid -> LostFocus
                if (obj.methods.when) finalFormEvents[`${newWidget.id}_GotFocus`] = obj.methods.when;   // When -> GotFocus
                if (obj.methods.clicked) finalFormEvents[`${newWidget.id}_Click`] = obj.methods.clicked;
            }

            newWidgets.push(newWidget);
        }
    });

    return { newWidgets, finalFormEvents, formProps };
};
