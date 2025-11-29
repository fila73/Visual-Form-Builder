import React from 'react';

const ShapeWidget = ({ props }) => {
    return (
        <div
            className="w-full h-full"
            style={{
                backgroundColor: props.bg || props.style?.backgroundColor,
                border: `1px solid ${props.color || '#000'}`
            }}
        ></div>
    );
};

export default ShapeWidget;
