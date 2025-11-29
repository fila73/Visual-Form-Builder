import React from 'react';

const SpinnerWidget = ({ props, pointerEvents }) => {
    return (
        <div style={{ color: props.style?.color, fontSize: props.style?.fontSize }} className={`w-full h-full bg-white text-black px-1 flex items-center justify-between border border-gray-600 shadow-inner ${pointerEvents}`}>
            <span className="truncate">{props.value || props.text || 0}</span>
            <div className="flex flex-col h-full border-l border-gray-400">
                <div className="h-1/2 w-4 bg-gray-200 flex items-center justify-center text-[8px]">▲</div>
                <div className="h-1/2 w-4 bg-gray-200 flex items-center justify-center text-[8px] border-t border-gray-400">▼</div>
            </div>
        </div>
    );
};

export default SpinnerWidget;
