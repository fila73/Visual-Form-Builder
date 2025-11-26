
/**
 * Enumeration of available component types.
 * These string constants are used throughout the application to identify widget types.
 */
export const COMPONENT_TYPES = {
    LABEL: 'label',
    TEXT_BOX: 'textbox',
    EDIT_BOX: 'editbox',
    BUTTON: 'button',
    CHECK_BOX: 'checkbox',
    RADIO: 'radio',
    SPINNER: 'spinner',
    COMBO_BOX: 'combobox',
    GRID: 'grid',
    SHAPE: 'shape',
    IMAGE: 'image',
    CONTAINER: 'container',
};

/**
 * Registry of all available components (widgets) in the form builder.
 * Each entry defines the component's metadata, icon, and default properties.
 * 
 * Structure:
 * - type: One of COMPONENT_TYPES
 * - label: Display name in the UI
 * - icon: Icon name from lucide-react
 * - defaultProps: Initial properties when the widget is created
 */
export const componentRegistry = [
    {
        type: COMPONENT_TYPES.LABEL,
        label: 'Label',
        icon: 'Type',
        defaultProps: {
            name: 'Label1',
            text: 'Label',
            visible: true,
            enabled: true,
            width: 100,
            height: 24,
            style: { fontSize: '14px', color: '#000' },
        },
    },
    {
        type: COMPONENT_TYPES.TEXT_BOX,
        label: 'TextBox',
        icon: 'Box',
        defaultProps: {
            name: 'Text1',
            value: '',
            placeholder: 'Text Box',
            visible: true,
            enabled: true,
            width: 100,
            height: 24,
            style: { border: '1px solid #ccc' },
        },
    },
    {
        type: COMPONENT_TYPES.EDIT_BOX,
        label: 'EditBox',
        icon: 'FileText',
        defaultProps: {
            name: 'Edit1',
            value: '',
            placeholder: 'Edit Box',
            visible: true,
            enabled: true,
            width: 100,
            height: 60,
            style: { border: '1px solid #ccc' },
        },
    },
    {
        type: COMPONENT_TYPES.BUTTON,
        label: 'Button',
        icon: 'MousePointerClick',
        defaultProps: {
            name: 'Command1',
            text: 'Button',
            visible: true,
            enabled: true,
            width: 80,
            height: 24,
            style: { backgroundColor: '#f0f0f0', border: '1px solid #999' },
        },
    },
    {
        type: COMPONENT_TYPES.CHECK_BOX,
        label: 'CheckBox',
        icon: 'CheckSquare',
        defaultProps: {
            name: 'Check1',
            label: 'Check Box',
            checked: false,
            visible: true,
            enabled: true,
            width: 100,
            height: 24,
            style: {},
        },
    },
    {
        type: COMPONENT_TYPES.RADIO,
        label: 'Radio',
        icon: 'CircleDot',
        defaultProps: {
            name: 'Option1',
            label: 'Radio Button',
            checked: false,
            visible: true,
            enabled: true,
            width: 100,
            height: 24,
            style: {},
        },
    },
    {
        type: COMPONENT_TYPES.SPINNER,
        label: 'Spinner',
        icon: 'Hash',
        defaultProps: {
            name: 'Spinner1',
            value: 0,
            visible: true,
            enabled: true,
            width: 60,
            height: 24,
            style: {},
        },
    },
    {
        type: COMPONENT_TYPES.COMBO_BOX,
        label: 'ComboBox',
        icon: 'List',
        defaultProps: {
            name: 'Combo1',
            options: ['Option 1', 'Option 2'],
            visible: true,
            enabled: true,
            width: 100,
            height: 24,
            style: {},
        },
    },
    {
        type: COMPONENT_TYPES.GRID,
        label: 'Grid',
        icon: 'Grid',
        defaultProps: {
            name: 'Grid1',
            columns: 3,
            rows: 3,
            visible: true,
            enabled: true,
            width: 200,
            height: 150,
            style: { border: '1px solid #ccc' },
        },
    },
    {
        type: COMPONENT_TYPES.SHAPE,
        label: 'Shape',
        icon: 'Square',
        defaultProps: {
            name: 'Shape1',
            visible: true,
            enabled: true,
            width: 50,
            height: 50,
            style: { border: '1px solid #000', backgroundColor: 'transparent' },
        },
    },
    {
        type: COMPONENT_TYPES.IMAGE,
        label: 'Image',
        icon: 'Image',
        defaultProps: {
            name: 'Image1',
            src: 'https://via.placeholder.com/50',
            visible: true,
            enabled: true,
            width: 50,
            height: 50,
            style: {},
            stretch: false,
            repeat: false,
        },
    },
    {
        type: COMPONENT_TYPES.CONTAINER,
        label: 'Container',
        icon: 'Layout',
        defaultProps: {
            name: 'Container1',
            visible: true,
            enabled: true,
            width: 200,
            height: 200,
            style: { border: '1px dashed #ccc' },
        },
    },
];
