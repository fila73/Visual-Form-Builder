import React from 'react';
import { Monitor, FolderOpen, Save, Code, Settings, FilePlus } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const TopBar = ({
    onNew,
    onLoad,
    onSave,
    onImportSCA,
    onImportSPR,
    onExportPython,
    onToggleSettings,
    showSettings
}) => {
    const { t } = useLanguage();

    return (
        <header className="h-12 bg-gray-800 text-white flex items-center justify-between px-4 shrink-0 z-30">
            <div className="flex items-center space-x-2 font-bold text-lg">
                <Monitor className="text-yellow-400" size={20} />
                <span>{t('app.title')}</span>
            </div>
            <div className="flex items-center space-x-2">
                <button onClick={onNew} className="flex items-center space-x-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 rounded text-sm transition-colors">
                    <FilePlus size={14} />
                    <span>{t('btn.new')}</span>
                </button>
                <button onClick={onLoad} className="flex items-center space-x-1 px-3 py-1 bg-orange-600 hover:bg-orange-700 rounded text-sm transition-colors">
                    <FolderOpen size={14} />
                    <span>{t('btn.load_json')}</span>
                </button>
                <button onClick={onSave} className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors">
                    <Save size={14} />
                    <span>{t('btn.save_json')}</span>
                </button>
                <button onClick={onImportSCA} className="flex items-center space-x-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors">
                    <FolderOpen size={14} />
                    <span>{t('btn.import_sca')}</span>
                </button>
                <button onClick={onImportSPR} className="flex items-center space-x-1 px-3 py-1 bg-teal-600 hover:bg-teal-700 rounded text-sm transition-colors">
                    <FolderOpen size={14} />
                    <span>{t('btn.import_spr')}</span>
                </button>
                <button onClick={onExportPython} className="flex items-center space-x-1 px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors">
                    <Code size={14} />
                    <span>{t('btn.export_python')}</span>
                </button>
                <div className="h-6 w-px bg-gray-600 mx-2"></div>
                <button
                    onClick={onToggleSettings}
                    className={`flex items-center space-x-1 px-3 py-1 rounded text-sm transition-colors ${showSettings ? 'bg-gray-600' : 'hover:bg-gray-700'}`}
                >
                    <Settings size={14} />
                    <span>{t('btn.settings')}</span>
                </button>
            </div>
        </header>
    );
};

export default TopBar;
