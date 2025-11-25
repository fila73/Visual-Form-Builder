import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { componentRegistry } from '../data/componentRegistry';
import * as Icons from 'lucide-react';

const DraggableItem = ({ component }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `palette-${component.type}`,
        data: { component },
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    const IconComponent = Icons[component.icon] || Icons.HelpCircle;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className="flex flex-col items-center justify-center p-2 bg-white border border-gray-200 rounded hover:bg-gray-50 cursor-grab aspect-square"
        >
            <IconComponent size={24} className="text-gray-600 mb-2" />
            <span className="text-xs text-gray-700 font-medium text-center">{component.label}</span>
        </div>
    );
};

const Sidebar = () => {
    return (
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col z-20">
            <div className="p-4 border-b border-gray-200 font-bold text-gray-700 bg-gray-50">
                PRVKY
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-2 gap-2">
                    {componentRegistry.map((component) => (
                        <DraggableItem key={component.type} component={component} />
                    ))}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
