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
            className="flex items-center p-2 bg-white border border-gray-200 rounded hover:bg-gray-50 cursor-grab mb-1"
        >
            <IconComponent size={16} className="text-gray-600 mr-2" />
            <span className="text-xs text-gray-700 font-medium">{component.label}</span>
        </div>
    );
};

const Sidebar = () => {
    return (
        <aside className="w-40 bg-white border-r border-gray-200 flex flex-col z-20">
            <div className="p-2 border-b border-gray-200 font-bold text-gray-700 bg-gray-50 text-sm">
                PRVKY
            </div>
            <div className="flex-1 overflow-y-auto p-2">
                <div className="flex flex-col">
                    {componentRegistry.map((component) => (
                        <DraggableItem key={component.type} component={component} />
                    ))}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
