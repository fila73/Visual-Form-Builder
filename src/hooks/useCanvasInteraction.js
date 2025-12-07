import { useState, useEffect, useRef } from 'react';
import { componentRegistry } from '../data/componentRegistry';
import { reparentElements } from '../utils/elementUtils';

export const useCanvasInteraction = ({
    formElements, setFormElements,
    selectedIds, setSelectedIds,
    activeTool, setActiveTool,
    isToolLocked,
    gridSize, showGrid
}) => {
    const [selectionBox, setSelectionBox] = useState(null);
    const [drawingRect, setDrawingRect] = useState(null);
    const [resizing, setResizing] = useState(false);
    const [resizeHandle, setResizeHandle] = useState(null);
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
    const [initialStates, setInitialStates] = useState({});
    const [dragReference, setDragReference] = useState(null);

    const canvasRef = useRef(null);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (activeTool && drawingRect) {
                setDrawingRect(prev => ({ ...prev, currentX: e.clientX, currentY: e.clientY }));
                return;
            }

            if (selectionBox) {
                setSelectionBox(prev => ({ ...prev, currentX: e.clientX, currentY: e.clientY }));
                return;
            }

            if (!resizing) return;

            const dx = e.clientX - resizeStart.x;
            const dy = e.clientY - resizeStart.y;
            const snap = (val) => showGrid ? Math.round(val / gridSize) * gridSize : val;

            let moveDx = dx;
            let moveDy = dy;

            if (!resizeHandle && showGrid && dragReference) {
                const refId = initialStates[dragReference] ? dragReference : Object.keys(initialStates)[0];

                if (refId && initialStates[refId]) {
                    const refInit = initialStates[refId];
                    const targetX = snap(refInit.x + dx);
                    const targetY = snap(refInit.y + dy);
                    moveDx = targetX - refInit.x;
                    moveDy = targetY - refInit.y;
                }
            }

            setFormElements(els => els.map(el => {
                if (!initialStates[el.id]) return el;

                const init = initialStates[el.id];
                let newX = init.x;
                let newY = init.y;
                let newW = init.w;
                let newH = init.h;

                if (resizeHandle) {
                    if (resizeHandle.includes('e')) newW = snap(init.w + dx);
                    if (resizeHandle.includes('w')) {
                        const snappedDx = snap(dx);
                        newX = init.x + snappedDx;
                        newW = init.w - snappedDx;
                    }
                    if (resizeHandle.includes('s')) newH = snap(init.h + dy);
                    if (resizeHandle.includes('n')) {
                        const snappedDy = snap(dy);
                        newY = init.y + snappedDy;
                        newH = init.h - snappedDy;
                    }
                    if (newW < gridSize) newW = gridSize;
                    if (newH < gridSize) newH = gridSize;
                } else {
                    newX = init.x + moveDx;
                    newY = init.y + moveDy;
                }

                return { ...el, x: newX, y: newY, props: { ...el.props, width: newW, height: newH } };
            }));
        };

        const handleMouseUp = (e) => {
            if (activeTool && drawingRect) {
                if (canvasRef.current) {
                    const rect = canvasRef.current.getBoundingClientRect();
                    const startX = drawingRect.startX - rect.left;
                    const startY = drawingRect.startY - rect.top;
                    const currentX = drawingRect.currentX - rect.left;
                    const currentY = drawingRect.currentY - rect.top;

                    const x = Math.min(startX, currentX);
                    const y = Math.min(startY, currentY);
                    const width = Math.abs(currentX - startX);
                    const height = Math.abs(currentY - startY);

                    // Decide if this is a drag-create or click-create
                    const isDrag = width > 5 && height > 5;

                    const component = componentRegistry.find(c => c.type === activeTool);
                    if (component) {
                        // Generate Unique Name
                        const getUniqueName = (type, elements) => {
                            const baseNameMap = {
                                'label': 'Label',
                                'textbox': 'Text',
                                'editbox': 'Edit',
                                'button': 'Command',
                                'checkbox': 'Check',
                                'radio': 'Option',
                                'spinner': 'Spinner',
                                'combobox': 'Combo',
                                'grid': 'Grid',
                                'shape': 'Shape',
                                'image': 'Image',
                                'container': 'Container',
                                'pageframe': 'PageFrame',
                                'page': 'Page'
                            };
                            const base = baseNameMap[type] || 'Object';
                            let counter = 1;
                            while (true) {
                                const name = `${base}${counter}`;
                                const exists = elements.some(el => (el.props.name || el.name) === name);
                                if (!exists) return name;
                                counter++;
                            }
                        };

                        const uniqueName = getUniqueName(component.type, formElements);
                        const defaultProps = { ...component.defaultProps };

                        // Set text/label/caption to uniqueName for specific types
                        if (['label', 'button', 'checkbox', 'radio'].includes(component.type)) {
                            if (component.type === 'label' || component.type === 'button') defaultProps.text = uniqueName;
                            if (component.type === 'checkbox' || component.type === 'radio') defaultProps.label = uniqueName;
                        }
                        if (component.type === 'page') defaultProps.caption = uniqueName;

                        // Calculate dynamic width if creating via click (default size)
                        let finalWidth = isDrag ? width : (defaultProps.width || 100);
                        let finalHeight = isDrag ? height : (defaultProps.height || 20);

                        if (!isDrag && ['label', 'button', 'checkbox', 'radio'].includes(component.type)) {
                            const textLen = uniqueName.length;
                            // Approximate width calculations
                            if (component.type === 'label') finalWidth = Math.max(20, textLen * 8);
                            else if (component.type === 'button') finalWidth = Math.max(40, textLen * 8 + 16);
                            else if (component.type === 'checkbox') finalWidth = Math.max(20, textLen * 8 + 24);
                            else if (component.type === 'radio') finalWidth = Math.max(20, textLen * 8 + 24);
                        }

                        const newWidget = {
                            id: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                            type: component.type,
                            props: { ...defaultProps, width: finalWidth, height: finalHeight, name: uniqueName },
                            x: Math.round(x / gridSize) * gridSize,
                            y: Math.round(y / gridSize) * gridSize
                        };

                        // Check for nesting on creation
                        const getAbsoluteBounds = (elements) => {
                            const bounds = {};
                            const compute = (elId, xOffset, yOffset) => {
                                const el = elements.find(e => e.id === elId);
                                if (!el) return;
                                const absX = xOffset + el.x;
                                const absY = yOffset + el.y;
                                bounds[el.id] = { x: absX, y: absY, w: el.props.width, h: el.props.height, el };
                                elements.filter(c => c.parentId === el.id).forEach(child => compute(child.id, absX, absY));
                            };
                            elements.filter(e => !e.parentId).forEach(root => compute(root.id, 0, 0));
                            return bounds;
                        };

                        const absBounds = getAbsoluteBounds(formElements);
                        // For click-create, use the click coordinate (x,y) and finalWidth/Height
                        const widgetRect = { x: newWidget.x, y: newWidget.y, w: finalWidth, h: finalHeight };

                        const contains = (container, rect) => {
                            const cRight = container.x + (container.props.width || 0);
                            const cBottom = container.y + (container.props.height || 0);
                            const wRight = rect.x + rect.w;
                            const wBottom = rect.y + rect.h;
                            return (
                                rect.x >= container.x &&
                                rect.y >= container.y &&
                                wRight <= cRight &&
                                wBottom <= cBottom
                            );
                        };

                        let bestParent = null;
                        Object.values(absBounds).forEach(bound => {
                            if (bound.el.type === 'container' || bound.el.type === 'page' || bound.el.type === 'shape') {
                                // Allow dropping into container, page, or shape (if shape acts as container?)
                                // Usually Shape is not a container in VFB but let's stick to 'container' type mostly.
                                if (bound.el.type === 'container' || bound.el.type === 'page') {
                                    if (contains({ x: bound.x, y: bound.y, props: { width: bound.w, height: bound.h } }, widgetRect)) {
                                        if (!bestParent || (bound.w * bound.h < bestParent.w * bestParent.h)) {
                                            bestParent = bound;
                                        }
                                    }
                                }
                            }
                        });

                        if (bestParent) {
                            newWidget.parentId = bestParent.el.id;
                            newWidget.x = widgetRect.x - bestParent.x;
                            newWidget.y = widgetRect.y - bestParent.y;
                        }

                        setFormElements(prev => [...prev, newWidget]);
                        setSelectedIds([newWidget.id]);

                        // If radio group requested (virtual logic):
                        // "RadioButtonGroup je skupina..." -> If user adds Radio, we did single. 
                        // If we wanted to support 'Auto create group', we could do it here, but sticking to single per registry.
                    }
                }
                setDrawingRect(null);
                if (!isToolLocked) {
                    setActiveTool(null);
                }
                return;
            }

            if (selectionBox) {
                if (canvasRef.current) {
                    const rect = canvasRef.current.getBoundingClientRect();
                    const sbLeft = Math.min(selectionBox.startX, selectionBox.currentX) - rect.left;
                    const sbTop = Math.min(selectionBox.startY, selectionBox.currentY) - rect.top;
                    const sbWidth = Math.abs(selectionBox.currentX - selectionBox.startX);
                    const sbHeight = Math.abs(selectionBox.currentY - selectionBox.startY);
                    const sbRight = sbLeft + sbWidth;
                    const sbBottom = sbTop + sbHeight;

                    if (sbWidth > 5 || sbHeight > 5) {
                        const getAbsoluteBounds = (elements) => {
                            const bounds = {};
                            const compute = (elId, xOffset, yOffset) => {
                                const el = elements.find(e => e.id === elId);
                                if (!el) return;
                                const absX = xOffset + el.x;
                                const absY = yOffset + el.y;
                                bounds[el.id] = { x: absX, y: absY, w: el.props.width, h: el.props.height };
                                elements.filter(c => c.parentId === el.id).forEach(child => compute(child.id, absX, absY));
                            };
                            elements.filter(e => !e.parentId).forEach(root => compute(root.id, 0, 0));
                            return bounds;
                        };
                        const absBounds = getAbsoluteBounds(formElements);

                        const newSelected = Object.entries(absBounds).filter(([id, bound]) => {
                            const elRight = bound.x + (bound.w || 100);
                            const elBottom = bound.y + (bound.h || 20);
                            return (
                                bound.x >= sbLeft &&
                                bound.y >= sbTop &&
                                elRight <= sbRight &&
                                elBottom <= sbBottom
                            );
                        }).map(([id]) => id);

                        if (e.ctrlKey) {
                            setSelectedIds(prev => [...new Set([...prev, ...newSelected])]);
                        } else {
                            setSelectedIds(newSelected);
                        }
                    } else {
                        if (!e.ctrlKey) setSelectedIds([]);
                    }
                }
                setSelectionBox(null);
                return;
            }

            if (resizing) {
                setFormElements(prev => reparentElements(prev, selectedIds));
                setResizing(false);
                setResizeHandle(null);
                setInitialStates({});
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizing, resizeStart, initialStates, resizeHandle, gridSize, showGrid, selectionBox, formElements, activeTool, drawingRect, dragReference]);

    const handleWidgetClick = (e, id) => {
        e.stopPropagation();

        let newSelection = [];
        if (e.ctrlKey) {
            newSelection = selectedIds.includes(id)
                ? selectedIds.filter(i => i !== id)
                : [...selectedIds, id];
        } else {
            newSelection = selectedIds.includes(id) ? selectedIds : [id];
        }

        setSelectedIds(newSelection);
        handleInteractionStart(e, id, null, newSelection);
    };

    const handleCanvasMouseDown = (e) => {
        if (activeTool) {
            setDrawingRect({
                startX: e.clientX,
                startY: e.clientY,
                currentX: e.clientX,
                currentY: e.clientY
            });
            return;
        }

        if (!e.ctrlKey) {
            setSelectedIds([]);
        }

        setSelectionBox({
            startX: e.clientX,
            startY: e.clientY,
            currentX: e.clientX,
            currentY: e.clientY
        });
    };

    const handleCanvasClick = () => {
        // Handled by mouse up logic
    };

    const handleInteractionStart = (e, id, handle, overrideSelection = null) => {
        e.stopPropagation();

        const currentSelection = overrideSelection || selectedIds;
        const targetIds = handle ? [id] : currentSelection;

        const hasAncestorInList = (id, list) => {
            const el = formElements.find(e => e.id === id);
            if (!el || !el.parentId) return false;
            if (list.includes(el.parentId)) return true;
            return hasAncestorInList(el.parentId, list);
        };

        const effectiveTargetIds = targetIds.filter(id => !hasAncestorInList(id, targetIds));

        const states = {};
        effectiveTargetIds.forEach(tid => {
            const w = formElements.find(el => el.id === tid);
            if (w) {
                states[tid] = {
                    x: w.x,
                    y: w.y,
                    w: w.props.width || 100,
                    h: w.props.height || 20
                };
            }
        });

        setResizing(true);
        setResizeHandle(handle);
        setResizeStart({ x: e.clientX, y: e.clientY });
        setInitialStates(states);
        setDragReference(id);
    };

    const handleMove = (key, step, isResize, isAlign) => {
        if (isAlign && selectedIds.length > 1) {
            const selectedElements = formElements.filter(el => selectedIds.includes(el.id));
            let targetValue;

            if (key === 'ArrowLeft') {
                targetValue = Math.min(...selectedElements.map(el => el.x));
                setFormElements(prev => prev.map(el => selectedIds.includes(el.id) ? { ...el, x: targetValue } : el));
            } else if (key === 'ArrowRight') {
                const maxRight = Math.max(...selectedElements.map(el => el.x + (el.props.width || 0)));
                setFormElements(prev => prev.map(el => selectedIds.includes(el.id) ? { ...el, x: maxRight - (el.props.width || 0) } : el));
            } else if (key === 'ArrowUp') {
                targetValue = Math.min(...selectedElements.map(el => el.y));
                setFormElements(prev => prev.map(el => selectedIds.includes(el.id) ? { ...el, y: targetValue } : el));
            } else if (key === 'ArrowDown') {
                const maxBottom = Math.max(...selectedElements.map(el => el.y + (el.props.height || 0)));
                setFormElements(prev => prev.map(el => selectedIds.includes(el.id) ? { ...el, y: maxBottom - (el.props.height || 0) } : el));
            }
            return;
        }

        setFormElements(prev => {
            return prev.map(el => {
                if (selectedIds.includes(el.id)) {
                    let { x, y, props } = el;
                    let { width, height } = props;

                    if (isResize) {
                        if (key === 'ArrowRight') width += step;
                        if (key === 'ArrowLeft') width -= step;
                        if (key === 'ArrowDown') height += step;
                        if (key === 'ArrowUp') height -= step;
                    } else {
                        if (key === 'ArrowRight') x += step;
                        if (key === 'ArrowLeft') x -= step;
                        if (key === 'ArrowDown') y += step;
                        if (key === 'ArrowUp') y -= step;
                    }

                    return { ...el, x, y, props: { ...props, width, height } };
                }
                return el;
            });
        });
    };

    return {
        selectionBox,
        drawingRect,
        canvasRef,
        handleWidgetClick,
        handleCanvasMouseDown,
        handleCanvasClick,
        handleInteractionStart,
        handleMove
    };
};
