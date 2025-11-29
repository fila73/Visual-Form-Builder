import React from 'react';

const EditBoxWidget = ({ props, pointerEvents }) => {
    return (
        <div style={{ color: props.style?.color, fontSize: props.style?.fontSize }} className={`w-full h-full bg-white text-black p-1 overflow-hidden border border-gray-600 shadow-inner text-xs whitespace-pre-wrap ${pointerEvents}`}>
            {props.text || props.value}
        </div>
    );
};

export default EditBoxWidget;
