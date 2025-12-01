import React from 'react';
import FormElement from './FormElement';
import { useLanguage } from '../contexts/LanguageContext';

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
    formName,
    formProps
}) => {
    const { t } = useLanguage();
    const style = {
        backgroundColor: 'white',
        backgroundImage: showGrid ? 'radial-gradient(#ccc 1px, transparent 1px)' : 'none',
        backgroundSize: `${gridSize}px ${gridSize}px`,
        cursor: activeTool ? 'crosshair' : 'default'
    };

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
                <span>{t('canvas.grid')} {showGrid ? `${gridSize}px` : 'Off'}</span>
            </div>
            <div className="flex-1 p-8 overflow-auto flex justify-center items-center bg-gray-500" onMouseDown={onCanvasMouseDown}>
                <div className="shadow-lg flex flex-col">
                    {/* Window Title Bar */}
                    <div className="h-8 bg-blue-900 flex items-center justify-between px-2 select-none">
                        <div className="text-white text-sm font-semibold flex items-center gap-2">
                            {/* Icon placeholder */}
                            <div className="w-4 h-4 bg-transparent border border-white/50 rounded-sm"></div>
                            <span>{formProps?.caption || 'Form1'}</span>
                        </div>
                        <div className="flex gap-1">
                            {formProps?.minButton !== false && (
                                <div className="w-6 h-5 bg-gray-200 border border-gray-400 flex items-end justify-center pb-1 hover:bg-gray-300">
                                    <div className="w-3 h-0.5 bg-black"></div>
                                </div>
                            )}
                            {formProps?.maxButton !== false && (
                                <div className="w-6 h-5 bg-gray-200 border border-gray-400 flex items-center justify-center hover:bg-gray-300">
                                    <div className="w-3 h-3 border border-black border-t-2"></div>
                                </div>
                            )}
                            {formProps?.closable !== false && (
                                <div className="w-6 h-5 bg-red-100 border border-gray-400 flex items-center justify-center hover:bg-red-500 hover:text-white text-black font-bold text-xs">
                                    X
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Canvas Area */}
                    <div
                        ref={canvasRef}
                        style={{ ...style, width: `${canvasSize?.width || 800}px`, height: `${canvasSize?.height || 600}px`, position: 'relative' }}
                        className="relative transition-all duration-200"
                        onClick={(e) => e.stopPropagation()} // Prevent canvas click when clicking on the form area
                    >
                        {elements.length === 0 && !activeTool && (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-300 pointer-events-none">
                                {t('canvas.no_elements')}
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
