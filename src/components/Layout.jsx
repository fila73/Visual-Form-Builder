import React, { useState, useRef, useEffect } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import Sidebar from './Sidebar';
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
    const [formElements, setFormElements] = useState([]);
    const [activeDragItem, setActiveDragItem] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectionBox, setSelectionBox] = useState(null); // { startX, startY, currentX, currentY }

    // Resizing & Moving State
    const [resizing, setResizing] = useState(false);
    const [resizeHandle, setResizeHandle] = useState(null); // null = move, string = resize handle
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
    const [initialStates, setInitialStates] = useState({}); // Map of id -> {x, y, w, h}

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

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

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

        // Helper to find all descendants recursively
        const getAllDescendants = (parentId) => {
            const children = formElements.filter(el => el.parentId === parentId);
            let descendants = [...children];
            children.forEach(child => {
                descendants = [...descendants, ...getAllDescendants(child.id)];
            });
            return descendants;
        };

        const states = {};
        targetIds.forEach(tid => {
            const w = formElements.find(el => el.id === tid);
            if (w) {
                states[tid] = {
                    x: w.x,
                    y: w.y,
                    w: w.props.width || 100,
                    h: w.props.height || 20
                };

                // If moving (not resizing), also capture children states
                if (!handle) {
                    const descendants = getAllDescendants(tid);
                    descendants.forEach(child => {
                        states[child.id] = {
                            x: child.x,
                            y: child.y,
                            w: child.props.width || 100,
                            h: child.props.height || 20
                        };
                    });
                }
            }
        });

        setResizing(true);
        setResizeHandle(handle);
        setResizeStart({ x: e.clientX, y: e.clientY });
        setInitialStates(states);
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (selectionBox) {
                setSelectionBox(prev => ({ ...prev, currentX: e.clientX, currentY: e.clientY }));
                return;
            }

            if (!resizing) return;

            const dx = e.clientX - resizeStart.x;
            const dy = e.clientY - resizeStart.y;
            const snap = (val) => showGrid ? Math.round(val / gridSize) * gridSize : val;

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
                    newX = snap(init.x + dx);
                    newY = snap(init.y + dy);
                }

                return { ...el, x: newX, y: newY, props: { ...el.props, width: newW, height: newH } };
            }));
        };

        const handleMouseUp = (e) => {
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
                        const newSelected = formElements.filter(el => {
                            const elRight = el.x + (el.props.width || 100);
                            const elBottom = el.y + (el.props.height || 20);
                            return (
                                el.x >= sbLeft &&
                                el.y >= sbTop &&
                                elRight <= sbRight &&
                                elBottom <= sbBottom
                            );
                        }).map(el => el.id);

                        if (e.ctrlKey) {
                            setSelectedIds(prev => [...new Set([...prev, ...newSelected])]);
                        } else {
                            setSelectedIds(newSelected);
                        }
                    } else {
                        // Treat as click on empty space
                        if (!e.ctrlKey) setSelectedIds([]);
                    }
                }
                setSelectionBox(null);
                return;
            }

            if (resizing) {
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
    }, [resizing, resizeStart, initialStates, resizeHandle, gridSize, showGrid, selectionBox, formElements]);

    // --- KEYBOARD HANDLING ---
    useEffect(() => {
        const handleKeyDown = (e) => {
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

            // Ctrl+A - Select All
            if (e.ctrlKey && e.key === 'a') {
                e.preventDefault();
                setSelectedIds(formElements.map(el => el.id));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIds, gridSize, formElements]);


    // --- DRAG & DROP (New Components) ---
    const handleDragStart = (event) => {
        setActiveDragItem(event.active.data.current.component);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (over && over.id === 'canvas-droppable') {
            const component = active.data.current.component;

            let x = 0;
            let y = 0;

            if (active.rect.current.translated && canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                const droppedRect = active.rect.current.translated;

                const rawX = droppedRect.left - rect.left;
                const rawY = droppedRect.top - rect.top;

                x = Math.round(rawX / gridSize) * gridSize;
                y = Math.round(rawY / gridSize) * gridSize;

                // Use defaultProps for width/height in boundary checks
                const componentWidth = component.defaultProps.width || 20;
                const componentHeight = component.defaultProps.height || 20;

                x = Math.max(0, Math.min(x, canvasSize.width - componentWidth));
                y = Math.max(0, Math.min(y, canvasSize.height - componentHeight));
            }

            const newWidget = {
                id: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                type: component.type,
                props: { ...component.defaultProps },
                x,
                y
            };
            setFormElements([...formElements, newWidget]);
            setSelectedIds([newWidget.id]); // Auto-select new element
        }

        setActiveDragItem(null);
    };

    // --- PROPERTIES ---
    const updateWidgetProp = (key, value) => {
        setFormElements(els => els.map(el => {
            if (selectedIds.includes(el.id)) {
                // Unique Name Check
                if (key === 'name') {
                    const nameExists = els.some(other => other.id !== el.id && other.props.name === value);
                    if (nameExists) {
                        value = `${value}_${el.id}`;
                    }
                }

                const newProps = { ...el.props };
                newProps[key] = value;
                return { ...el, props: newProps };
            }
            return el;
        }));
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
        const elementId = selectedId || 'Form1';
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

    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden">
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleLoadProject} />
            <input type="file" ref={fileInputScaRef} className="hidden" accept=".sca,.txt" onChange={handleImportSCA} />

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
                    <span>Visual FoxPro Web</span>
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

            <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex flex-1 overflow-hidden">
                    <Sidebar />
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
                                                    setFormElements(els => els.map(el => selectedIds.includes(el.id) ? { ...el, x: val } : el));
                                                }
                                            }} />
                                            <PropInput label="Y" value={selectedElement.y} onChange={(v) => {
                                                const val = parseInt(v);
                                                if (!isNaN(val)) {
                                                    setFormElements(els => els.map(el => selectedIds.includes(el.id) ? { ...el, y: val } : el));
                                                }
                                            }} />
                                            <PropInput label="Šířka" value={selectedElement.props.width} onChange={(v) => updateWidgetProp('width', parseInt(v) || 0)} />
                                            <PropInput label="Výška" value={selectedElement.props.height} onChange={(v) => updateWidgetProp('height', parseInt(v) || 0)} />
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <div className="text-xs font-bold text-gray-500 uppercase mb-2">Vlastnosti</div>
                                        <PropInput label="Name" value={selectedElement.props.name || ''} onChange={(v) => updateWidgetProp('name', v)} />
                                        {Object.entries({ visible: true, enabled: true, ...selectedElement.props }).map(([key, value]) => {
                                            if (['width', 'height', 'style', 'name'].includes(key)) return null; // Skip handled props
                                            return (
                                                <PropInput
                                                    key={key}
                                                    label={key}
                                                    value={value}
                                                    onChange={(v) => updateWidgetProp(key, v)}
                                                />
                                            );
                                        })}
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

                <DragOverlay>
                    {activeDragItem ? (
                        <div style={{
                            width: activeDragItem.defaultProps.width || 100,
                            height: activeDragItem.defaultProps.height || 24,
                            opacity: 0.8
                        }}>
                            <FormElement
                                element={{
                                    id: 'preview',
                                    type: activeDragItem.type,
                                    props: { ...activeDragItem.defaultProps, visible: true, enabled: true },
                                    x: 0,
                                    y: 0
                                }}
                                isSelected={false}
                                onInteractionStart={() => { }}
                            />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext >
        </div >
    );
};

export default Layout;
