import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import FormElement from './FormElement';

const Canvas = ({ elements, gridSize = 10, showGrid = true, canvasRef, selectedIds, onWidgetClick, onCanvasClick, onResizeMouseDown, canvasSize, onCanvasMouseDown, selectionBox }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: 'canvas-droppable',
    });

    const style = {
        backgroundColor: 'white',
        backgroundImage: showGrid ? 'radial-gradient(#ccc 1px, transparent 1px)' : 'none',
        backgroundSize: `${gridSize}px ${gridSize}px`,
    };

    // Combine refs
    const setRefs = (node) => {
        setNodeRef(node);
        if (canvasRef) canvasRef.current = node;
    };

    const getSelectionBoxStyle = () => {
        if (!selectionBox || !canvasRef?.current) return null;

        const rect = canvasRef.current.getBoundingClientRect();
        const left = Math.min(selectionBox.startX, selectionBox.currentX) - rect.left;
        const top = Math.min(selectionBox.startY, selectionBox.currentY) - rect.top;
        const width = Math.abs(selectionBox.currentX - selectionBox.startX);
        const height = Math.abs(selectionBox.currentY - selectionBox.startY);

        return {
            left,
            top,
            width,
            height,
            position: 'absolute',
            border: '1px solid #3b82f6', // blue-500
            backgroundColor: 'rgba(59, 130, 246, 0.2)', // blue-500 with opacity
            pointerEvents: 'none',
            zIndex: 50
        };
    };

    return (
        <main className="flex-1 bg-gray-500 relative overflow-hidden flex flex-col" onClick={onCanvasClick}>
            <div className="p-1 bg-gray-600 text-white text-xs px-4 flex justify-between">
                <span>Form1: {canvasSize?.width || 800}x{canvasSize?.height || 600}px</span>
                <span>Grid: {showGrid ? `${gridSize}px` : 'Off'}</span>
            </div>
            <div className="flex-1 p-8 overflow-auto flex justify-center items-center bg-gray-500" onMouseDown={onCanvasMouseDown}>
                <div
                    ref={setRefs}
                    style={style}
                    className="bg-white shadow-lg relative transition-all duration-200"

                    onClick={(e) => e.stopPropagation()} // Prevent canvas click when clicking on the form area
                >
                    <div style={{ width: `${canvasSize?.width || 800}px`, height: `${canvasSize?.height || 600}px`, position: 'relative' }}>
                        {elements.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-300 pointer-events-none">
                                Drag and drop components here
                            </div>
                        )}
                        {elements.map((el) => (
                            <div key={el.id} className="absolute" style={{ left: el.x || 0, top: el.y || 0, width: el.props.width, height: el.props.height }} onClick={(e) => e.stopPropagation()}>
                                <div className="relative group p-0 cursor-move w-full h-full">
                                    <FormElement
                                        element={el}
                                        selected={selectedIds.includes(el.id)}
                                        onMouseDown={(e) => onWidgetClick(e, el.id)}
                                        onResizeMouseDown={onResizeMouseDown}
                                    />
                                </div>
                            </div>
                        ))}
                        {selectionBox && <div style={getSelectionBoxStyle()} />}
                    </div>
                </div>
            </div>
        </main>
    );
};

export default Canvas;
