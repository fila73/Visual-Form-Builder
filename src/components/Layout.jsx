import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './Sidebar';
import { componentRegistry } from '../data/componentRegistry';
import Canvas from './Canvas';
import FormElement from './FormElement';
import PropInput from './PropInput';
import CodeEditorModal from './modals/CodeEditorModal';
import AddMethodModal from './modals/AddMethodModal';
import { Monitor, FolderOpen, Save, Code, Settings, Grid as GridIcon, Zap, Plus, Trash2, Edit } from 'lucide-react';
import { parseSCAContent } from '../utils/scaParser';
import { exportToPython } from '../utils/pythonExporter';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

const Layout = () => {
    const Layout = () => {
        // --- STATE MANAGEMENT ---

        // List of all form elements (widgets) on the canvas
        const [formElements, setFormElements] = useState([]);

        // IDs of currently selected elements
        const [selectedIds, setSelectedIds] = useState([]);

        // Selection box state for drag-to-select functionality
        const [selectionBox, setSelectionBox] = useState(null); // { startX, startY, currentX, currentY }

        // Currently active tool from the sidebar (e.g., 'Button', 'Label')
        const [activeTool, setActiveTool] = useState(null);

        // If true, the tool remains active after placing a widget (sticky mode)
        const [isToolLocked, setIsToolLocked] = useState(false);

        // State for drawing a new widget on the canvas
        const [drawingRect, setDrawingRect] = useState(null); // { startX, startY, currentX, currentY }

        // --- CLIPBOARD OPERATIONS ---

        /**
         * Copies the selected elements to the system clipboard as a JSON string.
         */
        const copyToClipboard = async () => {
            if (selectedIds.length === 0) return;
            const selectedElements = formElements.filter(el => selectedIds.includes(el.id));
            const json = JSON.stringify(selectedElements, null, 2);
            try {
                await navigator.clipboard.writeText(json);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        };

        /**
         * Cuts the selected elements (copy + delete).
         */
        const cutToClipboard = async () => {
            await copyToClipboard();
            setFormElements(prev => prev.filter(el => !selectedIds.includes(el.id)));
            setSelectedIds([]);
        };

        /**
         * Pastes elements from the clipboard.
         * Handles unique name generation and position offsetting to avoid collisions.
         */
        const pasteFromClipboard = async () => {
            try {
                const text = await navigator.clipboard.readText();
                const widgets = JSON.parse(text);
                if (!Array.isArray(widgets)) return;

                // Helper to generate a unique name for the pasted widget
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

                // Check for position collisions with the first widget in the pasted group
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

                // Process widgets sequentially to ensure unique names
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

                // Remap parent IDs if the parent is also being pasted
                const idMap = {};
                widgets.forEach((w, i) => {
                    idMap[w.id] = newWidgets[i].id;
                });

                newWidgets.forEach(w => {
                    if (w.parentId && idMap[w.parentId]) {
                        w.parentId = idMap[w.parentId];
                    }
                });

                setFormElements(prev => [...prev, ...newWidgets]);
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

    // --- KEYBOARD HANDLING ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl+A - Select All
            // Use e.code 'KeyA' which is layout-independent for the physical key 'A'
            // Also check for e.key === 'a' or 'A' as fallback
            if (e.ctrlKey && (e.code === 'KeyA' || e.key === 'a' || e.key === 'A')) {
                // Ignore if focus is in an input or textarea
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
                        // Align Left: Find min X
                        targetValue = Math.min(...selectedElements.map(el => el.x));
                        setFormElements(prev => prev.map(el => selectedIds.includes(el.id) ? { ...el, x: targetValue } : el));
                    } else if (e.key === 'ArrowUp') {
                        // Align Top: Find min Y
                        targetValue = Math.min(...selectedElements.map(el => el.y));
                        setFormElements(prev => prev.map(el => selectedIds.includes(el.id) ? { ...el, y: targetValue } : el));
                    } else if (e.key === 'ArrowRight') {
                        // Align Right: Find max Right edge (x + width)
                        targetValue = Math.max(...selectedElements.map(el => el.x + (el.props.width || 0)));
                        setFormElements(prev => prev.map(el => selectedIds.includes(el.id) ? { ...el, x: targetValue - (el.props.width || 0) } : el));
                    } else if (e.key === 'ArrowDown') {
                        // Align Bottom: Find max Bottom edge (y + height)
                        targetValue = Math.max(...selectedElements.map(el => el.y + (el.props.height || 0)));
                        setFormElements(prev => prev.map(el => selectedIds.includes(el.id) ? { ...el, y: targetValue - (el.props.height || 0) } : el));
                    }
                } else {
                    // Move / Resize Logic
                    setFormElements(prev => prev.map(el => {
                        if (!selectedIds.includes(el.id)) return el;

                        let { x, y } = el;
                        let { width, height } = el.props;

                        if (isResize) {
                            if (e.key === 'ArrowRight') width += step;
                            if (e.key === 'ArrowLeft') width -= step;
                            if (e.key === 'ArrowDown') height += step;
                            if (e.key === 'ArrowUp') height -= step;
                            if (width < gridSize) width = gridSize;
                            if (height < gridSize) height = gridSize;
                        } else {
                            if (e.key === 'ArrowRight') x += step;
                            if (e.key === 'ArrowLeft') x -= step;
                            if (e.key === 'ArrowDown') y += step;
                            if (e.key === 'ArrowUp') y -= step;
                        }

                        return { ...el, x, y, props: { ...el.props, width, height } };
                    }));
                }
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (confirm(`Opravdu smazat vybrané prvky (${selectedIds.length})?`)) {
                    setFormElements(prev => prev.filter(el => !selectedIds.includes(el.id)));
                    setSelectedIds([]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [selectedIds, gridSize, formElements]);




    // --- REPARENTING LOGIC ---

    /**
     * Checks if moved/resized elements should be reparented (nested) into a container.
     * This function calculates absolute bounds, checks for containment, and updates parentId and relative coordinates.
     * 
     * @param {Array} elements - Current list of form elements.
     * @param {Array} modifiedIds - IDs of elements that were moved or resized.
     * @returns {Array} - Updated list of elements with correct parent-child relationships.
     */
    const reparentElements = (elements, modifiedIds) => {
        // Helper to get absolute bounds of all elements (handling nested coordinates)
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
        // This prevents double-processing if a container and its child are both selected.
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

            // Helper to check if a rect is fully contained within a container
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

            // Find the best parent (smallest container that fully contains the widget)
            Object.values(absBounds).forEach(targetBound => {
                if (targetBound.el.type === 'container' && targetBound.el.id !== id) {
                    // Check if target is descendant of current widget (prevent circular nesting)
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
                // Attach to new parent
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
                // Detach from parent (become root)
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
                // For x/y, we need to update the element's x/y directly, not in props
                // Wait, updateWidgetProp handles props. x/y are top-level properties.
                // The PropInput for X/Y calls setFormElements directly (lines 731-742).
                // This function `updateWidgetProp` is used for `props.*`.
                // BUT `width` and `height` ARE in `props`.
                // So if width/height changes, we should check reparenting.
                return reparentElements(updatedElements, selectedIds);
            }

            return updatedElements;
        });
    };

    // Helper to determine common properties for selection
    const getSelectedElementData = () => {
        if (selectedIds.length === 0) return null;

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
            // Also check keys present in w but not in commonProps (should be rare if same type)
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
                    setFormEvents(data.formEvents || {});
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
        reader.onload = (event) => parseSCAContent(event.target.result, setCanvasSize, setFormElements, (id) => setSelectedIds([id]), setFormEvents, setFormName);
        reader.readAsText(file); e.target.value = '';
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

            const data = JSON.stringify({ canvasSize, widgets: formElements, customMethods, formEvents, formName }, null, 2);
            console.log("Writing project data to:", path);
            await writeTextFile(path, data);
            console.log("Project saved successfully");
            alert('Projekt uložen!');
        } catch (error) {
            console.error("Save failed:", error);
            alert("Chyba při ukládání: " + (error.message || (typeof error === 'object' ? JSON.stringify(error) : error)));
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
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`flex items-center space-x-1 px-3 py-1 rounded text-sm transition-colors ${showSettings ? 'bg-gray-600' : 'hover:bg-gray-700'}`}
                    >
                        <Settings size={14} />
                        <span>Nastavení</span>
                    </button>
                    <div className="h-6 w-px bg-gray-600 mx-2"></div>
                    <button onClick={() => fileInputScaRef.current.click()} className="flex items-center space-x-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors">
                        <FolderOpen size={14} />
                        <span>Import VFP</span>
                    </button>
                    <button onClick={() => fileInputRef.current.click()} className="flex items-center space-x-1 px-3 py-1 bg-orange-600 hover:bg-orange-700 rounded text-sm transition-colors">
                        <FolderOpen size={14} />
                        <span>Načíst JSON</span>
                    </button>
                    <button onClick={saveProject} className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors">
                        <Save size={14} />
                        <span>Uložit Projekt</span>
                    </button>
                    <button onClick={handleExportToPython} className="flex items-center space-x-1 px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors">
                        <Code size={14} />
                        <span>Export Python</span>
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
                                className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
                                min="5"
                                max="100"
                            />
                            <span className="text-sm text-gray-500">px</span>
                        </div>
                    </div>
                )
            }

            <div className="flex flex-1 overflow-hidden">
                <Sidebar
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
                                        if (['width', 'height', 'style', 'name', 'visible', 'enabled', 'src', 'stretch', 'repeat'].includes(key)) return null; // Skip handled props
                                        return (
                                            <PropInput
                                                key={key}
                                                label={key}
                                                value={value}
                                                onChange={(v) => updateWidgetProp(key, v)}
                                            />
                                        );
                                    })}

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
