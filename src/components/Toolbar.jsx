import React from 'react';
import {
    AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignEndVertical, AlignCenterVertical,
    ArrowUpFromLine, ArrowDownFromLine, Layers, Copy, Clipboard, Undo, Redo
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Toolbar = ({
    onAlign,
    onDistribute,
    onZOrder,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    onCopy,
    onPaste,
    hasSelection
}) => {
    const { t } = useLanguage();

    const btnClass = "p-1.5 rounded hover:bg-gray-200 text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed";
    const separatorClass = "w-px h-6 bg-gray-300 mx-1";

    return (
        <div className="h-10 bg-white border-b border-gray-200 flex items-center px-2 shadow-sm z-10">
            {/* Undo / Redo */}
            <div className="flex items-center gap-1">
                <button className={btnClass} onClick={onUndo} disabled={!canUndo} title={t('toolbar.undo')}>
                    <Undo size={16} />
                </button>
                <button className={btnClass} onClick={onRedo} disabled={!canRedo} title={t('toolbar.redo')}>
                    <Redo size={16} />
                </button>
            </div>

            <div className={separatorClass} />

            {/* Copy / Paste */}
            <div className="flex items-center gap-1">
                <button className={btnClass} onClick={onCopy} disabled={!hasSelection} title={t('toolbar.copy')}>
                    <Copy size={16} />
                </button>
                <button className={btnClass} onClick={onPaste} title={t('toolbar.paste')}>
                    <Clipboard size={16} />
                </button>
            </div>

            <div className={separatorClass} />

            {/* Alignment */}
            <div className="flex items-center gap-1">
                <button className={btnClass} onClick={() => onAlign('left')} disabled={!hasSelection} title={t('toolbar.align_left')}>
                    <AlignLeft size={16} />
                </button>
                <button className={btnClass} onClick={() => onAlign('center')} disabled={!hasSelection} title={t('toolbar.align_center')}>
                    <AlignCenter size={16} />
                </button>
                <button className={btnClass} onClick={() => onAlign('right')} disabled={!hasSelection} title={t('toolbar.align_right')}>
                    <AlignRight size={16} />
                </button>
                <button className={btnClass} onClick={() => onAlign('top')} disabled={!hasSelection} title={t('toolbar.align_top')}>
                    <AlignStartVertical size={16} />
                </button>
                <button className={btnClass} onClick={() => onAlign('middle')} disabled={!hasSelection} title={t('toolbar.align_middle')}>
                    <AlignCenterVertical size={16} />
                </button>
                <button className={btnClass} onClick={() => onAlign('bottom')} disabled={!hasSelection} title={t('toolbar.align_bottom')}>
                    <AlignEndVertical size={16} />
                </button>
            </div>

            <div className={separatorClass} />

            {/* Z-Order */}
            <div className="flex items-center gap-1">
                <button className={btnClass} onClick={() => onZOrder('front')} disabled={!hasSelection} title={t('toolbar.bring_front')}>
                    <ArrowUpFromLine size={16} />
                </button>
                <button className={btnClass} onClick={() => onZOrder('back')} disabled={!hasSelection} title={t('toolbar.send_back')}>
                    <ArrowDownFromLine size={16} />
                </button>
            </div>
        </div>
    );
};

export default Toolbar;
