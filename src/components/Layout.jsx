import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './Sidebar';
import Toolbar from './Toolbar';
import { componentRegistry } from '../data/componentRegistry';
import Canvas from './Canvas';
import FormElement from './FormElement';
import PropInput from './PropInput';
import CodeEditorModal from './modals/CodeEditorModal';
import AddMethodModal from './modals/AddMethodModal';
import { Monitor, FolderOpen, Save, Code, Settings, Grid as GridIcon, Zap, Plus, Trash2, Edit, FilePlus } from 'lucide-react';
import { parseSCAContent } from '../utils/scaParser';
import { parseSPRContent } from '../utils/sprParser';
import { decodeText } from '../utils/charsetUtils';
import { exportToPython } from '../utils/pythonExporter';
import { save, ask } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

const Layout = () => {
    const [formElements, setFormElements] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectionBox, setSelectionBox] = useState(null); // { startX, startY, currentX, currentY }
    const [activeTool, setActiveTool] = useState(null); // 'Button', 'Label', etc.
    const [isToolLocked, setIsToolLocked] = useState(false);
    const [drawingRect, setDrawingRect] = useState(null); // { startX, startY, currentX, currentY }
    const [scaCharset, setScaCharset] = useState('windows-1250');
    const [sprCharset, setSprCharset] = useState('cp895');

    // --- CLIPBOARD OPERATIONS ---
    const copyToClipboard = async () => {
        if (selectedIds.length === 0) return;
        const selectedElements = formElements.filter(el => selectedIds.includes(el.id));

        // Collect events for selected elements
        const eventsToCopy = {};
        selectedElements.forEach(el => {
            Object.keys(formEvents).forEach(key => {
                if (key.startsWith(`${el.id}_`)) {
                    eventsToCopy[key] = formEvents[key];
                }
            });
        });

        const payload = {
            widgets: selectedElements,
            events: eventsToCopy
        };

        const json = JSON.stringify(payload, null, 2);
        try {
            await navigator.clipboard.writeText(json);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const cutToClipboard = async () => {
        await copyToClipboard();
        setFormElements(prev => prev.filter(el => !selectedIds.includes(el.id)));
        setSelectedIds([]);
    };

    const pasteFromClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText();
            let clipboardData;
            try {
                clipboardData = JSON.parse(text);
            } catch (e) { return; }

            let widgets = [];
            let events = {};

            // Handle both old format (array of widgets) and new format (object)
            if (Array.isArray(clipboardData)) {
                widgets = clipboardData;
            } else if (clipboardData.widgets && Array.isArray(clipboardData.widgets)) {
                widgets = clipboardData.widgets;
                events = clipboardData.events || {};
            } else {
                return;
            }

            // Generate Unique Name Helper (reused)
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
                    'container': 'Container'
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

            const newWidgets = [];
            const newIds = [];

            // Check for position collisions
            const offset = { x: 0, y: 0 };
            const firstWidget = widgets[0];
            if (firstWidget) {
                const existsAtPos = formElements.some(el =>
                    Math.abs(el.x - firstWidget.x) < 5 && Math.abs(el.y - firstWidget.y) < 5
                );
                if (existsAtPos) {
                    offset.x = 10;
                    offset.y = 10;
                }
            }

            // Process widgets
            // We need to process them sequentially to ensure unique names are generated correctly against the growing list
            let currentElements = [...formElements];

            widgets.forEach(w => {
                const newId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const uniqueName = getUniqueName(w.type, currentElements);

                const newWidget = {
                    ...w,
                    id: newId,
                    x: w.x + offset.x,
                    y: w.y + offset.y,
                    props: { ...w.props, name: uniqueName }
                };

                newWidgets.push(newWidget);
                newIds.push(newId);
                currentElements.push(newWidget);
            });

            // Fix parentIds for pasted group
            const idMap = {};
            widgets.forEach((w, i) => {
                idMap[w.id] = newWidgets[i].id;
            });

            newWidgets.forEach(w => {
                if (w.parentId && idMap[w.parentId]) {
                    w.parentId = idMap[w.parentId];
                }
            });

            // Process Events
            const newEvents = {};
            Object.entries(events).forEach(([key, code]) => {
                // Key is OldID_EventName
                // Find OldID in idMap
                const parts = key.split('_');
                // ID can contain underscores, so we need to match against known old IDs
                // The old IDs are keys in idMap
                const oldId = Object.keys(idMap).find(oid => key.startsWith(oid + '_'));

                if (oldId) {
                    const eventName = key.substring(oldId.length + 1);
                    const newId = idMap[oldId];
                    newEvents[`${newId}_${eventName}`] = code;
                }
            });

            setFormElements(prev => [...prev, ...newWidgets]);
            setFormEvents(prev => ({ ...prev, ...newEvents }));
            setSelectedIds(newIds);

        } catch (err) {
            console.error('Failed to paste:', err);
        }
    };


    // Resizing & Moving State
    const [resizing, setResizing] = useState(false);
    const [resizeHandle, setResizeHandle] = useState(null); // null = move, string = resize handle
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
    const [initialStates, setInitialStates] = useState({}); // Map of id -> {x, y, w, h}
    const [dragReference, setDragReference] = useState(null); // ID of the element used for snapping

    // Project State
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
    const [formName, setFormName] = useState('Form1');
    const [customMethods, setCustomMethods] = useState([]);
    const [formEvents, setFormEvents] = useState({});

    // Grid State
    const [gridSize, setGridSize] = useState(10);
    const [showGrid, setShowGrid] = useState(true);
    const [showSettings, setShowSettings] = useState(false);

    // Modals State
    const [activeModal, setActiveModal] = useState(null); // 'code', 'addMethod'
    const [editingCode, setEditingCode] = useState(null); // { type: 'event'|'method', id: string, name: string }



    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const fileInputScaRef = useRef(null);
    const fileInputSprRef = useRef(null);

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

            // Calculate consistent delta for movement
            let moveDx = dx;
            let moveDy = dy;

            if (!resizeHandle && showGrid && dragReference) {
                // Find reference element state
                // If dragReference is not in initialStates (e.g. it's a child of a moved container), use the first available mover
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
                    // Use the consistent delta
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

                    if (width > 5 && height > 5) {
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
                                    'container': 'Container'
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

                            const newWidget = {
                                id: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                                type: component.type,
                                props: { ...component.defaultProps, width, height, name: uniqueName },
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
                            const widgetRect = { x: newWidget.x, y: newWidget.y, w: width, h: height };

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
                                if (bound.el.type === 'container') {
                                    if (contains({ x: bound.x, y: bound.y, props: { width: bound.w, height: bound.h } }, widgetRect)) {
                                        if (!bestParent || (bound.w * bound.h < bestParent.w * bestParent.h)) {
                                            bestParent = bound;
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
                        }
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

    // --- SELECTION, MOVING & RESIZING ---
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
        // Start moving immediately on click
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

        // Start selection box if not Ctrl key (Ctrl key might be for adding to selection, but drag-select usually clears first unless shift/ctrl)
        // User asked for "click empty space... clears".
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
        // Handled by mouse up logic (small drag = click)
    };

    const handleInteractionStart = (e, id, handle, overrideSelection = null) => {
        e.stopPropagation();

        const currentSelection = overrideSelection || selectedIds;
        const targetIds = handle ? [id] : currentSelection;

        // Helper to check if an element has an ancestor in the list
        const hasAncestorInList = (id, list) => {
            const el = formElements.find(e => e.id === id);
            if (!el || !el.parentId) return false;
            if (list.includes(el.parentId)) return true;
            return hasAncestorInList(el.parentId, list);
        };

        // Filter out elements whose parents are also being moved
        // This prevents double-movement (moving parent + moving child relative to parent)
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
        setDragReference(id); // Set the clicked element as reference
    };






    // --- REPARENTING LOGIC ---
    const reparentElements = (elements, modifiedIds) => {
        // Helper to get absolute bounds
        const getAbsoluteBounds = (els) => {
            const bounds = {};
            const compute = (elId, xOffset, yOffset) => {
                const el = els.find(e => e.id === elId);
                if (!el) return;
                const absX = xOffset + el.x;
                const absY = yOffset + el.y;
                bounds[el.id] = { x: absX, y: absY, w: el.props.width, h: el.props.height, el };
                els.filter(c => c.parentId === el.id).forEach(child => compute(child.id, absX, absY));
            };
            els.filter(e => !e.parentId).forEach(root => compute(root.id, 0, 0));
            return bounds;
        };

        const absBounds = getAbsoluteBounds(elements);
        let newElements = [...elements];
        let changed = false;

        // Only process modified elements that are "roots" of the modification (not children of other modified elements)
        // For property updates, modifiedIds usually contains just one ID.
        // For drag/resize, it might be multiple.

        const topLevelModified = modifiedIds.filter(id => {
            const el = elements.find(e => e.id === id);
            if (!el || !el.parentId) return true;
            let parent = elements.find(p => p.id === el.parentId);
            while (parent) {
                if (modifiedIds.includes(parent.id)) return false;
                parent = elements.find(p => p.id === parent.parentId);
            }
            return true;
        });

        topLevelModified.forEach(id => {
            const bound = absBounds[id];
            if (!bound) return;

            const widgetRect = { x: bound.x, y: bound.y, w: bound.w, h: bound.h };
            let bestParent = null;

            // Helper to check containment
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

            Object.values(absBounds).forEach(targetBound => {
                if (targetBound.el.type === 'container' && targetBound.el.id !== id) {
                    // Check if target is descendant of current widget
                    let isChild = false;
                    let p = targetBound.el;
                    while (p.parentId) {
                        if (p.parentId === id) { isChild = true; break; }
                        p = elements.find(e => e.id === p.parentId);
                        if (!p) break;
                    }
                    if (isChild) return;

                    if (contains({ x: targetBound.x, y: targetBound.y, props: { width: targetBound.w, height: targetBound.h } }, widgetRect)) {
                        if (!bestParent || (targetBound.w * targetBound.h < bestParent.w * bestParent.h)) {
                            bestParent = targetBound;
                        }
                    }
                }
            });

            const elIndex = newElements.findIndex(e => e.id === id);
            if (elIndex === -1) return;
            const el = newElements[elIndex];

            if (bestParent) {
                if (el.parentId !== bestParent.el.id) {
                    newElements[elIndex] = {
                        ...el,
                        parentId: bestParent.el.id,
                        x: widgetRect.x - bestParent.x,
                        y: widgetRect.y - bestParent.y
                    };
                    changed = true;
                }
            } else {
                if (el.parentId) {
                    newElements[elIndex] = {
                        ...el,
                        parentId: null,
                        x: widgetRect.x,
                        y: widgetRect.y
                    };
                    changed = true;
                }
            }
        });

        return changed ? newElements : elements;
    };

    // --- PROPERTIES ---
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

    // Helper to determine common properties for selection
    const getSelectedElementData = () => {
        const selectedWidgets = formElements.filter(el => selectedIds.includes(el.id));
        if (selectedWidgets.length === 0) return null;

        const first = selectedWidgets[0];
        const isMulti = selectedWidgets.length > 1;

        // For single selection, return the element as is
        if (!isMulti) return first;

        // For multi selection, calculate common values
        const commonProps = { ...first.props };
        let commonX = first.x;
        let commonY = first.y;
        let commonType = first.type;

        selectedWidgets.slice(1).forEach(w => {
            if (w.x !== commonX) commonX = '***';
            if (w.y !== commonY) commonY = '***';
            if (w.type !== commonType) commonType = 'Multi-Select';

            Object.keys(commonProps).forEach(k => {
                if (commonProps[k] !== w.props[k]) commonProps[k] = '***';
            });
        });

        return {
            id: `Selected (${selectedWidgets.length})`,
            type: commonType,
            x: commonX,
            y: commonY,
            props: commonProps,
            isMulti: true
        };
    };

    const selectedElement = getSelectedElementData();

    // --- EVENTS & METHODS ---
    const handleEditEvent = (eventName) => {
        const elementId = selectedIds.length > 0 ? selectedIds[0] : 'Form1';
        const eventKey = `${elementId}_${eventName}`;

        setEditingCode({ type: 'event', id: elementId, name: eventName, key: eventKey });
        setActiveModal('code');
    };

    const handleSaveCode = (code) => {
        if (editingCode.type === 'event') {
            setFormEvents({ ...formEvents, [editingCode.key]: code });
        } else if (editingCode.type === 'method') {
            setCustomMethods(methods => methods.map(m => m.name === editingCode.name ? { ...m, code } : m));
        }
        setActiveModal(null);
        setEditingCode(null);
    };

    const handleAddMethod = (name, args) => {
        setCustomMethods([...customMethods, { name, args, code: "" }]);
    };

    const handleEditMethod = (method) => {
        setEditingCode({ type: 'method', name: method.name, args: method.args });
        setActiveModal('code');
    };

    const handleDeleteMethod = (name) => {
        if (confirm(`Opravdu smazat metodu ${name}?`)) {
            setCustomMethods(methods => methods.filter(m => m.name !== name));
        }
    };

    // --- IMPORT / EXPORT HANDLERS ---
    const handleLoadProject = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.widgets && data.canvasSize) {
                    setFormElements(data.widgets);
                    setCanvasSize(data.canvasSize);
                    setCustomMethods(data.customMethods || []);

                    // Restore Form Events: Map Names back to IDs
                    const restoredEvents = {};
                    const events = data.formEvents || {};

                    Object.entries(events).forEach(([key, code]) => {
                        // Check if key is already an ID (backward compatibility)
                        if (key.startsWith('obj_') || key.startsWith('Form1_')) {
                            restoredEvents[key] = code;
                            return;
                        }

                        // Try to parse Name_Event
                        const parts = key.split('_');
                        if (parts.length >= 2) {
                            const eventName = parts.pop(); // Last part is event
                            const widgetName = parts.join('_'); // Rest is name (can contain underscores)

                            if (widgetName === 'Form1') {
                                restoredEvents[`Form1_${eventName}`] = code;
                            } else {
                                const widget = data.widgets.find(w => (w.props.name || w.name) === widgetName);
                                if (widget) {
                                    restoredEvents[`${widget.id}_${eventName}`] = code;
                                } else {
                                    // Widget not found, maybe keep it or discard?
                                    // Let's keep it with original key just in case
                                    // restoredEvents[key] = code; 
                                    // Actually, if we can't map it, it's useless internally. Discard.
                                }
                            }
                        }
                    });

                    setFormEvents(restoredEvents);
                    if (data.formName) setFormName(data.formName);
                    setSelectedIds([]);
                }
            } catch (err) { alert("Chyba JSON."); }
        };
        reader.readAsText(file); e.target.value = '';
    };

    const handleImportSCA = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = decodeText(event.target.result, scaCharset);
            parseSCAContent(text, setCanvasSize, setFormElements, (id) => setSelectedIds(id ? [id] : []), setFormEvents, setFormName);
        };
        reader.readAsArrayBuffer(file); e.target.value = '';
    };

    const handleImportSPR = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = decodeText(event.target.result, sprCharset);
            parseSPRContent(text, setCanvasSize, setFormElements, (id) => setSelectedIds(id ? [id] : []), setFormEvents, setFormName);
        };
        reader.readAsArrayBuffer(file); e.target.value = '';
    };

    const handleExportToPython = async () => {
        try {
            console.log("Opening save dialog for Python export...");
            const path = await save({
                defaultPath: `${formName}.py`,
                filters: [{
                    name: 'Python Script',
                    extensions: ['py']
                }]
            });

            console.log("Selected path:", path);
            if (!path) return; // User cancelled

            const downloadFile = async (name, content, type) => {
                console.log("Writing to file:", path);
                try {
                    await writeTextFile(path, content);
                    console.log("File written successfully");
                    alert('Export úspěšný!');
                } catch (writeErr) {
                    console.error("Write failed:", writeErr);
                    alert("Chyba při zápisu: " + (typeof writeErr === 'object' ? JSON.stringify(writeErr) : writeErr));
                }
            };

            console.log("Generating Python code...");
            exportToPython(formElements, customMethods, canvasSize, downloadFile, formEvents);
        } catch (error) {
            console.error("Export failed:", error);
            alert("Chyba při exportu: " + (error.message || JSON.stringify(error)));
        }
    };

    const saveProject = async () => {
        try {
            console.log("Opening save dialog for Project...");
            const path = await save({
                defaultPath: `${formName}.json`,
                filters: [{
                    name: 'JSON Project',
                    extensions: ['json']
                }]
            });

            console.log("Selected path:", path);
            if (!path) return; // User cancelled

            // Prepare events for export: Convert IDs to Names
            const exportEvents = {};
            Object.entries(formEvents).forEach(([key, code]) => {
                const parts = key.split('_');
                if (parts.length >= 2) {
                    const id = parts[0] + (parts[1].match(/^\d+$/) ? '_' + parts[1] : ''); // Handle obj_TIMESTAMP_RANDOM format vs Form1
                    // Actually, our IDs are usually 'obj_...' or 'Form1'.
                    // If it starts with 'obj_', the ID is everything until the last underscore? No, ID is fixed format.
                    // Wait, our IDs are `obj_${Date.now()}_${random}`. That contains underscores.
                    // Splitting by underscore is risky if ID contains underscores.

                    // Better approach: Find which widget ID is the prefix of the key.
                    let widgetId = null;
                    let eventName = null;

                    if (key.startsWith('Form1_')) {
                        widgetId = 'Form1';
                        eventName = key.substring(6);
                    } else {
                        // Try to match against known widget IDs
                        const widget = formElements.find(w => key.startsWith(w.id + '_'));
                        if (widget) {
                            widgetId = widget.id;
                            eventName = key.substring(widgetId.length + 1);
                        }
                    }

                    if (widgetId && eventName) {
                        if (widgetId === 'Form1') {
                            exportEvents[`Form1_${eventName}`] = code;
                        } else {
                            const widget = formElements.find(w => w.id === widgetId);
                            if (widget) {
                                const name = widget.props.name || widget.name;
                                exportEvents[`${name}_${eventName}`] = code;
                            }
                        }
                    }
                }
            });

            const data = JSON.stringify({ canvasSize, widgets: formElements, customMethods, formEvents: exportEvents, formName }, null, 2);
            console.log("Writing project data to:", path);
            await writeTextFile(path, data);
            console.log("Project saved successfully");
            alert('Projekt uložen!');
        } catch (error) {
            console.error("Save failed:", error);
            alert("Chyba při ukládání: " + (error.message || (typeof error === 'object' ? JSON.stringify(error) : error)));
        }
    };

    const handleNewProject = async () => {
        const answer = await ask("Opravdu chcete začít nový projekt? Všechna neuložená data budou ztracena.", {
            title: 'Nový projekt',
            kind: 'warning'
        });

        if (answer) {
            setFormElements([]);
            setCustomMethods([]);
            setFormEvents({});
            setFormName('Form1');
            setCanvasSize({ width: 800, height: 600 });
            setSelectedIds([]);
        }
    };

    // --- TOOLBAR HANDLERS ---
    const handleToolSelect = (tool) => {
        if (activeTool === tool) {
            // If clicking the same tool, deselect it and unlock
            setActiveTool(null);
            setIsToolLocked(false);
        } else {
            // Select new tool, initially unlocked
            setActiveTool(tool);
            setIsToolLocked(false);
        }
    };

    const handleToolLock = (tool) => {
        setActiveTool(tool);
        setIsToolLocked(true);
    };

    // --- KEYBOARD HANDLING ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Clipboard Shortcuts
            if (e.ctrlKey) {
                if (e.key === 'c' || e.key === 'C') {
                    e.preventDefault();
                    copyToClipboard();
                    return;
                }
                if (e.key === 'v' || e.key === 'V') {
                    e.preventDefault();
                    pasteFromClipboard();
                    return;
                }
                if (e.key === 'x' || e.key === 'X') {
                    e.preventDefault();
                    cutToClipboard();
                    return;
                }
            }

            // Ctrl+A - Select All
            if (e.ctrlKey && (e.code === 'KeyA' || e.key === 'a' || e.key === 'A')) {
                const tagName = e.target.tagName;
                if (tagName === 'INPUT' || tagName === 'TEXTAREA' || e.target.isContentEditable) {
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                setSelectedIds(formElements.map(el => el.id));
                return;
            }

            if (selectedIds.length === 0) return;
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

            const step = e.ctrlKey ? gridSize : 1;
            const isResize = e.shiftKey;
            const isAlign = e.altKey;

            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();

                if (isAlign && selectedIds.length > 1) {
                    // Alignment Logic
                    const selectedElements = formElements.filter(el => selectedIds.includes(el.id));
                    let targetValue;

                    if (e.key === 'ArrowLeft') {
                        targetValue = Math.min(...selectedElements.map(el => el.x));
                        setFormElements(prev => prev.map(el => selectedIds.includes(el.id) ? { ...el, x: targetValue } : el));
                    } else if (e.key === 'ArrowRight') {
                        const maxRight = Math.max(...selectedElements.map(el => el.x + (el.props.width || 0)));
                        setFormElements(prev => prev.map(el => selectedIds.includes(el.id) ? { ...el, x: maxRight - (el.props.width || 0) } : el));
                    } else if (e.key === 'ArrowTop') {
                        targetValue = Math.min(...selectedElements.map(el => el.y));
                        setFormElements(prev => prev.map(el => selectedIds.includes(el.id) ? { ...el, y: targetValue } : el));
                    } else if (e.key === 'ArrowBottom') {
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
                                if (e.key === 'ArrowRight') width += step;
                                if (e.key === 'ArrowLeft') width -= step;
                                if (e.key === 'ArrowDown') height += step;
                                if (e.key === 'ArrowUp') height -= step;
                            } else {
                                if (e.key === 'ArrowRight') x += step;
                                if (e.key === 'ArrowLeft') x -= step;
                                if (e.key === 'ArrowDown') y += step;
                                if (e.key === 'ArrowUp') y -= step;
                            }

                            return { ...el, x, y, props: { ...props, width, height } };
                        }
                        return el;
                    });
                });
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                setFormElements(prev => prev.filter(el => !selectedIds.includes(el.id)));
                setSelectedIds([]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIds, formElements, gridSize]);

    const imageInputRef = useRef(null);

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            updateWidgetProp('src', event.target.result);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleLoadProject} />
            <input type="file" ref={fileInputScaRef} className="hidden" accept=".sca,.txt" onChange={handleImportSCA} />
            <input type="file" ref={fileInputSprRef} className="hidden" accept=".spr" onChange={handleImportSPR} />
            <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />

            {/* Modals */}
            <CodeEditorModal
                isOpen={activeModal === 'code'}
                onClose={() => setActiveModal(null)}
                onSave={handleSaveCode}
                title={editingCode?.type === 'event' ? `Událost: ${editingCode.name}` : `Metoda: ${editingCode?.name}`}
                subTitle={editingCode?.type === 'event' ? `Widget: ${editingCode.id}` : `Args: ${editingCode?.args}`}
                initialCode={editingCode?.type === 'event' ? (formEvents[editingCode.key] || "") : (customMethods.find(m => m.name === editingCode?.name)?.code || "")}
            />
            <AddMethodModal
                isOpen={activeModal === 'addMethod'}
                onClose={() => setActiveModal(null)}
                onAdd={handleAddMethod}
            />

            {/* Header */}
            <header className="h-12 bg-gray-800 text-white flex items-center justify-between px-4 shrink-0 z-30">
                <div className="flex items-center space-x-2 font-bold text-lg">
                    <Monitor className="text-yellow-400" size={20} />
                    <span>Visual Form Builder</span>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={handleNewProject} className="flex items-center space-x-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 rounded text-sm transition-colors">
                        <FilePlus size={14} />
                        <span>Nový</span>
                    </button>
                    <button onClick={() => fileInputRef.current.click()} className="flex items-center space-x-1 px-3 py-1 bg-orange-600 hover:bg-orange-700 rounded text-sm transition-colors">
                        <FolderOpen size={14} />
                        <span>Načíst JSON</span>
                    </button>
                    <button onClick={saveProject} className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors">
                        <Save size={14} />
                        <span>Uložit JSON</span>
                    </button>
                    <button onClick={() => fileInputScaRef.current.click()} className="flex items-center space-x-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors">
                        <FolderOpen size={14} />
                        <span>Import SCA</span>
                    </button>
                    <button onClick={() => fileInputSprRef.current.click()} className="flex items-center space-x-1 px-3 py-1 bg-teal-600 hover:bg-teal-700 rounded text-sm transition-colors">
                        <FolderOpen size={14} />
                        <span>Import SPR</span>
                    </button>
                    <button onClick={handleExportToPython} className="flex items-center space-x-1 px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors">
                        <Code size={14} />
                        <span>Export Python</span>
                    </button>
                    <div className="h-6 w-px bg-gray-600 mx-2"></div>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`flex items-center space-x-1 px-3 py-1 rounded text-sm transition-colors ${showSettings ? 'bg-gray-600' : 'hover:bg-gray-700'}`}
                    >
                        <Settings size={14} />
                        <span>Nastavení</span>
                    </button>
                </div>
            </header>

            {/* Settings Panel */}
            {
                showSettings && (
                    <div className="bg-gray-100 border-b border-gray-300 p-2 flex items-center space-x-4 px-4 shadow-inner">
                        <div className="flex items-center space-x-2">
                            <GridIcon size={16} className="text-gray-600" />
                            <span className="text-sm font-medium text-gray-700">Mřížka:</span>
                        </div>
                        <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showGrid}
                                onChange={(e) => setShowGrid(e.target.checked)}
                                className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span>Zobrazit</span>
                        </label>
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-700">Velikost:</span>
                            <input
                                type="number"
                                value={gridSize}
                                onChange={(e) => setGridSize(Math.max(5, parseInt(e.target.value) || 10))}
                                className="w-16 border border-gray-300 rounded px-2 py-1 text-sm bg-white text-gray-900"
                                min="5"
                                max="100"
                            />
                            <span className="text-sm text-gray-500">px</span>
                        </div>
                        <div className="h-6 w-px bg-gray-300 mx-2"></div>
                        <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">SCA:</span>
                            <select
                                value={scaCharset}
                                onChange={(e) => setScaCharset(e.target.value)}
                                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-500"
                            >
                                <option value="windows-1250">CP1250 (Win-1250)</option>
                                <option value="ibm852">CP852 (Latin 2)</option>
                                <option value="ibm437">CP437 (OEM US)</option>
                                <option value="ibm850">CP850 (Latin 1)</option>
                                <option value="utf-8">UTF-8</option>
                                <option value="windows-1252">System Default</option>
                            </select>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">SPR:</span>
                            <select
                                value={sprCharset}
                                onChange={(e) => setSprCharset(e.target.value)}
                                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-500"
                            >
                                <option value="cp895">CP895 (Kamenický)</option>
                                <option value="ibm852">CP852 (Latin 2)</option>
                                <option value="windows-1250">CP1250 (Win-1250)</option>
                                <option value="ibm437">CP437 (OEM US)</option>
                                <option value="ibm850">CP850 (Latin 1)</option>
                                <option value="utf-8">UTF-8</option>
                                <option value="windows-1252">System Default</option>
                            </select>
                        </div>
                    </div>
                )
            }

            <div className="flex-1 flex relative overflow-hidden">
                <Toolbar
                    activeTool={activeTool}
                    isToolLocked={isToolLocked}
                    onToolSelect={handleToolSelect}
                    onToolLock={handleToolLock}
                />
                <Canvas
                    elements={formElements}
                    gridSize={gridSize}
                    showGrid={showGrid}
                    canvasRef={canvasRef}
                    selectedIds={selectedIds}
                    onWidgetClick={handleWidgetClick}
                    onCanvasClick={handleCanvasClick}
                    onResizeMouseDown={handleInteractionStart}
                    canvasSize={canvasSize}
                    onCanvasMouseDown={handleCanvasMouseDown}
                    selectionBox={selectionBox}
                    drawingRect={drawingRect}
                    activeTool={activeTool}
                    formName={formName}
                />
                <aside className="w-80 bg-white border-l border-gray-200 flex flex-col z-20 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 font-bold text-gray-700 bg-gray-50">
                        VLASTNOSTI
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        {selectedElement ? (
                            <>
                                <div className="text-center mb-6">
                                    <div className="font-bold text-lg text-gray-800">{selectedElement.type}</div>
                                    <div className="text-xs text-gray-500">{selectedElement.id}</div>
                                </div>

                                <div className="mb-6">
                                    <div className="text-xs font-bold text-gray-500 uppercase mb-2">Rozměry a Pozice</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <PropInput label="X" value={selectedElement.x} onChange={(v) => {
                                            const val = parseInt(v);
                                            if (!isNaN(val)) {
                                                setFormElements(els => {
                                                    const updated = els.map(el => selectedIds.includes(el.id) ? { ...el, x: val } : el);
                                                    return reparentElements(updated, selectedIds);
                                                });
                                            }
                                        }} />
                                        <PropInput label="Y" value={selectedElement.y} onChange={(v) => {
                                            const val = parseInt(v);
                                            if (!isNaN(val)) {
                                                setFormElements(els => {
                                                    const updated = els.map(el => selectedIds.includes(el.id) ? { ...el, y: val } : el);
                                                    return reparentElements(updated, selectedIds);
                                                });
                                            }
                                        }} />
                                        <PropInput label="Šířka" value={selectedElement.props.width} onChange={(v) => updateWidgetProp('width', parseInt(v) || 0)} />
                                        <PropInput label="Výška" value={selectedElement.props.height} onChange={(v) => updateWidgetProp('height', parseInt(v) || 0)} />
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <div className="text-xs font-bold text-gray-500 uppercase mb-2">Vlastnosti</div>
                                    <PropInput label="Name" value={selectedElement.props.name || ''} onChange={(v) => updateWidgetProp('name', v)} />
                                    {Object.entries({ ...selectedElement.props }).map(([key, value]) => {
                                        if (['width', 'height', 'style', 'name', 'visible', 'enabled', 'src', 'stretch', 'repeat', 'columns', 'hotkey', 'default', 'cancel'].includes(key)) return null; // Skip handled props
                                        return (
                                            <PropInput
                                                key={key}
                                                label={key}
                                                value={value}
                                                onChange={(v) => updateWidgetProp(key, v)}
                                            />
                                        );
                                    })}

                                    {['button', 'checkbox', 'radio'].includes(selectedElement.type) && (
                                        <PropInput label="Hotkey" value={selectedElement.props.hotkey || ''} onChange={(v) => updateWidgetProp('hotkey', v)} />
                                    )}

                                    {selectedElement.type === 'button' && (
                                        <>
                                            <PropInput label="Default" value={selectedElement.props.default || false} onChange={(v) => updateWidgetProp('default', v === 'true' || v === true)} />
                                            <PropInput label="Cancel" value={selectedElement.props.cancel || false} onChange={(v) => updateWidgetProp('cancel', v === 'true' || v === true)} />
                                        </>
                                    )}

                                    {selectedElement.type === 'grid' && (
                                        <div className="mb-4 border border-gray-200 rounded p-2 bg-gray-50">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="text-[10px] font-bold text-gray-500 uppercase">Sloupce</div>
                                                <button
                                                    onClick={() => {
                                                        const currentCols = Array.isArray(selectedElement.props.columns) ? selectedElement.props.columns : [];
                                                        const newCol = { header: 'New Col', field: '', width: 100 };
                                                        updateWidgetProp('columns', [...currentCols, newCol]);
                                                    }}
                                                    className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                                                >
                                                    <Plus size={12} />
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                {(Array.isArray(selectedElement.props.columns) ? selectedElement.props.columns : []).map((col, idx) => (
                                                    <div key={idx} className="bg-white border border-gray-200 rounded p-2 text-xs">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="font-bold text-gray-600">#{idx + 1}</span>
                                                            <button
                                                                onClick={() => {
                                                                    const newCols = [...selectedElement.props.columns];
                                                                    newCols.splice(idx, 1);
                                                                    updateWidgetProp('columns', newCols);
                                                                }}
                                                                className="text-red-500 hover:text-red-700"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-1">
                                                            <div className="flex items-center gap-1">
                                                                <span className="w-10 text-gray-500">Hdr:</span>
                                                                <input
                                                                    className="flex-1 border rounded px-1"
                                                                    value={col.header || ''}
                                                                    onChange={(e) => {
                                                                        const newCols = [...selectedElement.props.columns];
                                                                        newCols[idx] = { ...newCols[idx], header: e.target.value };
                                                                        updateWidgetProp('columns', newCols);
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <span className="w-10 text-gray-500">Fld:</span>
                                                                <input
                                                                    className="flex-1 border rounded px-1"
                                                                    value={col.field || ''}
                                                                    onChange={(e) => {
                                                                        const newCols = [...selectedElement.props.columns];
                                                                        newCols[idx] = { ...newCols[idx], field: e.target.value };
                                                                        updateWidgetProp('columns', newCols);
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <span className="w-10 text-gray-500">W:</span>
                                                                <input
                                                                    type="number"
                                                                    className="flex-1 border rounded px-1"
                                                                    value={col.width || 100}
                                                                    onChange={(e) => {
                                                                        const newCols = [...selectedElement.props.columns];
                                                                        newCols[idx] = { ...newCols[idx], width: parseInt(e.target.value) || 100 };
                                                                        updateWidgetProp('columns', newCols);
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!Array.isArray(selectedElement.props.columns) || selectedElement.props.columns.length === 0) && (
                                                    <div className="text-center text-gray-400 italic py-2">Žádné sloupce</div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {selectedElement.type === 'image' && (
                                        <>
                                            <div className="mb-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase w-full block mb-1">Src</label>
                                                <div className="flex gap-1">
                                                    <input
                                                        type="text"
                                                        value={selectedElement.props.src || ''}
                                                        onChange={(e) => updateWidgetProp('src', e.target.value)}
                                                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                                                    />
                                                    <button
                                                        onClick={() => imageInputRef.current.click()}
                                                        className="px-3 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 rounded text-xs font-bold text-gray-600"
                                                        title="Vybrat soubor"
                                                    >
                                                        ...
                                                    </button>
                                                </div>
                                            </div>
                                            <PropInput label="Stretch" value={selectedElement.props.stretch || false} onChange={(v) => updateWidgetProp('stretch', v)} />
                                            <PropInput label="Repeat" value={selectedElement.props.repeat || false} onChange={(v) => updateWidgetProp('repeat', v)} />
                                        </>
                                    )}

                                    <PropInput label="Visible" value={selectedElement.props.visible !== false} onChange={(v) => updateWidgetProp('visible', v === 'true' || v === true)} />
                                    <PropInput label="Enabled" value={selectedElement.props.enabled !== false} onChange={(v) => updateWidgetProp('enabled', v === 'true' || v === true)} />
                                </div>

                                <div className="mb-6">
                                    <div className="text-xs font-bold text-gray-500 uppercase mb-2">Styl</div>
                                    <PropInput
                                        label="Font Size"
                                        value={selectedElement.props.style?.fontSize || '14px'}
                                        onChange={(v) => updateWidgetStyle('fontSize', v)}
                                    />
                                    <div className="mb-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase w-full block mb-1">Color</label>
                                        <div className="flex gap-1">
                                            <input
                                                type="color"
                                                value={selectedElement.props.style?.color || '#000000'}
                                                onChange={(e) => updateWidgetStyle('color', e.target.value)}
                                                className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={selectedElement.props.style?.color || '#000000'}
                                                onChange={(e) => updateWidgetStyle('color', e.target.value)}
                                                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {!selectedElement.isMulti && (
                                    <div>
                                        <div className="text-xs font-bold text-gray-500 uppercase mb-2">Události</div>
                                        <div className="space-y-1">
                                            {(() => {
                                                const standardEvents = ['Click', 'RightClick', 'GotFocus', 'LostFocus'];
                                                // Find all events for this widget in formEvents
                                                const widgetEvents = Object.keys(formEvents)
                                                    .filter(key => key.startsWith(`${selectedElement.id}_`))
                                                    .map(key => key.replace(`${selectedElement.id}_`, ''));

                                                // Combine and deduplicate
                                                const allEvents = [...new Set([...standardEvents, ...widgetEvents])];

                                                return allEvents.map(evt => (
                                                    <button
                                                        key={evt}
                                                        onClick={() => handleEditEvent(evt)}
                                                        className={`w-full flex items-center justify-between px-2 py-1 text-sm border rounded hover:bg-gray-50 ${formEvents[`${selectedElement.id}_${evt}`] ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-600'}`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Zap size={12} className={formEvents[`${selectedElement.id}_${evt}`] ? 'text-blue-500' : 'text-gray-400'} />
                                                            <span>{evt}</span>
                                                        </div>
                                                        {formEvents[`${selectedElement.id}_${evt}`] && <span className="text-[10px] font-bold">EDIT</span>}
                                                    </button>
                                                ));
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="text-center mt-10">
                                    <div className="text-gray-300 mb-2">
                                        <Monitor size={48} className="mx-auto" />
                                    </div>
                                    <div className="font-medium text-gray-600">Formulář</div>
                                </div>

                                <div className="mt-6 mb-6">
                                    <div className="text-xs font-bold text-gray-500 uppercase mb-2">Nastavení Formuláře</div>
                                    <div className="mb-2">
                                        <PropInput label="Name" value={formName} onChange={setFormName} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mb-4">
                                        <PropInput label="Šířka" value={canvasSize.width} onChange={(v) => setCanvasSize({ ...canvasSize, width: parseInt(v) || 800 })} />
                                        <PropInput label="Výška" value={canvasSize.height} onChange={(v) => setCanvasSize({ ...canvasSize, height: parseInt(v) || 600 })} />
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <div className="text-xs font-bold text-gray-500 uppercase mb-2">Události Formuláře</div>
                                    <div className="space-y-1">
                                        {['Load', 'Unload', 'Init', 'Destroy', 'Click'].map(evt => (
                                            <button
                                                key={evt}
                                                onClick={() => handleEditEvent(evt)}
                                                className={`w-full flex items-center justify-between px-2 py-1 text-sm border rounded hover:bg-gray-50 ${formEvents[`Form1_${evt}`] ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-600'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Zap size={12} className={formEvents[`Form1_${evt}`] ? 'text-blue-500' : 'text-gray-400'} />
                                                    <span>{evt}</span>
                                                </div>
                                                {formEvents[`Form1_${evt}`] && <span className="text-[10px] font-bold">EDIT</span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="text-xs font-bold text-gray-500 uppercase">Vlastní Metody</div>
                                        <button onClick={() => setActiveModal('addMethod')} className="p-1 hover:bg-gray-200 rounded text-blue-600">
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <div className="space-y-1">
                                        {customMethods.length === 0 && <div className="text-xs text-gray-400 italic text-center py-2">Žádné metody</div>}
                                        {customMethods.map(m => (
                                            <div key={m.name} className="flex items-center justify-between px-2 py-1 text-sm border border-gray-300 rounded bg-white">
                                                <span className="font-mono text-xs">{m.name}({m.args})</span>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => handleEditMethod(m)} className="p-1 hover:bg-gray-100 rounded text-blue-600"><Edit size={12} /></button>
                                                    <button onClick={() => handleDeleteMethod(m.name)} className="p-1 hover:bg-gray-100 rounded text-red-600"><Trash2 size={12} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default Layout;
