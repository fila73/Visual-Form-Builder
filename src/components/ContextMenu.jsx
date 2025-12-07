import React, { useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const ContextMenu = ({ x, y, options, onClose }) => {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    if (!options || options.length === 0) return null;

    return (
        <div
            ref={menuRef}
            className="fixed bg-white shadow-lg border border-gray-200 rounded py-1 z-50 text-sm min-w-[150px]"
            style={{ top: y, left: x }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {options.map((option, index) => {
                if (option.type === 'separator') {
                    return <div key={index} className="h-px bg-gray-200 my-1" />;
                }

                return (
                    <button
                        key={index}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center justify-between ${option.disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'
                            }`}
                        onClick={() => {
                            if (!option.disabled) {
                                option.action();
                                onClose();
                            }
                        }}
                        disabled={option.disabled}
                    >
                        <div className="flex items-center gap-2">
                            {option.icon && <span className="text-gray-500">{option.icon}</span>}
                            <span>{option.label}</span>
                        </div>
                        {option.shortcut && <span className="text-xs text-gray-400 ml-4">{option.shortcut}</span>}
                    </button>
                );
            })}
        </div>
    );
};

export default ContextMenu;
