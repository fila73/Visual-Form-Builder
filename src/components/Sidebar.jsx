import React from 'react';
import { componentRegistry } from '../data/componentRegistry';
import * as Icons from 'lucide-react';

const ToolItem = ({ component, isActive, onClick }) => {
    const IconComponent = Icons[component.icon] || Icons.HelpCircle;

    return (
        <button
            onClick={() => onClick(component.type)}
            title={component.label}
            className={`flex items-center justify-center p-2 border rounded mb-1 transition-colors ${isActive
                ? 'bg-blue-100 border-blue-500 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
        >
            <IconComponent size={20} />
        </button>
    );
};

const Sidebar = ({ activeTool, onToolSelect }) => {
    return (
        <aside className="w-14 bg-white border-r border-gray-200 flex flex-col z-20 items-center py-2">
            <div className="flex-1 overflow-y-auto w-full px-2">
                <div className="flex flex-col">
                    {componentRegistry.map((component) => (
                        <ToolItem
                            key={component.type}
                            component={component}
                            isActive={activeTool === component.type}
                            onClick={onToolSelect}
                        />
                    ))}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
