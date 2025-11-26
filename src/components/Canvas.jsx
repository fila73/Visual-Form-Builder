import React from 'react';
import FormElement from './FormElement';

/**
 * Canvas Component
 * Renders the main design area where widgets are placed.
 * Handles grid rendering, selection boxes, and recursive widget rendering.
 * 
 * @param {Object} props
 * @param {Array} props.elements - List of form elements.
 * @param {number} props.gridSize - Size of the grid in pixels.
 * @param {boolean} props.showGrid - Whether to display the grid.
 * @param {Object} props.canvasRef - Ref to the canvas DOM element.
 * @param {Array} props.selectedIds - IDs of selected elements.
 * @param {Function} props.onWidgetClick - Handler for widget clicks.
 * @param {Function} props.onCanvasClick - Handler for canvas clicks.
 * @param {Function} props.onResizeMouseDown - Handler for resize start.
 * @param {Object} props.canvasSize - Dimensions of the canvas {width, height}.
 * @param {Function} props.onCanvasMouseDown - Handler for canvas mouse down (selection/drawing).
 * @param {Object} props.selectionBox - State for drag-to-select box.
 * @param {Object} props.drawingRect - State for drawing new widgets.
 * @param {string} props.activeTool - Currently active tool.
 * @param {string} props.formName - Name of the form.
 */
const Canvas = ({
    elements,
    gridSize = 10,
    showGrid = true,
    canvasRef,
    selectedIds,
    onWidgetClick,
    onCanvasClick,
    onResizeMouseDown,
    canvasSize,
    onCanvasMouseDown,
    selectionBox,
    drawingRect,
    activeTool,
    formName
}) => {
    // Dynamic style for the canvas background (grid pattern)
    const style = {
        backgroundColor: 'white',
        backgroundImage: showGrid ? 'radial-gradient(#ccc 1px, transparent 1px)' : 'none',
        backgroundSize: `${gridSize}px ${gridSize}px`,
        cursor: activeTool ? 'crosshair' : 'default'
    };

    /**
     * Helper to calculate styles for selection/drawing boxes.
     * Converts absolute coordinates to relative canvas coordinates.
     */
    const getBoxStyle = (box, color = '#3b82f6', bgColor = 'rgba(59, 130, 246, 0.2)') => {
        if (!box || !canvasRef?.current) return null;

        const rect = canvasRef.current.getBoundingClientRect();
        const left = Math.min(box.startX, box.currentX) - rect.left;
        const top = Math.min(box.startY, box.currentY) - rect.top;
        const width = Math.abs(box.currentX - box.startX);
        const height = Math.abs(box.currentY - box.startY);

        return {
            left,
            top,
            width,
            height,
            position: 'absolute',
            border: `1px solid ${color}`,
            backgroundColor: bgColor,
            pointerEvents: 'none',
            zIndex: 50
        };
    };

    return (
        <main className="flex-1 bg-gray-500 relative overflow-hidden flex flex-col" onClick={onCanvasClick}>
            <div className="p-1 bg-gray-600 text-white text-xs px-4 flex justify-between">
                <span>{formName}: {canvasSize?.width || 800}x{canvasSize?.height || 600}px</span>
                <span>Grid: {showGrid ? `${gridSize}px` : 'Off'}</span>
            </div>
            <div className="flex-1 p-8 overflow-auto flex justify-center items-center bg-gray-500" onMouseDown={onCanvasMouseDown}>
                <div
                    ref={canvasRef}
                    style={style}
                    className="bg-white shadow-lg relative transition-all duration-200"
                    onClick={(e) => e.stopPropagation()} // Prevent canvas click when clicking on the form area
                >
                    <div style={{ width: `${canvasSize?.width || 800}px`, height: `${canvasSize?.height || 600}px`, position: 'relative' }}>
                        {elements.length === 0 && !activeTool && (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-300 pointer-events-none">
                                Select a tool and draw to create components
                            </div>
                        )}
                        {(() => {
                            // Recursive rendering helper
                            const renderElement = (el) => {
                                const children = elements.filter(child => child.parentId === el.id);
                                return (
                                    <div key={el.id} className="absolute" style={{ left: el.x || 0, top: el.y || 0, width: el.props.width, height: el.props.height }} onClick={(e) => e.stopPropagation()}>
                                        <div className="relative group p-0 cursor-move w-full h-full">
                                            <FormElement
                                                element={el}
                                                selected={selectedIds.includes(el.id)}
                                                onMouseDown={(e) => onWidgetClick(e, el.id)}
                                                onResizeMouseDown={onResizeMouseDown}
                                            >
                                                {children.map(renderElement)}
                                            </FormElement>
                                        </div>
                                    </div>
                                );
                            };

                            // Render only root elements (no parentId or parentId not found in elements)
                            return elements
                                .filter(el => !el.parentId || !elements.find(p => p.id === el.parentId))
                                .map(renderElement);
                        })()}
                        {selectionBox && <div style={getBoxStyle(selectionBox)} />}
                        {drawingRect && <div style={getBoxStyle(drawingRect, '#10b981', 'rgba(16, 185, 129, 0.2)')} />}
                    </div>
                </div>
            </div>
        </main>
    );
};

export default Canvas;
