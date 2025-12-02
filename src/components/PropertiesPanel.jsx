import React from 'react';
import { Zap, Plus, Edit, Trash2 } from 'lucide-react';
import PropInput from './PropInput';
import PropertyGroup from './PropertyGroup';
import { useLanguage } from '../contexts/LanguageContext';

const PropertiesPanel = ({
    selectedElement,
    selectedIds,
    onUpdateProp,
    onUpdateStyle,
    onReparent,
    formName,
    onFormNameChange,
    canvasSize,
    onCanvasSizeChange,
    formEvents,
    onEditEvent,
    customMethods,
    onAddMethod,
    onEditMethod,
    onDeleteMethod,
    onImageSelect,
    formProps,
    onUpdateFormProp
}) => {
    const { t } = useLanguage();

    const renderWidgetProperties = () => {
        if (!selectedElement) return null;

        return (
            <>
                <div className="text-center mb-6 px-4 pt-4">
                    <div className="font-bold text-lg text-gray-800">{selectedElement.type}</div>
                    <div className="text-xs text-gray-500">{selectedElement.id}</div>
                </div>

                {/* --- LAYOUT GROUP --- */}
                <PropertyGroup title={t('prop.dimensions_position')}>
                    <div className="grid grid-cols-2 gap-2">
                        <PropInput label={t('prop.x')} value={selectedElement.x} onChange={(v) => {
                            const val = parseInt(v);
                            if (!isNaN(val)) onReparent(selectedIds, { x: val });
                        }} />
                        <PropInput label={t('prop.y')} value={selectedElement.y} onChange={(v) => {
                            const val = parseInt(v);
                            if (!isNaN(val)) onReparent(selectedIds, { y: val });
                        }} />
                        <PropInput label={t('prop.width')} value={selectedElement.props.width} onChange={(v) => onUpdateProp('width', parseInt(v) || 0)} />
                        <PropInput label={t('prop.height')} value={selectedElement.props.height} onChange={(v) => onUpdateProp('height', parseInt(v) || 0)} />
                    </div>
                </PropertyGroup>

                {/* --- DATA GROUP --- */}
                <PropertyGroup title={t('prop.data')}>
                    {selectedElement.props.text !== undefined && (
                        <PropInput label={t('prop.text')} value={selectedElement.props.text} onChange={(v) => onUpdateProp('text', v)} />
                    )}
                    {selectedElement.props.value !== undefined && (
                        <PropInput label={t('prop.value')} value={selectedElement.props.value} onChange={(v) => onUpdateProp('value', v)} />
                    )}
                    {selectedElement.props.caption !== undefined && (
                        <PropInput label={t('prop.caption')} value={selectedElement.props.caption} onChange={(v) => onUpdateProp('caption', v)} />
                    )}
                    {selectedElement.props.label !== undefined && (
                        <PropInput label={t('prop.label')} value={selectedElement.props.label} onChange={(v) => onUpdateProp('label', v)} />
                    )}

                    {/* Image Source */}
                    {selectedElement.type === 'image' && (
                        <div className="mb-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase w-full block mb-1">{t('prop.src')}</label>
                            <div className="flex gap-1">
                                <input
                                    type="text"
                                    value={selectedElement.props.src || ''}
                                    onChange={(e) => onUpdateProp('src', e.target.value)}
                                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                                />
                                <button
                                    onClick={onImageSelect}
                                    className="px-3 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 rounded text-xs font-bold text-gray-600"
                                    title={t('prop.select_file')}
                                >
                                    ...
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Grid Columns */}
                    {selectedElement.type === 'grid' && (
                        <div className="mb-4 border border-gray-200 rounded p-2 bg-gray-50">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-[10px] font-bold text-gray-500 uppercase">{t('prop.columns')}</div>
                                <button
                                    onClick={() => {
                                        const currentCols = Array.isArray(selectedElement.props.columns) ? selectedElement.props.columns : [];
                                        const newCol = { header: 'New Col', field: '', width: 100 };
                                        onUpdateProp('columns', [...currentCols, newCol]);
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
                                                    onUpdateProp('columns', newCols);
                                                }}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 gap-1">
                                            <div className="flex items-center gap-1">
                                                <span className="w-10 text-gray-500">{t('prop.column_header')}</span>
                                                <input
                                                    className="flex-1 border rounded px-1"
                                                    value={col.header || ''}
                                                    onChange={(e) => {
                                                        const newCols = [...selectedElement.props.columns];
                                                        newCols[idx] = { ...newCols[idx], header: e.target.value };
                                                        onUpdateProp('columns', newCols);
                                                    }}
                                                />
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="w-10 text-gray-500">{t('prop.column_field')}</span>
                                                <input
                                                    className="flex-1 border rounded px-1"
                                                    value={col.field || ''}
                                                    onChange={(e) => {
                                                        const newCols = [...selectedElement.props.columns];
                                                        newCols[idx] = { ...newCols[idx], field: e.target.value };
                                                        onUpdateProp('columns', newCols);
                                                    }}
                                                />
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="w-10 text-gray-500">{t('prop.column_width')}</span>
                                                <input
                                                    type="number"
                                                    className="flex-1 border rounded px-1"
                                                    value={col.width || 100}
                                                    onChange={(e) => {
                                                        const newCols = [...selectedElement.props.columns];
                                                        newCols[idx] = { ...newCols[idx], width: parseInt(e.target.value) || 100 };
                                                        onUpdateProp('columns', newCols);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!Array.isArray(selectedElement.props.columns) || selectedElement.props.columns.length === 0) && (
                                    <div className="text-center text-gray-400 italic py-2">{t('prop.no_columns')}</div>
                                )}
                            </div>
                        </div>
                    )}
                </PropertyGroup>

                {/* --- APPEARANCE GROUP --- */}
                <PropertyGroup title={t('prop.appearance')}>
                    <PropInput label={t('prop.visible')} value={selectedElement.props.visible !== false} onChange={(v) => onUpdateProp('visible', v === 'true' || v === true)} />

                    <div className="mb-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase w-full block mb-1">{t('prop.color')}</label>
                        <div className="flex gap-1">
                            <input
                                type="color"
                                value={selectedElement.props.style?.color || '#000000'}
                                onChange={(e) => onUpdateStyle('color', e.target.value)}
                                className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                            />
                            <input
                                type="text"
                                value={selectedElement.props.style?.color || '#000000'}
                                onChange={(e) => onUpdateStyle('color', e.target.value)}
                                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="mb-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase w-full block mb-1">{t('prop.back_color')}</label>
                        <div className="flex gap-1">
                            <input
                                type="color"
                                value={selectedElement.props.style?.backgroundColor || '#ffffff'}
                                onChange={(e) => onUpdateStyle('backgroundColor', e.target.value)}
                                className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                            />
                            <input
                                type="text"
                                value={selectedElement.props.style?.backgroundColor || '#ffffff'}
                                onChange={(e) => onUpdateStyle('backgroundColor', e.target.value)}
                                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <PropInput
                        label={t('prop.font_size')}
                        value={selectedElement.props.style?.fontSize || '14px'}
                        onChange={(v) => onUpdateStyle('fontSize', v)}
                    />

                    {selectedElement.type === 'image' && (
                        <>
                            <PropInput label={t('prop.stretch')} value={selectedElement.props.stretch || false} onChange={(v) => onUpdateProp('stretch', v)} />
                            <PropInput label={t('prop.repeat')} value={selectedElement.props.repeat || false} onChange={(v) => onUpdateProp('repeat', v)} />
                        </>
                    )}
                </PropertyGroup>

                {/* --- BEHAVIOR GROUP --- */}
                <PropertyGroup title={t('prop.behavior')}>
                    <PropInput label={t('prop.name')} value={selectedElement.props.name || ''} onChange={(v) => onUpdateProp('name', v)} />
                    <PropInput label={t('prop.enabled')} value={selectedElement.props.enabled !== false} onChange={(v) => onUpdateProp('enabled', v === 'true' || v === true)} />

                    {selectedElement.type === 'button' && (
                        <>
                            <PropInput label={t('prop.default')} value={selectedElement.props.default || false} onChange={(v) => onUpdateProp('default', v === 'true' || v === true)} />
                            <PropInput label={t('prop.cancel')} value={selectedElement.props.cancel || false} onChange={(v) => onUpdateProp('cancel', v === 'true' || v === true)} />
                        </>
                    )}

                    {['button', 'checkbox', 'radio'].includes(selectedElement.type) && (
                        <PropInput label={t('prop.hotkey')} value={selectedElement.props.hotkey || ''} onChange={(v) => onUpdateProp('hotkey', v)} />
                    )}
                </PropertyGroup>

                {/* --- EVENTS GROUP --- */}
                {!selectedElement.isMulti && (
                    <PropertyGroup title={t('prop.events')}>
                        <div className="space-y-1">
                            {(() => {
                                const standardEvents = ['Click', 'RightClick', 'GotFocus', 'LostFocus', 'InteractiveChange', 'Init', 'Destroy'];
                                // Find all events for this widget in formEvents
                                const widgetEvents = Object.keys(formEvents)
                                    .filter(key => key.startsWith(`${selectedElement.id}_`))
                                    .map(key => key.replace(`${selectedElement.id}_`, ''));

                                // Combine and deduplicate
                                const allEvents = [...new Set([...standardEvents, ...widgetEvents])];

                                return allEvents.map(evt => (
                                    <button
                                        key={evt}
                                        onClick={() => onEditEvent(evt)}
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
                    </PropertyGroup>
                )}
            </>
        );
    };

    const renderFormProperties = () => {
        return (
            <>
                <div className="text-center mt-10 mb-6 px-4">
                    <div className="font-medium text-gray-600">{t('prop.form')}</div>
                </div>

                <PropertyGroup title={t('prop.form_settings')}>
                    <div className="mb-2">
                        <PropInput label={t('prop.name')} value={formName} onChange={onFormNameChange} />
                        <PropInput label={t('prop.caption')} value={formProps?.caption || ''} onChange={(v) => onUpdateFormProp('caption', v)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <PropInput label={t('prop.width')} value={canvasSize.width} onChange={(v) => onCanvasSizeChange({ ...canvasSize, width: parseInt(v) || 800 })} />
                        <PropInput label={t('prop.height')} value={canvasSize.height} onChange={(v) => onCanvasSizeChange({ ...canvasSize, height: parseInt(v) || 600 })} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <PropInput label={t('prop.x')} value={formProps?.x || ''} onChange={(v) => onUpdateFormProp('x', v)} />
                        <PropInput label={t('prop.y')} value={formProps?.y || ''} onChange={(v) => onUpdateFormProp('y', v)} />
                    </div>
                    <div className="mb-4">
                        <PropInput label={t('prop.min_button')} value={formProps?.minButton !== false} onChange={(v) => onUpdateFormProp('minButton', v === 'true' || v === true)} />
                        <PropInput label={t('prop.max_button')} value={formProps?.maxButton !== false} onChange={(v) => onUpdateFormProp('maxButton', v === 'true' || v === true)} />
                        <PropInput label={t('prop.closable')} value={formProps?.closable !== false} onChange={(v) => onUpdateFormProp('closable', v === 'true' || v === true)} />
                        <PropInput label={t('prop.movable')} value={formProps?.movable !== false} onChange={(v) => onUpdateFormProp('movable', v === 'true' || v === true)} />
                    </div>
                </PropertyGroup>

                <PropertyGroup title={t('prop.form_events')}>
                    <div className="space-y-1">
                        {['Load', 'Unload', 'Init', 'Destroy', 'Click'].map(evt => (
                            <button
                                key={evt}
                                onClick={() => onEditEvent(evt)}
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
                </PropertyGroup>

                <PropertyGroup title={t('prop.custom_methods')}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-bold text-gray-500 uppercase">{t('prop.custom_methods')}</div>
                        <button onClick={onAddMethod} className="p-1 hover:bg-gray-200 rounded text-blue-600">
                            <Plus size={14} />
                        </button>
                    </div>
                    <div className="space-y-1">
                        {customMethods.length === 0 && <div className="text-xs text-gray-400 italic text-center py-2">{t('prop.no_methods')}</div>}
                        {customMethods.map(m => (
                            <div key={m.name} className="flex items-center justify-between px-2 py-1 text-sm border border-gray-300 rounded bg-white">
                                <span className="font-mono text-xs">{m.name}({m.args})</span>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => onEditMethod(m)} className="p-1 hover:bg-gray-100 rounded text-blue-600"><Edit size={12} /></button>
                                    <button onClick={() => onDeleteMethod(m.name)} className="p-1 hover:bg-gray-100 rounded text-red-600"><Trash2 size={12} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </PropertyGroup>
            </>
        );
    };

    return (
        <aside className="w-80 bg-white border-l border-gray-200 flex flex-col z-20 overflow-hidden">
            <div className="p-4 border-b border-gray-200 font-bold text-gray-700 bg-gray-50">
                {t('prop.properties')}
            </div>
            <div className="flex-1 overflow-y-auto">
                {selectedElement ? renderWidgetProperties() : renderFormProperties()}
            </div>
        </aside>
    );
};

export default PropertiesPanel;
