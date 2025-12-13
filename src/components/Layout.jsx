import React, { useState, useRef, useEffect } from 'react';
import WidgetToolbar from './WidgetToolbar';
import Canvas from './Canvas';
import ContextMenu from './ContextMenu';
import CodeEditorModal from './modals/CodeEditorModal';
import AddMethodModal from './modals/AddMethodModal';
import TopBar from './TopBar';
import PropertiesPanel from './PropertiesPanel';
import SettingsPanel from './SettingsPanel';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../hooks/useSettings';

// Hooks
import { useFormState } from '../hooks/useFormState';
import { useClipboard } from '../hooks/useClipboard';
import { useProjectIO } from '../hooks/useProjectIO';
import { useCanvasInteraction } from '../hooks/useCanvasInteraction';
import { reparentElements } from '../utils/elementUtils';
import { componentRegistry } from '../data/componentRegistry';
import { RotateCcw } from 'lucide-react';

/**
 * Main Layout component for the Visual Form Builder.
 * 
 * This component acts as the central controller for the application, managing:
 * - Application state (widgets, selection, tools)
 * - Canvas rendering and interaction
 * - Clipboard operations (Copy/Cut/Paste)
 * - File I/O (Load/Save/Import/Export)
 * - Drag and drop logic (Moving, Resizing, Reparenting)
 * 
 * @component
 */
