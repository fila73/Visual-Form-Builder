import React from 'react';

const PageFrameWidget = ({ props, children }) => {
    const { style, pageCount = 2 } = props;

    return (
        <div style={{ ...style, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f0f0f0', border: '1px solid #ccc' }}>
            <div className="flex border-b border-gray-300 bg-gray-100">
                {Array.from({ length: pageCount }).map((_, i) => (
                    <div key={i} className={`px-4 py-1 text-xs border-r border-gray-300 ${i === 0 ? 'bg-white font-bold border-b-white -mb-px' : 'text-gray-600'}`}>
                        Page {i + 1}
                    </div>
                ))}
            </div>
            <div className="flex-1 relative p-2 bg-white">
                {/* Only render the first page's content for visual simplicity in designer, or all if we want to show overlap */}
                {/* For now, let's just render children. In a real designer, we'd only show the active page. */}
                {/* But since we don't have active page state in props yet, let's just render children absolutely positioned */}
                {children}
            </div>
        </div>
    );
};

export default PageFrameWidget;
