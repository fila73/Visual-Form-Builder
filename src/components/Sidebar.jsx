import React from 'react';
import { componentRegistry } from '../data/componentRegistry';
import * as Icons from 'lucide-react';

/**
 * Renders a single tool item in the sidebar.
 * 
 * @param {Object} component - The component definition from the registry.
 * @param {boolean} isActive - Whether this tool is currently selected.
 * @param {boolean} isLocked - Whether the tool selection is locked (for multiple placements).
 * @param {Function} onClick - Handler for single click (select).
 * @param {Function} onDoubleClick - Handler for double click (lock).
 */
const ToolItem = ({ component, isActive, isLocked, onClick, onDoubleClick }) => {
    const IconComponent = Icons[component.icon] || Icons.HelpCircle;

    return (
        <button
            onClick={() => onClick(component.type)}
            onDoubleClick={() => onDoubleClick(component.type)}
            title={component.label}
            className={`relative flex items-center justify-center p-2 border rounded mb-1 transition-colors ${isActive
                ? 'bg-blue-100 border-blue-500 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
        >
            <IconComponent size={20} />
            {isActive && isLocked && (
                <Icons.Lock size={10} className="absolute top-0.5 right-0.5 text-blue-800" />
            )}
        </button>
    );
};

/**
 * Sidebar component containing the palette of available form widgets.
 * Allows users to select tools for placing widgets on the canvas.
 * 
 * @param {string} activeTool - The currently selected tool type.
 * @param {boolean} isToolLocked - Whether the current tool is locked.
 * @param {Function} onToolSelect - Handler for tool selection.
 * @param {Function} onToolLock - Handler for tool locking.
 */
const Sidebar = ({ activeTool, isToolLocked, onToolSelect, onToolLock }) => {
    return (
        <aside className="w-14 bg-white border-r border-gray-200 flex flex-col z-20 items-center py-2">
            <div className="flex-1 overflow-y-auto w-full px-2">
                <div className="flex flex-col">
                    {componentRegistry.map((component) => (
                        <ToolItem
                            key={component.type}
                            component={component}
                            isActive={activeTool === component.type}
                            isLocked={isToolLocked}
                            onClick={onToolSelect}
                            onDoubleClick={onToolLock}
                        />
                    ))}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