const Layout = () => {
    const { t } = useLanguage();
    const { getSetting, setSetting } = useSettings();

    // UI State
    const [activeTool, setActiveTool] = useState(null);
    const [isToolLocked, setIsToolLocked] = useState(false);
    const [gridSize, setGridSize] = useState(10);
    const [showGrid, setShowGrid] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [scaCharset, setScaCharset] = useState('windows-1250');
    const [sprCharset, setSprCharset] = useState('cp895');
    const [exportFramework, setExportFramework] = useState('tkinter');
    const [runAfterExport, setRunAfterExport] = useState(false);
    const [activeModal, setActiveModal] = useState(null);
    const [editingCode, setEditingCode] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);

    // 1. Form State
    const {
        formElements, setFormElements,
        selectedIds, setSelectedIds,
        formName, setFormName,
        canvasSize, setCanvasSize,
        customMethods, setCustomMethods,
        formEvents, setFormEvents,
        updateWidgetProp, updateWidgetStyle,
        handleDelete, handleSelectAll,
        formProps, setFormProps, updateFormProp,
        handleAlign, handleZOrder,
        undo, redo, canUndo, canRedo
    } = useFormState();

    // 2. Project I/O
    const {
        fileInputRef, fileInputScaRef, fileInputSprRef,
        handleLoadProject, handleImportSCA, handleImportSPR,
        handleExportToPython, saveProject, handleNewProject
    } = useProjectIO({
        formElements, setFormElements,
        setFormEvents, formEvents,
        setFormName, formName,
        setCanvasSize, canvasSize,
        setCustomMethods, customMethods,
        setSelectedIds,
        scaCharset, sprCharset,
        exportFramework,
        formProps, setFormProps,
        formProps, setFormProps,
        runAfterExport
    });

    // 3. Clipboard
    const { copyToClipboard, cutToClipboard, pasteFromClipboard } = useClipboard({
        formElements, setFormElements,
        selectedIds, setSelectedIds,
        formEvents, setFormEvents
    });

    // 4. Canvas Interaction
    const {
        selectionBox, drawingRect, canvasRef,
        handleWidgetClick, handleCanvasMouseDown, handleCanvasClick,
        handleInteractionStart, handleMove
    } = useCanvasInteraction({
        formElements, setFormElements,
        selectedIds, setSelectedIds,
        activeTool, setActiveTool,
        isToolLocked,
        gridSize, showGrid
    });

    // Refs for Keyboard Shortcuts
    const saveProjectRef = useRef(saveProject);
    saveProjectRef.current = saveProject;
    const handleNewProjectRef = useRef(handleNewProject);
    handleNewProjectRef.current = handleNewProject;

    useKeyboardShortcuts({
        activeModal,
        selectedIds,
        formElements,
        gridSize,
        onCopy: copyToClipboard,
        onPaste: pasteFromClipboard,
        onCut: cutToClipboard,
        onDelete: handleDelete,
        onMove: handleMove,
        onSave: saveProject,
        onLoad: () => fileInputRef.current.click(),
        onNew: handleNewProject,
        onSelectAll: handleSelectAll,
        fileInputRef,
        saveProjectRef,
        handleNewProjectRef
    });

    // Load settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            const savedGridSize = await getSetting('gridSize', 10);
            setGridSize(savedGridSize);

            const savedShowGrid = await getSetting('showGrid', true);
            setShowGrid(savedShowGrid);

            const savedScaCharset = await getSetting('scaCharset', 'windows-1250');
            setScaCharset(savedScaCharset);

            const savedSprCharset = await getSetting('sprCharset', 'cp895');
            setSprCharset(savedSprCharset);

            const savedExportFramework = await getSetting('exportFramework', 'tkinter');
            setExportFramework(savedExportFramework);

            const savedRunAfterExport = await getSetting('runAfterExport', false);
            setRunAfterExport(savedRunAfterExport);
        };
        loadSettings();
    }, []);

    // Settings Handlers with Persistence
    const handleGridSizeChange = (size) => {
        setGridSize(size);
        setSetting('gridSize', size);
    };

    const handleShowGridChange = (show) => {
        setShowGrid(show);
        setSetting('showGrid', show);
    };

    const handleScaCharsetChange = (charset) => {
        setScaCharset(charset);
        setSetting('scaCharset', charset);
    };

    const handleSprCharsetChange = (charset) => {
        setSprCharset(charset);
        setSetting('sprCharset', charset);
    };

    const handleExportFrameworkChange = (framework) => {
        setExportFramework(framework);
        setSetting('exportFramework', framework);
    };

    const handleRunAfterExportChange = (run) => {
        setRunAfterExport(run);
        setSetting('runAfterExport', run);
    };

    // Tool Handlers
    const handleToolSelect = (tool) => {
        if (activeTool === tool) {
            setActiveTool(null);
            setIsToolLocked(false);
        } else {
            setActiveTool(tool);
            setIsToolLocked(false);
        }
    };

    const handleToolLock = (tool) => {
        setActiveTool(tool);
        setIsToolLocked(true);
    };

    // Modal Handlers
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
        if (confirm(t('msg.confirm_delete_method', { name }))) {
            setCustomMethods(methods => methods.filter(m => m.name !== name));
        }
    };

    // Image Handler (still local ref)
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

    // Helper for PropertiesPanel to get selected element data
    const getSelectedElementData = () => {
        const selectedWidgets = formElements.filter(el => selectedIds.includes(el.id));
        if (selectedWidgets.length === 0) return null;

        const first = selectedWidgets[0];
        const isMulti = selectedWidgets.length > 1;

        if (!isMulti) return first;

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

    const handleResetWidget = () => {
        if (selectedIds.length === 0) return;

        setFormElements(prev => prev.map(el => {
            if (!selectedIds.includes(el.id)) return el;

            const defaults = componentRegistry.find(c => c.type === el.type)?.defaultProps;
            if (!defaults) return el;

            // Preserve mandatory props and ID
            const newProps = {
                ...defaults,
                name: el.props.name // Keep existing name
            };

            return {
                ...el,
                props: newProps
            };
        }));
    };

    // Widget specific context menu (handles selection)
    const handleWidgetContextMenu = (e, widgetId) => {
        e.preventDefault();
        e.stopPropagation();

        let currentSelection = selectedIds;
        if (!selectedIds.includes(widgetId)) {
            setSelectedIds([widgetId]);
            currentSelection = [widgetId];
        }

        const options = [];
        options.push({ label: t('btn.copy') || 'Kopírovat', action: copyToClipboard, shortcut: 'Ctrl+C' });
        options.push({ label: t('btn.cut') || 'Vyjmout', action: cutToClipboard, shortcut: 'Ctrl+X' });
        options.push({ label: t('btn.delete') || 'Smazat', action: handleDelete, shortcut: 'Delete' });
        options.push({ type: 'separator' });
        options.push({
            label: t('btn.reset_widget') || 'Reset Widget',
            action: handleResetWidget,
            icon: <RotateCcw size={14} />
        });

        setContextMenu({ x: e.clientX, y: e.clientY, options });
    };

    // Context Menu Handler
    const handleContextMenu = (e) => {
        e.preventDefault();

        const options = [];
        const hasSelection = selectedIds.length > 0;

        // Basic Clipboard Actions
        if (hasSelection) {
            options.push({ label: t('btn.copy') || 'Kopírovat', action: copyToClipboard, shortcut: 'Ctrl+C' });
            options.push({ label: t('btn.cut') || 'Vyjmout', action: cutToClipboard, shortcut: 'Ctrl+X' });
            options.push({ label: t('btn.delete') || 'Smazat', action: handleDelete, shortcut: 'Delete' });
            options.push({ type: 'separator' });
            options.push({
                label: t('btn.reset_widget') || 'Reset Widget',
                action: handleResetWidget,
                icon: <RotateCcw size={14} />
            });
        }
    };

    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden" onContextMenu={handleContextMenu}>
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
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    options={contextMenu.options}
                    onClose={() => setContextMenu(null)}
                />
            )}
            <TopBar
                onNew={handleNewProject}
                onLoad={() => fileInputRef.current.click()}
                onSave={saveProject}
                onImportSCA={() => fileInputScaRef.current.click()}
                onImportSPR={() => fileInputSprRef.current.click()}
                onExportPython={handleExportToPython}
                onToggleSettings={() => setShowSettings(!showSettings)}
                showSettings={showSettings}
            />

            {/* Settings Panel */}
            {
                <SettingsPanel
                    show={showSettings}
                    gridSize={gridSize}
                    onGridSizeChange={handleGridSizeChange}
                    showGrid={showGrid}
                    onShowGridChange={handleShowGridChange}
                    scaCharset={scaCharset}
                    onScaCharsetChange={handleScaCharsetChange}
                    sprCharset={sprCharset}
                    onSprCharsetChange={handleSprCharsetChange}
                    exportFramework={exportFramework}
                    onExportFrameworkChange={handleExportFrameworkChange}
                    runAfterExport={runAfterExport}
                    onRunAfterExportChange={handleRunAfterExportChange}
                />
            }

            <div className="flex-1 flex relative overflow-hidden">
                <WidgetToolbar
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
                    formProps={formProps}
                    onAlign={handleAlign}
                    onZOrder={handleZOrder}
                    onCopy={copyToClipboard}
                    onPaste={pasteFromClipboard}
                    hasSelection={selectedIds.length > 0}
                    onUndo={undo}
                    onRedo={redo}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onWidgetContextMenu={handleWidgetContextMenu}
                />
                <PropertiesPanel
                    selectedElement={selectedElement}
                    selectedIds={selectedIds}
                    onUpdateProp={updateWidgetProp}
                    onUpdateStyle={updateWidgetStyle}
                    onReparent={(ids, changes) => {
                        setFormElements(prev => {
                            const updated = prev.map(el => ids.includes(el.id) ? { ...el, ...changes } : el);
                            return reparentElements(updated, ids);
                        });
                    }}
                    formName={formName}
                    onFormNameChange={setFormName}
                    canvasSize={canvasSize}
                    onCanvasSizeChange={setCanvasSize}
                    formEvents={formEvents}
                    onEditEvent={handleEditEvent}
                    customMethods={customMethods}
                    onAddMethod={() => setActiveModal('addMethod')}
                    onEditMethod={handleEditMethod}
                    onDeleteMethod={handleDeleteMethod}
                    onImageSelect={() => imageInputRef.current.click()}
                    formProps={formProps}
                    onUpdateFormProp={updateFormProp}
                />
            </div>
        </div>
    );
};

export default Layout;
