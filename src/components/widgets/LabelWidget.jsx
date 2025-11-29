import React from 'react';

const LabelWidget = ({ props }) => {
    return (
        <div style={{ color: props.color || props.style?.color, fontSize: props.style?.fontSize }} className="w-full h-full flex items-center px-1 overflow-hidden whitespace-nowrap">
            {props.text}
        </div>
    );
};

export default LabelWidget;
