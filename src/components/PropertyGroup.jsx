import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const PropertyGroup = ({ title, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border-b border-gray-200 last:border-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 text-xs font-bold text-gray-700 uppercase transition-colors"
            >
                <span>{title}</span>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {isOpen && (
                <div className="p-4 space-y-2">
                    {children}
                </div>
            )}
        </div>
    );
};

export default PropertyGroup;
