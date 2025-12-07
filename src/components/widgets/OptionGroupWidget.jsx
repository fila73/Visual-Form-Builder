import React from 'react';
import { renderTextWithHotkey } from '../../utils/textUtils';

const OptionGroupWidget = ({ props, pointerEvents }) => {
    // Default styles from registry or props
    const borderColor = props.style?.border ? props.style.border : '1px solid #999';
    const padding = props.style?.padding || '2px'; // Reduced padding
    const itemHeight = props.itemHeight || 23;

    return (
        <fieldset
            style={{
                border: borderColor,
                padding: padding,
                backgroundColor: props.style?.backgroundColor,
                color: props.style?.color,
                fontSize: props.style?.fontSize,
                margin: 0
            }}
            className={`w-full h-full relative ${pointerEvents} flex flex-col`}
        >
            <legend className="px-1 text-xs">{props.label}</legend>
            <div className="flex-1 overflow-hidden flex flex-col">
                {(props.options || []).map((opt, idx) => {
                    const label = (typeof opt === 'object' && opt !== null) ? (opt.caption || '') : String(opt);
                    const val = (typeof opt === 'object' && opt !== null) ? opt.value : idx; // Fallback to index

                    return (
                        <div
                            key={idx}
                            style={{ height: itemHeight, minHeight: itemHeight }}
                            className="flex items-center gap-1.5 shrink-0"
                        >
                            <div className="w-3.5 h-3.5 border border-gray-600 rounded-full bg-white flex items-center justify-center shrink-0">
                                {(props.value === val) && <div className="w-1.5 h-1.5 bg-black rounded-full"></div>}
                            </div>
                            <span className="truncate whitespace-nowrap text-xs">{label}</span>
                        </div>
                    );
                })}
            </div>
        </fieldset>
    );
};

export default OptionGroupWidget;
