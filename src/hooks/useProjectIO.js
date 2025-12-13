import { useRef } from 'react';
import { dialog, fs, shell } from '../services/tauri';
import { parseSCAContent } from '../utils/scaParser';
import { parseSPRContent } from '../utils/sprParser';
import { decodeText } from '../utils/charsetUtils';
import { exportToPython } from '../utils/pythonExporter';
import { exportToPython as exportToPythonPyQt } from '../utils/pythonExporterPyQt';
import { exportToPowerShellWinForms, exportToPowerShellWPF } from '../utils/powershellExporter';
import { useLanguage } from '../contexts/LanguageContext';

export const useProjectIO = ({
    formElements, setFormElements,
    setFormEvents, formEvents,
    setFormName, formName,
    setCanvasSize, canvasSize,
    setCustomMethods, customMethods,
    setSelectedIds,
    scaCharset, sprCharset,
    formProps, setFormProps,
    exportFramework = 'tkinter'
}) => {
    const { t } = useLanguage();
    const fileInputRef = useRef(null);
    const fileInputScaRef = useRef(null);
    const fileInputSprRef = useRef(null);

    const handleLoadProject = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = event.target.result;
                const data = JSON.parse(json);

                if (data.widgets) {
                    setFormElements(data.widgets);
                    setCanvasSize(data.canvasSize || { width: 800, height: 600 });
                    setCustomMethods(data.customMethods || []);

                    // Restore events
                    const restoredEvents = {};
                    const eventsToRestore = data.formEvents || {};

                    Object.entries(eventsToRestore).forEach(([key, code]) => {
                        if (key.startsWith('obj_') || key.startsWith('Form1_')) {
                            restoredEvents[key] = code;
                            return;
                        }

                        // Try to parse Name_Event (legacy support)
                        const parts = key.split('_');
                        if (parts.length >= 2) {
                            const eventName = parts.pop();
                            const widgetName = parts.join('_');

                            if (widgetName === 'Form1') {
                                restoredEvents[`Form1_${eventName}`] = code;
                            } else {
                                const widget = data.widgets.find(w => (w.props.name || w.name) === widgetName);
                                if (widget) {
                                    restoredEvents[`${widget.id}_${eventName}`] = code;
                                }
                            }
                        }
                    });

                    setFormEvents(restoredEvents);
                    if (data.formName) setFormName(data.formName);
                    if (data.formProps && setFormProps) setFormProps(data.formProps);
                    setSelectedIds([]);
                }
            } catch (err) { console.error("Chyba JSON.", err); alert("Chyba JSON."); }
        };
        reader.readAsText(file); e.target.value = '';
    };

    const handleImportSCA = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = decodeText(event.target.result, scaCharset);
            parseSCAContent(text, setCanvasSize, setFormElements, (id) => setSelectedIds(id ? [id] : []), setFormEvents, setFormName, setFormProps);
        };
        reader.readAsArrayBuffer(file); e.target.value = '';
    };

    const handleImportSPR = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = decodeText(event.target.result, sprCharset);
            parseSPRContent(text, setCanvasSize, setFormElements, (id) => setSelectedIds(id ? [id] : []), setFormEvents, setFormName, setFormProps);
        };
        reader.readAsArrayBuffer(file); e.target.value = '';
    };

    const handleExportToPython = async () => {
        try {
            console.log("Opening save dialog for Export...");
            const isPowerShell = ['winforms', 'wpf'].includes(exportFramework);
            const ext = isPowerShell ? 'ps1' : 'py';
            const filterName = isPowerShell ? 'PowerShell Script' : 'Python Script';

            const path = await dialog.save({
                defaultPath: `${formName}.${ext}`,
                filters: [{
                    name: filterName,
                    extensions: [ext]
                }]
            });

            if (!path) return;

            const downloadFile = async (name, content, type) => {
                try {
                    await fs.writeTextFile(path, content);
                    console.log('Export úspěšný!');

                    if (runAfterExport) {
                        try {
                            console.log('Spouštím po exportu:', path);
                            let command;
                            if (isPowerShell) {
                                command = shell.Command.create('powershell', ['-ExecutionPolicy', 'Bypass', '-File', path]);
                            } else {
                                command = shell.Command.create('python', ['-m', 'idlelib', path]);
                            }

                            const output = await command.execute();
                            console.log('Output:', output);
                        } catch (runErr) {
                            console.error("Run failed:", runErr);
                            alert("Chyba při spuštění: " + (typeof runErr === 'object' ? JSON.stringify(runErr) : runErr));
                        }
                    }
                } catch (writeErr) {
                    console.error("Write failed:", writeErr);
                    alert("Chyba při zápisu: " + (typeof writeErr === 'object' ? JSON.stringify(writeErr) : writeErr));
                }
            };

            if (exportFramework === 'pyqt') {
                exportToPythonPyQt(formElements, customMethods, canvasSize, downloadFile, formEvents, formProps);
            } else if (exportFramework === 'winforms') {
                exportToPowerShellWinForms(formElements, customMethods, canvasSize, downloadFile, formEvents, formProps);
            } else if (exportFramework === 'wpf') {
                exportToPowerShellWPF(formElements, customMethods, canvasSize, downloadFile, formEvents, formProps);
            } else {
                exportToPython(formElements, customMethods, canvasSize, downloadFile, formEvents, formProps);
            }
        } catch (error) {
            console.error("Export failed:", error);
            alert("Chyba při exportu: " + (error.message || JSON.stringify(error)));
        }
    };

    const saveProject = async () => {
        try {
            console.log("Opening save dialog for Project...");
            const path = await dialog.save({
                defaultPath: `${formName}.json`,
                filters: [{
                    name: 'JSON Project',
                    extensions: ['json']
                }]
            });

            if (!path) return;

            // Prepare events for export: Convert IDs to Names
            const exportEvents = {};
            Object.entries(formEvents).forEach(([key, code]) => {
                let widgetId = null;
                let eventName = null;

                if (key.startsWith('Form1_')) {
                    widgetId = 'Form1';
                    eventName = key.substring(6);
                } else {
                    const widget = formElements.find(w => key.startsWith(w.id + '_'));
                    if (widget) {
                        widgetId = widget.id;
                        eventName = key.substring(widgetId.length + 1);
                    }
                }

                if (widgetId && eventName) {
                    if (widgetId === 'Form1') {
                        exportEvents[`Form1_${eventName}`] = code;
                    } else {
                        const widget = formElements.find(w => w.id === widgetId);
                        if (widget) {
                            const name = widget.props.name || widget.name;
                            exportEvents[`${name}_${eventName}`] = code;
                        }
                    }
                }
            });

            const data = JSON.stringify({ canvasSize, widgets: formElements, customMethods, formEvents: exportEvents, formName, formProps }, null, 2);
            await fs.writeTextFile(path, data);
            console.log('Projekt uložen!');
        } catch (error) {
            console.error("Save failed:", error);
            alert("Chyba při ukládání: " + (error.message || (typeof error === 'object' ? JSON.stringify(error) : error)));
        }
    };

    const handleNewProject = async () => {
        const answer = await dialog.ask(t('msg.confirm_new'), {
            title: t('btn.new'),
            kind: 'warning'
        });

        if (answer) {
            setFormElements([]);
            setCustomMethods([]);
            setFormEvents({});
            setFormName('Form1');
            setCanvasSize({ width: 800, height: 600 });
            if (setFormProps) setFormProps({ caption: 'Form1', minButton: true, maxButton: true, closable: true, movable: true });
            setSelectedIds([]);
        }
    };

    return {
        fileInputRef,
        fileInputScaRef,
        fileInputSprRef,
        handleLoadProject,
        handleImportSCA,
        handleImportSPR,
        handleExportToPython,
        saveProject,
        handleNewProject
    };
};
