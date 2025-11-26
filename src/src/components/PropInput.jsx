import React from 'react';

const PropInput = ({ label, type = "text", value, onChange }) => (
    <div className="mb-2"><label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">{label}</label><input type={type} className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 outline-none transition" value={value} onChange={(e) => onChange(e.target.value)} /></div>
);

export default PropInput;
