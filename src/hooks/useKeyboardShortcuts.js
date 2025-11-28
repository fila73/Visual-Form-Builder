import { useEffect } from 'react';

const useKeyboardShortcuts = ({
    activeModal,
    selectedIds,
    formElements,
    gridSize,
    onCopy,
    onPaste,
    onCut,
    onDelete,
    onMove,
    onSave,
    onLoad,
    onNew,
    onSelectAll,
    fileInputRef,
    saveProjectRef,
    handleNewProjectRef
}) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (activeModal) return;

            // Clipboard Shortcuts
            if (e.ctrlKey) {
                if (e.key === 'n' || e.key === 'N') {
                    e.preventDefault();
                    handleNewProjectRef.current();
                    return;
                }
                if (e.key === 'o' || e.key === 'O') {
                    e.preventDefault();
                    fileInputRef.current.click();
                    return;
                }
                if (e.key === 's' || e.key === 'S') {
                    e.preventDefault();
                    saveProjectRef.current();
                    return;
                }
                if (e.key === 'c' || e.key === 'C') {
                    e.preventDefault();
                    onCopy();
                    return;
                }
                if (e.key === 'v' || e.key === 'V') {
                    e.preventDefault();
                    onPaste();
                    return;
                }
                if (e.key === 'x' || e.key === 'X') {
                    e.preventDefault();
                    onCut();
                    return;
                }
            }

            // Ctrl+A - Select All
            if (e.ctrlKey && (e.code === 'KeyA' || e.key === 'a' || e.key === 'A')) {
                const tagName = e.target.tagName;
                if (tagName === 'INPUT' || tagName === 'TEXTAREA' || e.target.isContentEditable) {
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                onSelectAll();
                return;
            }

            if (selectedIds.length === 0) return;
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

            const step = e.ctrlKey ? gridSize : 1;
            const isResize = e.shiftKey;
            const isAlign = e.altKey;

            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                onMove(e.key, step, isResize, isAlign);
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                onDelete();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIds, formElements, gridSize, activeModal, onCopy, onPaste, onCut, onDelete, onMove, onSelectAll]);
};

export default useKeyboardShortcuts;
