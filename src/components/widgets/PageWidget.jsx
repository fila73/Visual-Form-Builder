import React from 'react';

const PageWidget = ({ props, children }) => {
    const { style, caption } = props;

    return (
        <div style={{ ...style, width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, backgroundColor: 'white' }}>
            {/* In designer, Page is just a container. The tabs are handled by PageFrame. */}
            {children}
        </div>
    );
};

export default PageWidget;
