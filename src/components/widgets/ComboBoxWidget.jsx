import React from 'react';

const ComboBoxWidget = ({ props, pointerEvents }) => {
    return (
        <div style={{ color: props.style?.color, fontSize: props.style?.fontSize }} className={`w-full h-full border border-gray-500 bg-white flex items-center justify-between px-1 shadow-inner ${pointerEvents}`}>
            <span className="truncate px-1">{props.options ? props.options[0] : ''}</span>
            <div className="w-4 h-full bg-gray-200 border-l border-gray-400 flex items-center justify-center">▼</div>
        </div>
    );
};

export default ComboBoxWidget;
