import React from 'react';

const ContainerWidget = ({ props, children }) => {
    return (
        <div className="w-full h-full border border-gray-400 border-dashed relative" style={{ backgroundColor: props.bg || props.style?.backgroundColor }}>
            <div className="absolute top-0 left-0 bg-gray-200 text-[8px] px-1 text-gray-500 z-10">Container</div>
            {children}
        </div>
    );
};

export default ContainerWidget;
