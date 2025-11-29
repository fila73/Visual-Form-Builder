import React from 'react';
import { renderTextWithHotkey } from '../../utils/textUtils';

const RadioWidget = ({ props, pointerEvents }) => {
    return (
        <div style={{ color: props.style?.color, fontSize: props.style?.fontSize }} className={`w-full h-full flex items-center gap-1.5 px-1 ${pointerEvents}`}>
            <div className="w-4 h-4 border border-gray-600 rounded-full bg-white flex items-center justify-center">
                {props.checked && <div className="w-2 h-2 bg-black rounded-full"></div>}
            </div>
            <span className="truncate">{renderTextWithHotkey(props.label || props.text, props.hotkey)}</span>
        </div>
    );
};

export default RadioWidget;
