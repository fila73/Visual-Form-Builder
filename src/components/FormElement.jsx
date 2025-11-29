import React from 'react';
import { WIDGET_REGISTRY } from './widgets';

/**
 * Renders a single form element (widget) on the canvas.
 * 
 * Handles rendering of different component types (Label, Button, TextBox, etc.)
 * by delegating to specific widget components from the registry.
 * Manages selection/resize handles and common wrapper styles.
 * 
 * @component
 * @param {Object} props
 * @param {Object} props.element - The widget data object
 * @param {boolean} props.selected - Whether the widget is currently selected
 * @param {Function} props.onMouseDown - Handler for mouse down event (selection/dragging)
 * @param {Function} props.onResizeMouseDown - Handler for resize handle interaction
 * @param {React.ReactNode} props.children - Child elements (for Container type)
 */
const FormElement = ({ element, selected, onMouseDown, onResizeMouseDown, children }) => {
    const { type, props } = element;

    // Style for the container
    const style = {
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        ...props.style // Apply custom styles from props
    };

    const isDisabled = props.enabled === false || props.disabled === true;
    const opacity = props.visible === false ? 'opacity-40' : 'opacity-100';
    const pointerEvents = isDisabled ? 'pointer-events-none grayscale' : '';
    const baseClass = `w-full h-full select-none group ${selected ? 'ring-2 ring-blue-600 z-50 shadow-lg' : 'hover:ring-1 hover:ring-blue-300 hover:bg-blue-50/10'} ${opacity}`;

    const WidgetComponent = WIDGET_REGISTRY[type];

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
            {WidgetComponent ? (
                <WidgetComponent props={props} pointerEvents={pointerEvents}>
                    {children}
                </WidgetComponent>
            ) : (
                <div>Unknown: {type}</div>
            )}

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
            {props.visible === false && <div className="absolute top-0 right-0 bg-red-500 text-white text-[8px] px-1 max-w-full max-h-full truncate">HIDDEN</div>}
            {props.enabled === false && <div className="absolute bottom-0 right-0 bg-gray-500 text-white text-[8px] px-1 max-w-full max-h-full truncate">DISABLED</div>}
            {type === 'button' && props.default === true && <div className="absolute top-0 left-0 bg-blue-500 text-white text-[8px] px-1 max-w-full max-h-full truncate">DEFAULT</div>}
            {type === 'button' && props.cancel === true && <div className="absolute bottom-0 left-0 bg-orange-500 text-white text-[8px] px-1 max-w-full max-h-full truncate">CANCEL</div>}
        </div>
    );
};

export default FormElement;
