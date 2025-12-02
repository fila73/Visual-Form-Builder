import React from 'react';
import { componentRegistry } from '../data/componentRegistry';
import {
    MousePointer2,
    Lock,
    Unlock,
    Type,
    Box,
    FileText,
    MousePointerClick,
    CheckSquare,
    CircleDot,
    Hash,
    List,
    Grid,
    Square,
    Image,
    Layout
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const iconMap = {
    Type,
    Box,
    FileText,
    MousePointerClick,
    CheckSquare,
    CircleDot,
    Hash,
    List,
    Grid,
    Square,
    Image,
    Layout
};

const WidgetToolbar = ({ activeTool, isToolLocked, onToolSelect, onToolLock }) => {
    const { t } = useLanguage();
    return (
        <div className="w-12 bg-gray-50 border-r border-gray-200 flex flex-col items-center py-4 gap-2 z-10 overflow-y-auto scrollbar-hide">
            {/* Cursor Tool */}
            <button
                onClick={() => onToolSelect(null)}
                className={`p-2 rounded hover:bg-gray-200 ${!activeTool ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                title={t('toolbar.select')}
            >
                <MousePointer2 size={20} />
            </button>

            <div className="w-8 h-px bg-gray-300 my-1"></div>

            {/* Component Tools */}
            {componentRegistry.map((comp) => {
                const Icon = iconMap[comp.icon] || Box;
                return (
                    <button
                        key={comp.type}
                        onClick={() => onToolSelect(comp.type)}
                        onDoubleClick={() => onToolLock(comp.type)}
                        className={`relative p-2 rounded hover:bg-gray-200 ${activeTool === comp.type ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                        title={comp.label}
                    >
                        <Icon size={20} />
                        {activeTool === comp.type && isToolLocked && (
                            <Lock size={10} className="absolute top-0.5 right-0.5 text-red-500" />
                        )}
                    </button>
                );
            })}

            <div className="flex-1"></div>

            {/* Lock Tool */}
            <button
                onClick={() => activeTool && onToolLock(activeTool)}
                className={`p-2 rounded hover:bg-gray-200 ${isToolLocked ? 'bg-red-100 text-red-600' : 'text-gray-400'}`}
                title={isToolLocked ? t('toolbar.unlock') : t('toolbar.lock')}
            >
                {isToolLocked ? <Lock size={20} /> : <Unlock size={20} />}
            </button>
        </div>
    );
};

export default WidgetToolbar;
