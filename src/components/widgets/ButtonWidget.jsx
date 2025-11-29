import React from 'react';
import { renderTextWithHotkey } from '../../utils/textUtils';

const ButtonWidget = ({ props, pointerEvents }) => {
    return (
        <div
            className={`w-full h-full flex items-center justify-center text-sm text-black border-b-2 border-r-2 border-gray-400 bg-gray-100 active:border-t-2 active:border-l-2 active:border-b-0 active:border-r-0 ${pointerEvents}`}
            style={{
                backgroundColor: props.bg || props.style?.backgroundColor,
                borderTop: '1px solid white',
                borderLeft: '1px solid white',
                color: props.style?.color,
                fontSize: props.style?.fontSize
            }}
        >
            {renderTextWithHotkey(props.text, props.hotkey)}
        </div>
    );
};

export default ButtonWidget;
