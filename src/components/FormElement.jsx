import React from 'react';
import { COMPONENT_TYPES } from '../data/componentRegistry';
import { CheckSquare, Image as ImageIcon } from 'lucide-react';

const FormElement = ({ element, selected, onMouseDown, onResizeMouseDown }) => {
    const { type, props } = element;

    // Style for the container
    const style = {
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        ...props.style // Apply custom styles from props
    };

    const opacity = props.visible === false ? 'opacity-40' : 'opacity-100';
    const pointerEvents = props.enabled === false ? 'pointer-events-none grayscale' : '';
    const baseClass = `w-full h-full select-none group ${selected ? 'ring-2 ring-blue-600 z-50 shadow-lg' : 'hover:ring-1 hover:ring-blue-300 hover:bg-blue-50/10'} ${opacity}`;

    let content = null;

    switch (type) {
        case COMPONENT_TYPES.LABEL:
            content = <div style={{ color: props.color || props.style?.color, fontSize: props.style?.fontSize }} className="w-full h-full flex items-center px-1 overflow-hidden whitespace-nowrap">{props.text}</div>;
            break;
        case COMPONENT_TYPES.TEXT_BOX:
            content = <div className={`w-full h-full bg-white text-black px-1 flex items-center overflow-hidden border border-gray-600 shadow-inner inset-shadow ${pointerEvents}`}>{props.text || <span className="text-gray-300 italic">{props.placeholder}</span>}</div>;
            break;
        case COMPONENT_TYPES.EDIT_BOX:
            content = <div className={`w-full h-full bg-white text-black p-1 overflow-hidden border border-gray-600 shadow-inner text-xs whitespace-pre-wrap ${pointerEvents}`}>{props.text || props.value}</div>;
            break;
        case COMPONENT_TYPES.BUTTON:
            content = <div className={`w-full h-full flex items-center justify-center text-sm border-b-2 border-r-2 border-gray-400 bg-gray-100 active:border-t-2 active:border-l-2 active:border-b-0 active:border-r-0 ${pointerEvents}`} style={{ backgroundColor: props.bg || props.style?.backgroundColor, borderTop: '1px solid white', borderLeft: '1px solid white' }}>{props.text}</div>;
            break;
        case COMPONENT_TYPES.CHECK_BOX:
            content = <div className={`w-full h-full flex items-center gap-1.5 px-1 ${pointerEvents}`}><div className={`w-4 h-4 border border-gray-600 bg-white flex items-center justify-center`}>{props.checked && <CheckSquare size={12} className="text-black" />}</div><span className="truncate">{props.label || props.text}</span></div>;
            break;
        case COMPONENT_TYPES.RADIO:
            content = <div className={`w-full h-full flex items-center gap-1.5 px-1 ${pointerEvents}`}><div className="w-4 h-4 border border-gray-600 rounded-full bg-white flex items-center justify-center">{props.checked && <div className="w-2 h-2 bg-black rounded-full"></div>}</div><span className="truncate">{props.label || props.text}</span></div>;
            break;
        case COMPONENT_TYPES.SPINNER:
            content = <div className={`w-full h-full bg-white text-black px-1 flex items-center justify-between border border-gray-600 shadow-inner ${pointerEvents}`}><span className="truncate">{props.value || props.text || 0}</span><div className="flex flex-col h-full border-l border-gray-400"><div className="h-1/2 w-4 bg-gray-200 flex items-center justify-center text-[8px]">▲</div><div className="h-1/2 w-4 bg-gray-200 flex items-center justify-center text-[8px] border-t border-gray-400">▼</div></div></div>;
            break;
        case COMPONENT_TYPES.COMBO_BOX:
            content = <div className={`w-full h-full border border-gray-500 bg-white flex items-center justify-between px-1 shadow-inner ${pointerEvents}`}><span className="truncate px-1">{props.options ? props.options[0] : ''}</span><div className="w-4 h-full bg-gray-200 border-l border-gray-400 flex items-center justify-center">▼</div></div>;
            break;
        case COMPONENT_TYPES.GRID:
            const cols = props.columns || 3;
            const colArray = typeof cols === 'number' ? Array.from({ length: cols }, (_, i) => `Col${i + 1}`) : cols.split(',');
            content = <div className={`w-full h-full border border-gray-500 bg-white flex flex-col text-xs shadow-sm ${pointerEvents}`}><div className="flex border-b border-gray-400 bg-gray-200 font-semibold text-gray-700">{colArray.map((c, i) => <div key={i} className="flex-1 border-r border-gray-300 px-2 py-1 truncate">{c}</div>)}</div><div className="flex-1 bg-white p-2"><div className="w-full h-4 bg-blue-100 mb-1 opacity-50"></div><div className="w-full h-4 bg-gray-50 mb-1 opacity-50"></div></div></div>;
            break;
        case COMPONENT_TYPES.SHAPE:
            content = <div className="w-full h-full" style={{ backgroundColor: props.bg || props.style?.backgroundColor, border: `1px solid ${props.color || '#000'}` }}></div>;
            break;
        case COMPONENT_TYPES.IMAGE:
            content = <div className="w-full h-full border border-dashed border-gray-400 bg-gray-50 flex flex-col items-center justify-center text-gray-400"><ImageIcon size={24} /><span className="text-[10px] mt-1">Obrázek</span></div>;
            break;
        case COMPONENT_TYPES.CONTAINER:
            content = <div className="w-full h-full border border-gray-400 border-dashed relative" style={{ backgroundColor: props.bg || props.style?.backgroundColor }}><div className="absolute top-0 left-0 bg-gray-200 text-[8px] px-1 text-gray-500">Container</div></div>;
            break;
        default:
            content = <div>Unknown: {type}</div>;
    }

    const handles = [
        { dir: 'n', cursor: 'ns-resize', style: { top: -3, left: '50%', marginLeft: -3 } },
        { dir: 's', cursor: 'ns-resize', style: { bottom: -3, left: '50%', marginLeft: -3 } },
        { dir: 'e', cursor: 'ew-resize', style: { right: -3, top: '50%', marginTop: -3 } },
        { dir: 'w', cursor: 'ew-resize', style: { left: -3, top: '50%', marginTop: -3 } },
        { dir: 'ne', cursor: 'nesw-resize', style: { top: -3, right: -3 } },
        { dir: 'nw', cursor: 'nwse-resize', style: { top: -3, left: -3 } },
        { dir: 'se', cursor: 'nwse-resize', style: { bottom: -3, right: -3 } },
        { dir: 'sw', cursor: 'nesw-resize', style: { bottom: -3, left: -3 } }
    ];

    return (
        <div className={baseClass} onMouseDown={onMouseDown}>
            {content}
            {selected && handles.map(h => (
                <div
                    key={h.dir}
                    className="absolute w-2 h-2 bg-blue-500 border border-white z-50"
                    style={{ ...h.style, cursor: h.cursor }}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        if (onResizeMouseDown) onResizeMouseDown(e, element.id, h.dir);
                    }}
                />
            ))}
            {props.visible === false && <div className="absolute top-0 right-0 bg-red-500 text-white text-[8px] px-1">HIDDEN</div>}
        </div>
    );
};

export default FormElement;
