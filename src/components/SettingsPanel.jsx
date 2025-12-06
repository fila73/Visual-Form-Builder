import React from 'react';
import { Grid as GridIcon, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const SettingsPanel = ({
    show,
    gridSize,
    onGridSizeChange,
    showGrid,
    onShowGridChange,
    scaCharset,
    onScaCharsetChange,
    sprCharset,
    onSprCharsetChange,
    pythonFramework,
    onPythonFrameworkChange,
    runAfterExport,
    onRunAfterExportChange
}) => {
    const { language, setLanguage, t } = useLanguage();

    if (!show) return null;

    return (
        <div className="bg-gray-100 border-b border-gray-300 p-2 flex items-center space-x-4 px-4 shadow-inner overflow-x-auto">
            <div className="flex items-center space-x-2">
                <GridIcon size={16} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{t('settings.grid')}</span>
            </div>
            <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => onShowGridChange(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>{t('settings.show')}</span>
            </label>
            <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">{t('settings.size')}</span>
                <input
                    type="number"
                    value={gridSize}
                    onChange={(e) => onGridSizeChange(Math.max(5, parseInt(e.target.value) || 10))}
                    className="w-16 border border-gray-300 rounded px-2 py-1 text-sm bg-white text-gray-900"
                    min="5"
                    max="100"
                />
                <span className="text-sm text-gray-500">px</span>
            </div>
            <div className="h-6 w-px bg-gray-300 mx-2"></div>
            <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">{t('settings.sca')}</span>
                <select
                    value={scaCharset}
                    onChange={(e) => onScaCharsetChange(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-500"
                >
                    <option value="windows-1250">CP1250 (Win-1250)</option>
                    <option value="ibm852">CP852 (Latin 2)</option>
                    <option value="ibm437">CP437 (OEM US)</option>
                    <option value="ibm850">CP850 (Latin 1)</option>
                    <option value="utf-8">UTF-8</option>
                    <option value="windows-1252">System Default</option>
                </select>
            </div>
            <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">{t('settings.spr')}</span>
                <select
                    value={sprCharset}
                    onChange={(e) => onSprCharsetChange(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-500"
                >
                    <option value="cp895">CP895 (Kamenický)</option>
                    <option value="ibm852">CP852 (Latin 2)</option>
                    <option value="windows-1250">CP1250 (Win-1250)</option>
                    <option value="ibm437">CP437 (OEM US)</option>
                    <option value="ibm850">CP850 (Latin 1)</option>
                    <option value="utf-8">UTF-8</option>
                    <option value="windows-1252">System Default</option>
                </select>
            </div>
            <div className="h-6 w-px bg-gray-300 mx-2"></div>
            <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Python</span>
                <select
                    value={pythonFramework}
                    onChange={(e) => onPythonFrameworkChange(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-500"
                >
                    <option value="tkinter">Tkinter</option>
                    <option value="pyqt">PyQt6</option>
                </select>
            </div>
            <div className="h-6 w-px bg-gray-300 mx-2"></div>
            <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                <input
                    type="checkbox"
                    checked={runAfterExport}
                    onChange={(e) => onRunAfterExportChange(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>{t('settings.run_after_export')}</span>
            </label>
            <div className="h-6 w-px bg-gray-300 mx-2"></div>
            <div className="flex items-center space-x-2">
                <Globe size={16} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{t('settings.language')}</span>
                <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-500"
                >
                    <option value="cs">{t('settings.lang.cs')}</option>
                    <option value="en">{t('settings.lang.en')}</option>
                </select>
            </div>
        </div>
    );
};

export default SettingsPanel;
