import React from 'react';

const TextBoxWidget = ({ props, pointerEvents }) => {
    return (
        <div style={{ color: props.style?.color, fontSize: props.style?.fontSize }} className={`w-full h-full bg-white text-black px-1 flex items-center overflow-hidden border border-gray-600 shadow-inner inset-shadow ${pointerEvents}`}>
            {props.text || <span className="text-gray-300 italic">{props.placeholder}</span>}
        </div>
    );
};

export default TextBoxWidget;
