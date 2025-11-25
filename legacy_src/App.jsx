import React, { useState, useEffect, useRef } from 'react';
import {
    Box, MousePointer, FileUp, FolderOpen, Save, Code, Trash2, Monitor, Plus, Settings, Eye, EyeOff, Unlock, Lock, Activity, Ban, CheckCircle2, Maximize2
} from 'lucide-react';

import { ALL_EVENTS_LIST, VALID_EVENTS, WIDGET_TYPES } from './constants/index.jsx';
import AddMethodModal from './components/modals/AddMethodModal';
import CodeEditorModal from './components/modals/CodeEditorModal';
import PropInput from './components/PropInput';
import WidgetRenderer from './components/WidgetRenderer';
import { parseSCAContent } from './utils/scaParser';
import { exportToPython } from './utils/pythonExporter';

// --- HLAVNÍ APLIKACE ---
export default function App() {
    const [widgets, setWidgets] = useState([]);
    const [customMethods, setCustomMethods] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
    const [dragging, setDragging] = useState(null);
    const fileInputRef = useRef(null);
    const fileInputScaRef = useRef(null);

    // Modals state
    const [editingEvent, setEditingEvent] = useState(null);
    const [isAddingMethod, setIsAddingMethod] = useState(false);

    const [formEvents, setFormEvents] = useState({});

    // --- DRAG & DROP LOGIC ---
    const handleDragStartNew = (e, type) => {
        e.dataTransfer.setData("widgetType", type);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const typeKey = e.dataTransfer.getData("widgetType");

        if (typeKey && WIDGET_TYPES[typeKey]) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const snapX = Math.round((x - 20) / 10) * 10;
            const snapY = Math.round((y - 10) / 10) * 10;

            const newWidget = {
                id: `obj_${Date.now()}`,
                type: typeKey,
                x: snapX > 0 ? snapX : 0,
                y: snapY > 0 ? snapY : 0,
                name: `${WIDGET_TYPES[typeKey].label}${widgets.filter(w => w.type === typeKey).length + 1}`,
                props: { ...WIDGET_TYPES[typeKey].defaultProps },
                events: { click: "", init: "", interactiveChange: "" }
            };
            setWidgets([...widgets, newWidget]);
            setSelectedId(newWidget.id);
        }
    };

    const handleWidgetMouseDown = (e, id) => {
        e.stopPropagation();
        setSelectedId(id);
        const widget = widgets.find(w => w.id === id);
        setDragging({ mode: 'MOVE', id: id, startX: e.clientX, startY: e.clientY, origX: widget.x, origY: widget.y });
    };

    const handleResizeMouseDown = (e, id, dir) => {
        e.stopPropagation();
        const widget = widgets.find(w => w.id === id);
        setDragging({
            mode: 'RESIZE',
            id: id,
            dir: dir,
            startX: e.clientX,
            startY: e.clientY,
            origX: widget.x,
            origY: widget.y,
            origW: widget.props.width,
            origH: widget.props.height
        });
    };

    const handleWidgetClick = (e) => e.stopPropagation();

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!selectedId) return;

            // Check if user is typing in an input
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

            const isArrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);
            if (!isArrow) return;

            e.preventDefault();

            const step = e.ctrlKey ? 10 : 1;
            const isResize = e.shiftKey;

            setWidgets(prev => {
                const widget = prev.find(w => w.id === selectedId);
                if (!widget) return prev;

                if (isResize) {
                    // RESIZING
                    let newW = widget.props.width;
                    let newH = widget.props.height;

                    if (e.key === 'ArrowRight') newW += step;
                    if (e.key === 'ArrowLeft') newW = Math.max(10, newW - step);
                    if (e.key === 'ArrowDown') newH += step;
                    if (e.key === 'ArrowUp') newH = Math.max(10, newH - step);

                    return prev.map(w => w.id === selectedId ? { ...w, props: { ...w.props, width: newW, height: newH } } : w);
                } else {
                    // MOVING
                    let newX = widget.x;
                    let newY = widget.y;

                    if (e.key === 'ArrowRight') newX += step;
                    if (e.key === 'ArrowLeft') newX -= step;
                    if (e.key === 'ArrowDown') newY += step;
                    if (e.key === 'ArrowUp') newY -= step;

                    const deltaX = newX - widget.x;
                    const deltaY = newY - widget.y;

                    return prev.map(w => {
                        if (w.id === selectedId) {
                            return { ...w, x: newX, y: newY };
                        }
                        // Move children if parent is container
                        if (widget.type === 'CONTAINER' && w.parentId === widget.name) {
                            return { ...w, x: w.x + deltaX, y: w.y + deltaY };
                        }
                        return w;
                    });
                }
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!dragging) return;
            if (dragging.mode === 'MOVE') {
                const dx = e.clientX - dragging.startX;
                const dy = e.clientY - dragging.startY;
                let newX = Math.round((dragging.origX + dx) / 10) * 10;
                let newY = Math.round((dragging.origY + dy) / 10) * 10;

                // Find widget and check if it's a container
                const movingWidget = widgets.find(w => w.id === dragging.id);

                setWidgets(prev => {
                    const deltaX = newX - movingWidget.x;
                    const deltaY = newY - movingWidget.y;

                    return prev.map(w => {
                        if (w.id === dragging.id) {
                            return { ...w, x: newX, y: newY };
                        }
                        // Move children if parent is container
                        if (movingWidget.type === 'CONTAINER' && w.parentId === movingWidget.name) { // Using name as parentId for now based on SCA import
                            return { ...w, x: w.x + deltaX, y: w.y + deltaY };
                        }
                        return w;
                    });
                });
            } else if (dragging.mode === 'RESIZE') {
                const dx = e.clientX - dragging.startX;
                const dy = e.clientY - dragging.startY;
                const dir = dragging.dir;

                let newX = dragging.origX;
                let newY = dragging.origY;
                let newW = dragging.origW;
                let newH = dragging.origH;

                if (dir.includes('e')) newW = Math.max(20, Math.round((dragging.origW + dx) / 10) * 10);
                if (dir.includes('s')) newH = Math.max(20, Math.round((dragging.origH + dy) / 10) * 10);
                if (dir.includes('w')) {
                    const proposedX = Math.round((dragging.origX + dx) / 10) * 10;
                    const deltaW = dragging.origX - proposedX;
                    if (dragging.origW + deltaW >= 20) {
                        newX = proposedX;
                        newW = dragging.origW + deltaW;
                    }
                }
                if (dir.includes('n')) {
                    const proposedY = Math.round((dragging.origY + dy) / 10) * 10;
                    const deltaH = dragging.origY - proposedY;
                    if (dragging.origH + deltaH >= 20) {
                        newY = proposedY;
                        newH = dragging.origH + deltaH;
                    }
                }

                setWidgets(prev => prev.map(w => w.id === dragging.id ? { ...w, x: newX, y: newY, props: { ...w.props, width: newW, height: newH } } : w));
            }
        };
        const handleMouseUp = () => setDragging(null);
        if (dragging) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
        return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
    }, [dragging, widgets]);

    const updateWidgetProp = (key, value) => {
        if (!selectedId) return;
        setWidgets(widgets.map(w => w.id === selectedId ? { ...w, props: { ...w.props, [key]: value } } : w));
    };

    const updateWidgetMeta = (key, value) => {
        if (!selectedId) return;
        setWidgets(widgets.map(w => w.id === selectedId ? { ...w, [key]: value } : w));
    };

    const deleteWidget = () => {
        if (!selectedId) return;
        setWidgets(widgets.filter(w => w.id !== selectedId));
        setSelectedId(null);
    }

    // --- EVENT EDITING ---
    const openEventEditor = (eventName) => {
        const w = widgets.find(x => x.id === selectedId);
        if (!w) return;
        setEditingEvent({
            type: 'WIDGET_EVENT',
            id: selectedId,
            name: w.name,
            eventName: eventName,
            code: w.events[eventName] || ""
        });
    };

    const openFormEventEditor = (eventName) => {
        setEditingEvent({
            type: 'FORM_EVENT',
            id: 'FORM',
            name: 'Form1',
            eventName: eventName,
            code: formEvents[eventName] || ""
        });
    };

    // --- CUSTOM METHODS LOGIC ---
    const handleAddCustomMethod = (name, args) => {
        setCustomMethods([...customMethods, { id: Date.now(), name, args, code: "" }]);
    };

    const deleteCustomMethod = (id) => {
        if (confirm("Opravdu smazat tuto metodu?")) {
            setCustomMethods(customMethods.filter(m => m.id !== id));
        }
    };

    const openCustomMethodEditor = (methodId) => {
        const m = customMethods.find(x => x.id === methodId);
        if (!m) return;
        setEditingEvent({
            type: 'CUSTOM_METHOD',
            id: methodId,
            name: m.name,
            eventName: 'Custom',
            code: m.code || "",
            args: m.args
        });
    };

    const saveCode = (newCode) => {
        if (!editingEvent) return;
        if (editingEvent.type === 'WIDGET_EVENT') {
            setWidgets(widgets.map(w => w.id === editingEvent.id ? { ...w, events: { ...w.events, [editingEvent.eventName]: newCode } } : w));
        } else if (editingEvent.type === 'CUSTOM_METHOD') {
            setCustomMethods(customMethods.map(m => m.id === editingEvent.id ? { ...m, code: newCode } : m));
        } else if (editingEvent.type === 'FORM_EVENT') {
            setFormEvents({ ...formEvents, [editingEvent.eventName]: newCode });
        }
        setEditingEvent(null);
    };

    // --- IMPORT / EXPORT ---
    const handleLoadProject = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.widgets && data.canvasSize) {
                    setWidgets(data.widgets);
                    setCanvasSize(data.canvasSize);
                    setCustomMethods(data.customMethods || []);
                    setSelectedId(null);
                }
            } catch (err) { alert("Chyba JSON."); }
        };
        reader.readAsText(file); e.target.value = '';
    };

    const handleImportSCA = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => parseSCAContent(event.target.result, setCanvasSize, setWidgets, setSelectedId, setFormEvents);
        reader.readAsText(file); e.target.value = '';
    };

    const handleExportToPython = () => {
        exportToPython(widgets, customMethods, canvasSize, downloadFile);
    };

    const saveProject = () => { const data = JSON.stringify({ canvasSize, widgets, customMethods }, null, 2); downloadFile('projekt.json', data, 'application/json'); };
    const downloadFile = (name, content, type) => { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); };

    const selectedWidget = widgets.find(w => w.id === selectedId);
    const getValidEvents = (type) => VALID_EVENTS[type] || VALID_EVENTS.DEFAULT;

    return (
        <div className="flex h-screen flex-col text-sm text-gray-800 font-sans overflow-hidden bg-gray-50">
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleLoadProject} />
            <input type="file" ref={fileInputScaRef} className="hidden" accept=".sca,.txt" onChange={handleImportSCA} />

            <CodeEditorModal isOpen={!!editingEvent} onClose={() => setEditingEvent(null)} onSave={saveCode} title={editingEvent?.type === 'CUSTOM_METHOD' ? `Metoda: ${editingEvent.name}` : `Událost: ${editingEvent?.eventName}`} subTitle={editingEvent?.type === 'CUSTOM_METHOD' ? `Def: def ${editingEvent.name}(${editingEvent.args}):` : `Obj: ${editingEvent?.name}`} initialCode={editingEvent?.code} />
            <AddMethodModal isOpen={isAddingMethod} onClose={() => setIsAddingMethod(false)} onAdd={handleAddCustomMethod} />

            {/* HEADER */}
            <div className="h-14 bg-slate-900 text-white flex items-center px-4 shadow-md justify-between z-10 shrink-0">
                <div className="flex items-center gap-2 font-bold text-xl"><Monitor className="text-yellow-400 w-6 h-6" /><span>Visual <span className="text-yellow-400 font-extrabold">FoxPro</span> Web</span></div>
                <div className="flex gap-2">
                    <button onClick={() => fileInputScaRef.current.click()} className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 px-3 py-1.5 rounded text-xs transition border border-purple-500 shadow-sm"><FileUp className="w-4 h-4" /> Import VFP</button>
                    <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 bg-orange-700 hover:bg-orange-600 px-3 py-1.5 rounded text-xs transition border border-orange-500"><FolderOpen className="w-4 h-4" /> Načíst JSON</button>
                    <button onClick={saveProject} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded text-xs transition"><Save className="w-4 h-4" /> Uložit Projekt</button>
                    <button onClick={handleExportToPython} className="flex items-center gap-2 bg-green-700 hover:bg-green-600 px-3 py-1.5 rounded text-xs transition font-bold shadow-sm border border-green-500"><Code className="w-4 h-4" /> Export Python</button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* TOOLBOX */}
                <div className="w-48 bg-gray-100 border-r border-gray-300 flex flex-col shadow-inner shrink-0 z-10">
                    <div className="p-2 bg-gray-200 font-bold border-b border-gray-300 text-xs uppercase tracking-wider text-gray-600 flex items-center gap-1"><Box className="w-3 h-3" /> Prvky</div>
                    <div className="p-2 grid grid-cols-2 gap-2 overflow-y-auto">
                        {Object.keys(WIDGET_TYPES).map(key => {
                            const wType = WIDGET_TYPES[key];
                            const TypeIcon = wType.icon;
                            return (
                                <div key={key} draggable onDragStart={(e) => handleDragStartNew(e, key)} className="flex flex-col items-center justify-center p-3 bg-white border border-gray-300 rounded hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 cursor-grab shadow-sm transition active:cursor-grabbing group">
                                    <div className="text-gray-500 group-hover:text-blue-600 mb-1"><TypeIcon size={20} className="stroke-[1.5]" /></div>
                                    <span className="text-[10px] font-semibold">{wType.label}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* CANVAS */}
                <div className="flex-1 bg-gray-500 overflow-auto relative flex justify-center p-8" onClick={() => setSelectedId(null)}>
                    <div className="bg-white shadow-2xl relative canvas-grid transition-all duration-200" style={{ width: canvasSize.width, height: canvasSize.height, minWidth: canvasSize.width, minHeight: canvasSize.height, backgroundImage: 'radial-gradient(#ccc 1px, transparent 1px)', backgroundSize: '10px 10px' }} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
                        <div className="absolute -top-6 left-0 text-white text-xs font-mono opacity-50">Form1: {canvasSize.width}x{canvasSize.height}px</div>
                        {widgets.map(w => <WidgetRenderer key={w.id} widget={w} selected={selectedId === w.id} onMouseDown={(e) => handleWidgetMouseDown(e, w.id)} onResizeMouseDown={handleResizeMouseDown} onClick={handleWidgetClick} />)}
                    </div>
                </div>

                {/* PROPERTIES */}
                <div className="w-80 bg-white border-l border-gray-300 flex flex-col z-10 shadow-xl shrink-0">
                    <div className="p-2 bg-gray-200 font-bold border-b border-gray-300 text-xs uppercase tracking-wider text-gray-600 flex justify-between items-center h-10">
                        <span>Vlastnosti</span>
                        {selectedWidget && <button onClick={deleteWidget} className="text-red-600 hover:bg-red-100 hover:text-red-700 p-1.5 rounded transition"><Trash2 size={16} /></button>}
                    </div>
                    <div className="flex-1 overflow-y-auto p-0">
                        {!selectedWidget ? (
                            <div className="p-4">
                                <div className="text-center text-gray-400 mb-6"><MousePointer className="w-12 h-12 mb-3 opacity-20 mx-auto" /><p className="font-medium text-gray-600">Formulář</p></div>

                                <div className="mb-6">
                                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2 border-b pb-1">Nastavení Formuláře</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <PropInput label="Šířka" type="number" value={canvasSize.width} onChange={(v) => setCanvasSize({ ...canvasSize, width: parseInt(v) || 0 })} />
                                        <PropInput label="Výška" type="number" value={canvasSize.height} onChange={(v) => setCanvasSize({ ...canvasSize, height: parseInt(v) || 0 })} />
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2 border-b pb-1">Události Formuláře</h4>
                                    <div className="space-y-2">
                                        {Array.from(new Set(['init', 'load', ...Object.keys(formEvents)])).map(evtName => {
                                            const hasCode = formEvents[evtName] && formEvents[evtName].trim().length > 0;
                                            return (
                                                <div key={evtName} className="flex items-center justify-between p-2 rounded border bg-gray-50 border-gray-200 hover:border-blue-300 transition group">
                                                    <span className="text-xs font-bold uppercase text-gray-600">{evtName}</span>
                                                    <button
                                                        onClick={() => openFormEventEditor(evtName)}
                                                        className={`px-3 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition ${hasCode ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700' : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-100'
                                                            }`}
                                                    >
                                                        {hasCode ? <CheckCircle2 size={10} /> : <Maximize2 size={10} />}
                                                        {hasCode ? 'Kód' : 'Edit'}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2 border-b pb-1">
                                        <h4 className="text-[10px] font-bold uppercase text-gray-500 flex items-center gap-1"><Settings size={12} /> Vlastní Metody</h4>
                                        <button onClick={() => setIsAddingMethod(true)} className="text-blue-600 hover:text-blue-800"><Plus size={16} /></button>
                                    </div>
                                    {customMethods.length === 0 && <p className="text-xs text-gray-400 italic text-center py-2">Žádné vlastní metody</p>}
                                    <div className="space-y-2">
                                        {customMethods.map(m => (
                                            <div key={m.id} className="bg-white border border-gray-200 rounded p-2 flex justify-between items-center shadow-sm">
                                                <div className="overflow-hidden">
                                                    <div className="text-xs font-bold text-gray-700 truncate">{m.name}</div>
                                                    <div className="text-[9px] text-gray-400 font-mono truncate">({m.args})</div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => openCustomMethodEditor(m.id)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Code size={14} /></button>
                                                    <button onClick={() => deleteCustomMethod(m.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 space-y-6">
                                <div className="bg-blue-50 p-3 border border-blue-200 rounded-md">
                                    <div className="text-[10px] font-bold text-blue-600 mb-1 uppercase tracking-wider">Jméno</div>
                                    <input type="text" value={selectedWidget.name} onChange={(e) => updateWidgetMeta('name', e.target.value)} className="w-full bg-white border border-blue-300 rounded px-2 py-1 font-mono text-sm" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <PropInput label="Left" type="number" value={selectedWidget.x} onChange={(v) => updateWidgetMeta('x', parseInt(v))} />
                                    <PropInput label="Top" type="number" value={selectedWidget.y} onChange={(v) => updateWidgetMeta('y', parseInt(v))} />
                                    <PropInput label="Width" type="number" value={selectedWidget.props.width} onChange={(v) => updateWidgetProp('width', parseInt(v))} />
                                    <PropInput label="Height" type="number" value={selectedWidget.props.height} onChange={(v) => updateWidgetProp('height', parseInt(v))} />
                                </div>
                                <div>
                                    <div className="flex gap-2 mb-4">
                                        <div className={`flex-1 flex items-center justify-center gap-1 p-1 rounded cursor-pointer border ${selectedWidget.props.visible !== false ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-gray-50 border-gray-300 text-gray-400'}`} onClick={() => updateWidgetProp('visible', selectedWidget.props.visible === false ? true : false)}>
                                            {selectedWidget.props.visible !== false ? <Eye size={14} /> : <EyeOff size={14} />}<span className="text-xs font-bold">Visible</span>
                                        </div>
                                        <div className={`flex-1 flex items-center justify-center gap-1 p-1 rounded cursor-pointer border ${selectedWidget.props.enabled !== false ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-300 text-gray-400'}`} onClick={() => updateWidgetProp('enabled', selectedWidget.props.enabled === false ? true : false)}>
                                            {selectedWidget.props.enabled !== false ? <Unlock size={14} /> : <Lock size={14} />}<span className="text-xs font-bold">Enabled</span>
                                        </div>
                                    </div>
                                    {selectedWidget.props.text !== undefined && <PropInput label="Text / Caption" value={selectedWidget.props.text} onChange={(v) => updateWidgetProp('text', v)} />}
                                    {selectedWidget.props.items !== undefined && <div className="mb-2"><label className="block text-[10px] font-bold text-gray-500 mb-1">Položky</label><textarea className="w-full border rounded px-2 py-1 text-sm" rows={2} value={selectedWidget.props.items} onChange={(e) => updateWidgetProp('items', e.target.value)} /></div>}
                                    {selectedWidget.props.color !== undefined && <div className="mb-2 flex justify-between"><label className="text-[10px] font-bold text-gray-500">Popředí</label><input type="color" className="w-8 h-8 border-0 p-0 rounded cursor-pointer" value={selectedWidget.props.color} onChange={(e) => updateWidgetProp('color', e.target.value)} /></div>}
                                    {selectedWidget.props.bg !== undefined && <div className="mb-2 flex justify-between"><label className="text-[10px] font-bold text-gray-500">Pozadí</label><input type="color" className="w-8 h-8 border-0 p-0 rounded cursor-pointer" value={selectedWidget.props.bg} onChange={(e) => updateWidgetProp('bg', e.target.value)} /></div>}
                                </div>

                                <div className="border-t pt-2">
                                    <h3 className="text-[10px] font-bold text-gray-500 mb-3 uppercase flex items-center gap-1"><Activity size={12} /> Události (Metody)</h3>
                                    <div className="space-y-2">
                                        {Array.from(new Set([...ALL_EVENTS_LIST, ...Object.keys(selectedWidget.events)])).map(evtName => {
                                            const validEvents = getValidEvents(selectedWidget.type);
                                            const hasCode = selectedWidget.events[evtName] && selectedWidget.events[evtName].trim().length > 0;
                                            // Enable if it's a valid standard event OR if it has custom code imported
                                            const isEnabled = validEvents.includes(evtName) || hasCode;

                                            return (
                                                <div key={evtName} className={`flex items-center justify-between p-2 rounded border transition group ${isEnabled ? 'bg-gray-50 border-gray-200 hover:border-blue-300' : 'bg-gray-100 border-gray-200 opacity-60'}`}>
                                                    <span className={`text-xs font-bold uppercase ${isEnabled ? 'text-gray-600' : 'text-gray-400'}`}>{evtName}</span>
                                                    <button
                                                        onClick={() => isEnabled && openEventEditor(evtName)}
                                                        disabled={!isEnabled}
                                                        className={`px-3 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition ${!isEnabled ? 'bg-transparent text-gray-400 cursor-not-allowed' :
                                                            hasCode ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700' : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-100'
                                                            }`}
                                                    >
                                                        {!isEnabled ? <Ban size={10} /> : hasCode ? <CheckCircle2 size={10} /> : <Maximize2 size={10} />}
                                                        {!isEnabled ? 'N/A' : hasCode ? 'Kód' : 'Edit'}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
