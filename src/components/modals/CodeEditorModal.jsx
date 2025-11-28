import React, { useState, useEffect } from 'react';
import { Activity, X, Save } from 'lucide-react';

const CodeEditorModal = ({ isOpen, onClose, onSave, title, subTitle, initialCode }) => {
    const [code, setCode] = useState(initialCode || "");

    useEffect(() => {
        setCode(initialCode || "");
    }, [initialCode, isOpen]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                onSave(code);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, onSave, code]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] backdrop-blur-sm">
            <div className="bg-white w-3/4 h-3/4 flex flex-col rounded-lg shadow-2xl overflow-hidden">
                <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <Activity className="text-yellow-400" />
                        <div>
                            <h2 className="font-bold text-lg">{title}</h2>
                            <div className="text-xs text-gray-400 font-mono">
                                {subTitle}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 flex flex-col bg-slate-50">
                    <div className="bg-gray-200 px-4 py-1 text-[10px] text-gray-500 font-mono border-b border-gray-300">
                        # Python kód (odsazení řešeno automaticky, pište zarovnané vlevo) | ESC = Zrušit | CTRL+ENTER = Uložit
                    </div>
                    <textarea
                        className="flex-1 w-full p-4 font-mono text-sm bg-[#1e1e1e] text-[#d4d4d4] resize-none focus:outline-none leading-relaxed"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        spellCheck={false}
                        placeholder="# Zde napište váš kód..."
                    />
                </div>
                <div className="p-4 bg-gray-100 border-t border-gray-300 flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded text-sm font-medium transition">
                        Zrušit
                    </button>
                    <button
                        onClick={() => onSave(code)}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-bold shadow-sm transition flex items-center gap-2"
                    >
                        <Save size={16} /> Uložit Kód
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CodeEditorModal;
