import { parseCommonObjects } from './parsers/parserCore.js';
import { parseFox26DOS } from './parsers/fox26Parser.js';
import { parseVFP9 } from './parsers/vfp9Parser.js';

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
 * @param {Function} setFormProps - State setter for form properties
 */
export const parseSCAContent = (text, setCanvasSize, setWidgets, setSelectedId, setFormEvents, setFormName, setFormProps) => {
    const lines = text.split('\n');
    const objects = parseCommonObjects(lines);

    // Detect Version/Type
    // If we find 'PLATFORM = DOS', it's FoxPro 2.6 DOS.
    // If we find 'BASECLASS = form', it's likely VFP.

    let isDOS = objects.some(o => o.platform === 'dos');
    // Fallback detection: if many objects have 'row'/'col' props and no 'baseClass'
    if (!isDOS) {
        const rowColCount = objects.filter(o => o.props && (o.props.row !== undefined || o.props.col !== undefined)).length;
        if (rowColCount > objects.length / 2) isDOS = true;
    }

    let result;
    let formMethods = {};

    // Extract form methods from the main form object if available
    const formObj = objects.find(o => o.baseClass === 'form' || o.objName === 'screen'); // 'screen' is common in FPD2.6
    if (formObj && formObj.methods) {
        formMethods = formObj.methods;
    }

    if (isDOS) {
        console.log("Detected FoxPro 2.6 DOS format");
        result = parseFox26DOS(objects, formMethods);
    } else {
        console.log("Detected Visual FoxPro 9 format");
        result = parseVFP9(objects, formMethods);
    }

    const { newWidgets, finalFormEvents, formProps } = result;

    setCanvasSize({ width: formProps.width, height: formProps.height });
    if (setFormProps) setFormProps(formProps);
    setWidgets(newWidgets);
    if (setFormEvents) setFormEvents(finalFormEvents);
    if (setFormName && formProps.caption) setFormName(formProps.caption.replace(/\s+/g, '_'));

    setSelectedId(null);
    console.log(`Načteno ${newWidgets.length} prvků.`);
};
