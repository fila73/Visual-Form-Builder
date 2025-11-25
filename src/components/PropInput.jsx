import React from 'react';
import { Eye, EyeOff, Lock, Unlock, CheckSquare, Square, MousePointer2 } from 'lucide-react';

const PropInput = ({ label, value, onChange, type = "text" }) => {
    if (typeof value === 'boolean') {
        let IconTrue = CheckSquare;
        let IconFalse = Square;
        let labelTrue = label; // Default to prop name
        let labelFalse = label;

        if (label.toLowerCase() === 'visible') {
            IconTrue = Eye;
            IconFalse = EyeOff;
            labelTrue = "Visible";
            labelFalse = "Hidden";
        } else if (label.toLowerCase() === 'enabled') {
            IconTrue = Unlock;
            IconFalse = Lock;
            labelTrue = "Enabled";
            labelFalse = "Disabled";
        } else if (label.toLowerCase() === 'checked') {
            labelTrue = "Checked";
            labelFalse = "Unchecked";
        }

        const Icon = value ? IconTrue : IconFalse;
        const text = value ? labelTrue : labelFalse;

        // Style: Blue for True, Gray for False
        const activeClass = "border-blue-500 bg-blue-50 text-blue-600";
        const inactiveClass = "border-gray-300 bg-white text-gray-500";
        const className = `w-full flex items-center justify-center gap-2 px-2 py-1.5 border rounded text-sm transition-all duration-200 ${value ? activeClass : inactiveClass}`;

        return (
            <div className="mb-2">
                <button onClick={() => onChange(!value)} className={className}>
                    <Icon size={16} />
                    <span className="font-medium">{text}</span>
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase w-1/3 truncate" title={label}>{label}</label>
            <input
                type={type}
                value={value === undefined ? '' : value}
                onChange={(e) => onChange(e.target.value)}
                className="w-2/3 border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
            />
        </div>
    );
};

export default PropInput;
