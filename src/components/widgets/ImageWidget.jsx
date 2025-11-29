import React from 'react';
import { Image as ImageIcon } from 'lucide-react';

const ImageWidget = ({ props }) => {
    const imgStyle = {
        backgroundImage: `url(${props.src})`,
        backgroundSize: props.stretch ? '100% 100%' : 'auto',
        backgroundRepeat: props.repeat && !props.stretch ? 'repeat' : 'no-repeat',
        backgroundPosition: 'top left'
    };

    return (
        <div className="w-full h-full border border-dashed border-gray-400 bg-gray-50 text-gray-400" style={imgStyle}>
            {!props.src && (
                <div className="flex flex-col items-center justify-center h-full">
                    <ImageIcon size={24} />
                    <span className="text-[10px] mt-1">Obrázek</span>
                </div>
            )}
        </div>
    );
};

export default ImageWidget;
