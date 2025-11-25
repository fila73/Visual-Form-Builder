
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

export const componentRegistry = [
    {
        type: COMPONENT_TYPES.LABEL,
        label: 'Label',
        icon: 'Type',
        defaultProps: {
            text: 'Label',
            visible: true,
            enabled: true,
            style: { fontSize: '14px', color: '#000' },
        },
    },
    {
        type: COMPONENT_TYPES.TEXT_BOX,
        label: 'TextBox',
        icon: 'Box',
        defaultProps: {
            value: '',
            placeholder: 'Text Box',
            visible: true,
            enabled: true,
            style: { width: '100px', height: '24px', border: '1px solid #ccc' },
        },
    },
    {
        type: COMPONENT_TYPES.EDIT_BOX,
        label: 'EditBox',
        icon: 'FileText',
        defaultProps: {
            value: '',
            placeholder: 'Edit Box',
            visible: true,
            enabled: true,
            style: { width: '100px', height: '60px', border: '1px solid #ccc' },
        },
    },
    {
        type: COMPONENT_TYPES.BUTTON,
        label: 'Button',
        icon: 'MousePointerClick',
        defaultProps: {
            text: 'Button',
            visible: true,
            enabled: true,
            style: { width: '80px', height: '24px', backgroundColor: '#f0f0f0', border: '1px solid #999' },
        },
    },
    {
        type: COMPONENT_TYPES.CHECK_BOX,
        label: 'CheckBox',
        icon: 'CheckSquare',
        defaultProps: {
            label: 'Check Box',
            checked: false,
            visible: true,
            enabled: true,
            style: {},
        },
    },
    {
        type: COMPONENT_TYPES.RADIO,
        label: 'Radio',
        icon: 'CircleDot',
        defaultProps: {
            label: 'Radio Button',
            checked: false,
            visible: true,
            enabled: true,
            style: {},
        },
    },
    {
        type: COMPONENT_TYPES.SPINNER,
        label: 'Spinner',
        icon: 'Hash',
        defaultProps: {
            value: 0,
            visible: true,
            enabled: true,
            style: { width: '60px' },
        },
    },
    {
        type: COMPONENT_TYPES.COMBO_BOX,
        label: 'ComboBox',
        icon: 'List',
        defaultProps: {
            options: ['Option 1', 'Option 2'],
            visible: true,
            enabled: true,
            style: { width: '100px' },
        },
    },
    {
        type: COMPONENT_TYPES.GRID,
        label: 'Grid',
        icon: 'Grid',
        defaultProps: {
            columns: 3,
            rows: 3,
            visible: true,
            enabled: true,
            style: { width: '200px', height: '150px', border: '1px solid #ccc' },
        },
    },
    {
        type: COMPONENT_TYPES.SHAPE,
        label: 'Shape',
        icon: 'Square',
        defaultProps: {
            visible: true,
            enabled: true,
            style: { width: '50px', height: '50px', border: '1px solid #000', backgroundColor: 'transparent' },
        },
    },
    {
        type: COMPONENT_TYPES.IMAGE,
        label: 'Image',
        icon: 'Image',
        defaultProps: {
            src: 'https://via.placeholder.com/50',
            visible: true,
            enabled: true,
            style: { width: '50px', height: '50px' },
        },
    },
    {
        type: COMPONENT_TYPES.CONTAINER,
        label: 'Container',
        icon: 'Layout',
        defaultProps: {
            visible: true,
            enabled: true,
            style: { width: '200px', height: '200px', border: '1px dashed #ccc' },
        },
    },
];
