import { useState } from 'react';
import { reparentElements } from '../utils/elementUtils';

export const useFormState = () => {
    const [formElements, setFormElements] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [formName, setFormName] = useState('Form1');
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
    const [customMethods, setCustomMethods] = useState([]);
    const [formEvents, setFormEvents] = useState({});
    const [formProps, setFormProps] = useState({
        caption: 'Form1',
        minButton: true,
        maxButton: true,
        controlBox: true
    });

    // --- Actions ---

    const updateWidgetProp = (key, value) => {
        setFormElements(prevElements => {
            const updatedElements = prevElements.map(el => {
                if (selectedIds.includes(el.id)) {
                    // Unique Name Check
                    if (key === 'name') {
                        const nameExists = prevElements.some(other => other.id !== el.id && other.props.name === value);
                        if (nameExists) {
                            value = `${value}_${el.id}`;
                        }
                    }

                    const newProps = { ...el.props };
                    newProps[key] = value;
                    return { ...el, props: newProps };
                }
                return el;
            });

            // If position or size changed, check for reparenting
            if (['x', 'y', 'width', 'height'].includes(key)) {
                return reparentElements(updatedElements, selectedIds);
            }

            return updatedElements;
        });
    };

    const updateWidgetStyle = (key, value) => {
        setFormElements(prevElements => {
            return prevElements.map(el => {
                if (selectedIds.includes(el.id)) {
                    const newStyle = { ...el.props.style, [key]: value };
                    return { ...el, props: { ...el.props, style: newStyle } };
                }
                return el;
            });
        });
    };

    const handleDelete = () => {
        setFormElements(prev => prev.filter(el => !selectedIds.includes(el.id)));
        setSelectedIds([]);
    };

    const handleSelectAll = () => {
        setSelectedIds(formElements.map(el => el.id));
    };

    const updateFormProp = (key, value) => {
        setFormProps(prev => ({ ...prev, [key]: value }));
    };

    return {
        formElements,
        setFormElements,
        selectedIds,
        setSelectedIds,
        formName,
        setFormName,
        canvasSize,
        setCanvasSize,
        customMethods,
        setCustomMethods,
        formEvents,
        setFormEvents,
        updateWidgetProp,
        updateWidgetStyle,
        handleDelete,
        handleSelectAll,
        formProps,
        setFormProps,
        updateFormProp
    };
};
