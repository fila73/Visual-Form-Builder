import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

const AddMethodModal = ({ isOpen, onClose, onAdd }) => {
    const [name, setName] = useState("");
    const [args, setArgs] = useState("self");

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (name.trim()) {
            onAdd(name.trim(), args.trim());
            setName("");
            setArgs("self");
            onClose();
        } else {
            alert("Zadejte název metody.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] backdrop-blur-sm">
            <div className="bg-white w-96 rounded-lg shadow-2xl overflow-hidden">
                <div className="bg-slate-900 text-white p-3 flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2"><Plus size={16} /> Nová Metoda</h3>
                    <button onClick={onClose}><X size={18} /></button>
                </div>
                <div className="p-4 space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">NÁZEV METODY</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 outline-none"
                            placeholder="napr. vypocitej_slevu"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">PARAMETRY</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 outline-none font-mono"
                            value={args}
                            onChange={(e) => setArgs(e.target.value)}
                            placeholder="self, arg1, arg2"
                        />
                        <div className="text-[10px] text-gray-400 mt-1">Vždy začněte s "self". Oddělujte čárkou.</div>
                    </div>
                </div>
                <div className="p-3 bg-gray-100 flex justify-end gap-2">
                    <button onClick={onClose} className="px-3 py-1 text-gray-600 hover:bg-gray-200 rounded text-sm">Zrušit</button>
                    <button onClick={handleSubmit} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-bold">Přidat</button>
                </div>
            </div>
        </div>
    );
};

export default AddMethodModal;
