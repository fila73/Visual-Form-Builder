import React from 'react';

const PropInput = ({ label, value, onChange, type = "text" }) => {
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
