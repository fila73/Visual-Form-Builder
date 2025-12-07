import React, { useState } from 'react'; // Force reload

import { Zap, Plus, Edit, Trash2, RotateCcw } from 'lucide-react';
import PropInput from './PropInput';
import PropertyGroup from './PropertyGroup';
import ContextMenu from './ContextMenu';
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
    const [propContextMenu, setPropContextMenu] = useState(null);

    const handlePropContextMenu = (e, propName, isStyle = false) => {
        e.preventDefault();
        e.stopPropagation();

        setPropContextMenu({
            x: e.clientX,
            y: e.clientY,
            options: [
                {
                    label: t('btn.reset') || 'Reset',
                    action: () => {
                        if (isStyle) onUpdateStyle(propName, undefined); // or null
                        else onUpdateProp(propName, undefined);
                    },
                    icon: <RotateCcw size={14} />
                }
            ]
        });
    };

    // Helper to render property input with visual state
    const renderProp = (label, value, onChange, propName, isStyle = false) => {
        const isSet = value !== undefined && value !== null && value !== '';

        return (
            <div onContextMenu={(e) => handlePropContextMenu(e, propName, isStyle)} className="relative group">
                <PropInput
                    label={label}
                    value={isSet ? value : `(${t('val.default') || 'Default'})`}
                    onChange={onChange}
                    className={!isSet ? 'text-gray-400 italic' : ''}
                />
                {isSet && (
                    <div className="absolute right-0 top-0 bottom-0 flex items-center pr-8 pointer-events-none">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    </div>
                )}
            </div>
        );
    };

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
                        {renderProp(t('prop.x'), selectedElement.x, (v) => {
                            const val = parseInt(v);
                            if (!isNaN(val)) onReparent(selectedIds, { x: val });
                        }, 'x')}
                        {renderProp(t('prop.y'), selectedElement.y, (v) => {
                            const val = parseInt(v);
                            if (!isNaN(val)) onReparent(selectedIds, { y: val });
                        }, 'y')}
                        {renderProp(t('prop.width'), selectedElement.props.width, (v) => onUpdateProp('width', parseInt(v) || 0), 'width')}
                        {renderProp(t('prop.height'), selectedElement.props.height, (v) => onUpdateProp('height', parseInt(v) || 0), 'height')}
                    </div>
                </PropertyGroup>

                {/* --- DATA GROUP --- */}
                <PropertyGroup title={t('prop.data')}>
                    {selectedElement.props.text !== undefined && renderProp(t('prop.text'), selectedElement.props.text, (v) => onUpdateProp('text', v), 'text')}
                    {selectedElement.props.value !== undefined && renderProp(t('prop.value'), selectedElement.props.value, (v) => onUpdateProp('value', v), 'value')}
                    {selectedElement.props.caption !== undefined && renderProp(t('prop.caption'), selectedElement.props.caption, (v) => onUpdateProp('caption', v), 'caption')}
                    {selectedElement.props.label !== undefined && renderProp(t('prop.label'), selectedElement.props.label, (v) => onUpdateProp('label', v), 'label')}

                    {/* Options (ComboBox, OptionGroup) */}
                    {(selectedElement.type === 'combobox' || selectedElement.type === 'optiongroup') && (
                        <div className="mb-4 border border-gray-200 rounded p-2 bg-gray-50">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-[10px] font-bold text-gray-500 uppercase">{t('prop.options')}</div>
                                <button
                                    onClick={() => {
                                        const currentOpts = Array.isArray(selectedElement.props.options) ? selectedElement.props.options : [];
                                        if (selectedElement.type === 'optiongroup') {
                                            onUpdateProp('options', [...currentOpts, { caption: `Option ${currentOpts.length + 1}`, value: currentOpts.length + 1 }]);
                                        } else {
                                            onUpdateProp('options', [...currentOpts, `Option ${currentOpts.length + 1}`]);
                                        }
                                    }}
                                    className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                                >
                                    <Plus size={12} />
                                </button>
                            </div>
                            <div className="space-y-1">
                                {(Array.isArray(selectedElement.props.options) ? selectedElement.props.options : []).map((opt, idx) => {
                                    // Handle both string and object options
                                    const isObj = typeof opt === 'object' && opt !== null;
                                    const val = isObj ? (opt.caption || '') : opt;
                                    const itemValue = isObj ? opt.value : undefined;

                                    return (
                                        <div key={idx} className="flex flex-col gap-1 mb-1 border-b border-gray-200 pb-1 last:border-0">
                                            <div className="flex gap-1">
                                                <input
                                                    className="flex-1 border rounded px-1 text-sm py-0.5"
                                                    placeholder="Caption"
                                                    value={val}
                                                    onChange={(e) => {
                                                        const newOpts = [...selectedElement.props.options];
                                                        if (isObj) {
                                                            newOpts[idx] = { ...newOpts[idx], caption: e.target.value };
                                                        } else {
                                                            newOpts[idx] = e.target.value;
                                                        }
                                                        onUpdateProp('options', newOpts);
                                                    }}
                                                />
                                                <button
                                                    onClick={() => {
                                                        const newOpts = [...selectedElement.props.options];
                                                        newOpts.splice(idx, 1);
                                                        onUpdateProp('options', newOpts);
                                                    }}
                                                    className="text-red-500 hover:text-red-700 px-1"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                            {selectedElement.type === 'optiongroup' && isObj && (
                                                <div className="flex items-center gap-1 pl-1">
                                                    <span className="text-[10px] text-gray-400 w-8">Val:</span>
                                                    <input
                                                        className="flex-1 border rounded px-1 text-xs py-0.5 bg-gray-50"
                                                        placeholder="Value"
                                                        value={itemValue !== undefined ? itemValue : ''}
                                                        onChange={(e) => {
                                                            const newOpts = [...selectedElement.props.options];
                                                            // Keep as string or number? Usually number if inputs number.
                                                            // But let's allow string values too.
                                                            // Try parse int, if NaN use string
                                                            let v = e.target.value;
                                                            const i = parseInt(v);
                                                            if (!isNaN(i) && String(i) === v) v = i;

                                                            newOpts[idx] = { ...newOpts[idx], value: v };
                                                            onUpdateProp('options', newOpts);
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {(!Array.isArray(selectedElement.props.options) || selectedElement.props.options.length === 0) && (
                                    <div className="text-center text-gray-400 italic py-2 text-xs">{t('prop.no_options')}</div>
                                )}
                            </div>
                        </div>
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


                    <div className="mb-2" onContextMenu={(e) => handlePropContextMenu(e, 'color', true)}>
                        <label className="text-[10px] font-bold text-gray-500 uppercase w-full block mb-1">{t('prop.color')}</label>
                        <div className="flex gap-1 relative group">
                            <input
                                type="color"
                                value={selectedElement.props.style?.color || '#000000'}
                                onChange={(e) => onUpdateStyle('color', e.target.value)}
                                className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                            />
                            <input
                                type="text"
                                value={selectedElement.props.style?.color || ''}
                                placeholder={t('val.default') || 'Default'}
                                onChange={(e) => onUpdateStyle('color', e.target.value)}
                                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                            />
                            {selectedElement.props.style?.color && (
                                <div className="absolute right-2 top-2 w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                            )}
                        </div>
                    </div>


                    <div className="mb-2" onContextMenu={(e) => handlePropContextMenu(e, 'backgroundColor', true)}>
                        <label className="text-[10px] font-bold text-gray-500 uppercase w-full block mb-1">{t('prop.back_color')}</label>
                        <div className="flex gap-1 relative group">
                            <input
                                type="color"
                                value={selectedElement.props.style?.backgroundColor || '#ffffff'}
                                onChange={(e) => onUpdateStyle('backgroundColor', e.target.value)}
                                className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                            />
                            <input
                                type="text"
                                value={selectedElement.props.style?.backgroundColor || ''}
                                placeholder={t('val.default') || 'Default'}
                                onChange={(e) => onUpdateStyle('backgroundColor', e.target.value)}
                                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                            />
                            {selectedElement.props.style?.backgroundColor && (
                                <div className="absolute right-2 top-2 w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                            )}
                        </div>
                    </div>

                    <div onContextMenu={(e) => handlePropContextMenu(e, 'fontSize', true)}>
                        <PropInput
                            label={t('prop.font_size')}
                            value={selectedElement.props.style?.fontSize || ''}
                            placeholder={t('val.default') || 'Default'}
                            onChange={(v) => onUpdateStyle('fontSize', v)}
                        />
                    </div>

                    {selectedElement.type === 'image' && (
                        <>
                            <PropInput label={t('prop.stretch')} value={selectedElement.props.stretch || false} onChange={(v) => onUpdateProp('stretch', v)} />
                            <PropInput label={t('prop.repeat')} value={selectedElement.props.repeat || false} onChange={(v) => onUpdateProp('repeat', v)} />
                        </>
                    )}
                </PropertyGroup>

                {/* --- BEHAVIOR GROUP --- */}
                <PropertyGroup title={t('prop.behavior')}>
                    {renderProp(t('prop.name'), selectedElement.props.name || '', (v) => onUpdateProp('name', v), 'name')}
                    {renderProp(t('prop.enabled'), selectedElement.props.enabled !== false, (v) => onUpdateProp('enabled', v === 'true' || v === true), 'enabled')}

                    {selectedElement.type === 'button' && (
                        <>
                            {renderProp(t('prop.default'), selectedElement.props.default || false, (v) => onUpdateProp('default', v === 'true' || v === true), 'default')}
                            {renderProp(t('prop.cancel'), selectedElement.props.cancel || false, (v) => onUpdateProp('cancel', v === 'true' || v === true), 'cancel')}
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
            {propContextMenu && (
                <ContextMenu
                    x={propContextMenu.x}
                    y={propContextMenu.y}
                    options={propContextMenu.options}
                    onClose={() => setPropContextMenu(null)}
                />
            )}
        </aside>
    );
};

export default PropertiesPanel;
