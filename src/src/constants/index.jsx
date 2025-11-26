import {
    Type, Box, CheckSquare, MousePointer, List, Table, Image as ImageIcon,
    FileText, Hash, Square
} from 'lucide-react';
import React from 'react';

// --- KONFIGURACE UDÁLOSTÍ ---
export const ALL_EVENTS_LIST = ['init', 'click', 'interactiveChange'];

export const VALID_EVENTS = {
    DEFAULT: ['init', 'click'],
    TEXTBOX: ['init', 'click', 'interactiveChange'],
    EDITBOX: ['init', 'click', 'interactiveChange'],
    SPINNER: ['init', 'click', 'interactiveChange'],
    COMBO: ['init', 'click', 'interactiveChange'],
};

export const commonProps = { visible: true, enabled: true };

export const WIDGET_TYPES = {
    LABEL: { id: 'LABEL', label: 'Label', icon: Type, defaultProps: { ...commonProps, text: 'Label1', width: 100, height: 25, fontSize: 12, color: '#000000' } },
    TEXTBOX: { id: 'TEXTBOX', label: 'TextBox', icon: Box, defaultProps: { ...commonProps, text: '', width: 120, height: 25, placeholder: 'Vstup...' } },
    EDITBOX: { id: 'EDITBOX', label: 'EditBox', icon: FileText, defaultProps: { ...commonProps, text: 'Víceřádkový text...', width: 150, height: 80 } },
    BUTTON: { id: 'BUTTON', label: 'Button', icon: MousePointer, defaultProps: { ...commonProps, text: 'Command1', width: 100, height: 30, bg: '#e0e0e0' } },
    CHECKBOX: { id: 'CHECKBOX', label: 'CheckBox', icon: CheckSquare, defaultProps: { ...commonProps, text: 'Option1', width: 120, height: 25, checked: false } },
    RADIO: { id: 'RADIO', label: 'Radio', icon: ({ className }) => <div className={`rounded-full border-2 border-current w-4 h-4 ${className}`} />, defaultProps: { ...commonProps, text: 'Radio1', width: 120, height: 25, group: 'Group1', checked: false } },
    SPINNER: { id: 'SPINNER', label: 'Spinner', icon: Hash, defaultProps: { ...commonProps, text: '0', width: 80, height: 25 } },
    COMBO: { id: 'COMBO', label: 'ComboBox', icon: List, defaultProps: { ...commonProps, width: 140, height: 25, items: 'Item1,Item2,Item3' } },
    GRID: { id: 'GRID', label: 'Grid', icon: Table, defaultProps: { ...commonProps, width: 300, height: 150, columns: 'ID,Jméno,Příjmení' } },
    SHAPE: { id: 'SHAPE', label: 'Shape', icon: Square, defaultProps: { ...commonProps, width: 100, height: 100, bg: '#cccccc', color: '#000000' } },
    IMAGE: { id: 'IMAGE', label: 'Image', icon: ImageIcon, defaultProps: { ...commonProps, width: 100, height: 100, src: 'placeholder' } },
    CONTAINER: { id: 'CONTAINER', label: 'Container', icon: Box, defaultProps: { ...commonProps, width: 200, height: 200, bg: 'transparent', borderWidth: 1 } },
};
