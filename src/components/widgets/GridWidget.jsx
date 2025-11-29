import React from 'react';

const GridWidget = ({ props, pointerEvents }) => {
    let colDefs = [];
    if (Array.isArray(props.columns)) {
        colDefs = props.columns;
    } else {
        const cols = props.columns || 3;
        const colArray = typeof cols === 'number' ? Array.from({ length: cols }, (_, i) => `Col${i + 1}`) : cols.split(',');
        colDefs = colArray.map(c => ({ header: c, width: 100 }));
    }

    return (
        <div className={`w-full h-full border border-gray-500 bg-white flex flex-col text-xs shadow-sm ${pointerEvents}`}>
            <div className="flex border-b border-gray-400 bg-gray-200 font-semibold text-gray-700 overflow-hidden">
                {colDefs.map((c, i) => (
                    <div
                        key={i}
                        className="border-r border-gray-300 px-2 py-1 truncate"
                        style={{ width: c.width ? `${c.width}px` : '100px', minWidth: '50px' }}
                    >
                        {c.header}
                    </div>
                ))}
            </div>
            <div className="flex-1 bg-white p-2 overflow-hidden relative">
                {/* Mock Rows */}
                <div className="flex border-b border-gray-100 mb-1 opacity-50">
                    {colDefs.map((c, i) => (
                        <div key={i} className="h-4 bg-blue-50 mr-1" style={{ width: c.width ? `${c.width}px` : '100px' }}></div>
                    ))}
                </div>
                <div className="flex border-b border-gray-100 mb-1 opacity-50">
                    {colDefs.map((c, i) => (
                        <div key={i} className="h-4 bg-gray-50 mr-1" style={{ width: c.width ? `${c.width}px` : '100px' }}></div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GridWidget;
