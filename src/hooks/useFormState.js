import { useState } from 'react';
import { reparentElements } from '../utils/elementUtils';
import { useHistory } from './useHistory';

export const useFormState = () => {
    // Use history for formElements
    const {
        state: formElements,
        setState: setFormElements,
        undo,
        redo,
        canUndo,
        canRedo,
        reset: resetFormElements
    } = useHistory([]);

    const [selectedIds, setSelectedIds] = useState([]);
    const [formName, setFormName] = useState('Form1');
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
    const [customMethods, setCustomMethods] = useState([]);
    const [formEvents, setFormEvents] = useState({});
    const [formProps, setFormProps] = useState({
        caption: 'Form1',
        minButton: true,
        maxButton: true,
        closable: true,
        movable: true,
        x: '',
        y: ''
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

    const handleAlign = (type) => {
        if (selectedIds.length < 2) return;

        setFormElements(prev => {
            const selected = prev.filter(el => selectedIds.includes(el.id));
            if (selected.length < 2) return prev;

            let targetVal;
            if (type === 'left') targetVal = Math.min(...selected.map(el => el.x));
            else if (type === 'right') targetVal = Math.max(...selected.map(el => el.x + el.props.width));
            else if (type === 'top') targetVal = Math.min(...selected.map(el => el.y));
            else if (type === 'bottom') targetVal = Math.max(...selected.map(el => el.y + el.props.height));
            else if (type === 'center') {
                const minX = Math.min(...selected.map(el => el.x));
                const maxX = Math.max(...selected.map(el => el.x + el.props.width));
                targetVal = minX + (maxX - minX) / 2;
            } else if (type === 'middle') {
                const minY = Math.min(...selected.map(el => el.y));
                const maxY = Math.max(...selected.map(el => el.y + el.props.height));
                targetVal = minY + (maxY - minY) / 2;
            }

            return prev.map(el => {
                if (!selectedIds.includes(el.id)) return el;
                if (type === 'left') return { ...el, x: targetVal };
                if (type === 'top') return { ...el, y: targetVal };
                if (type === 'right') return { ...el, x: targetVal - el.props.width };
                if (type === 'bottom') return { ...el, y: targetVal - el.props.height };
                if (type === 'center') return { ...el, x: targetVal - el.props.width / 2 };
                if (type === 'middle') return { ...el, y: targetVal - el.props.height / 2 };
                return el;
            });
        });
    };

    const handleZOrder = (type) => {
        if (selectedIds.length === 0) return;

        setFormElements(prev => {
            const selected = prev.filter(el => selectedIds.includes(el.id));
            const others = prev.filter(el => !selectedIds.includes(el.id));

            if (type === 'front') return [...others, ...selected];
            if (type === 'back') return [...selected, ...others];
            return prev;
        });
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
        updateFormProp,
        handleAlign,
        handleZOrder,
        undo,
        redo,
        canUndo,
        canRedo,
        resetFormElements
    };
};
