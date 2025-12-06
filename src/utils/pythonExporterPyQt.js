import { VFPRuntimeCodePyQt } from './templates/VFPRuntimePyQt.js';

const translateVFPtoPython = (vfpCode) => {
    if (!vfpCode) return "";
    let py = vfpCode;

    // Comments
    py = py.replace(/^\s*\*/gm, '#');
    py = py.replace(/&&/g, '#');

    // THISFORM replacements
    py = py.replace(/THISFORM\./gi, 'self.');
    py = py.replace(/THIS\./gi, 'self.');

    // Property access

    // .Caption -> .setText() / .text()
    // Setter: .Caption = "Value" -> .setText("Value")
    py = py.replace(/\.Caption\s*=\s*(.+)/gi, '.setText($1)');
    // Getter: .Caption -> .text()
    py = py.replace(/\.Caption/gi, '.text()');

    // .Value -> heuristic
    // For PyQt, standardizing on .text() is capable for LineEdit/Label/Button
    // But .value() is for SpinBox. .isChecked() for Checkbox.
    // Since we don't know the type here, we might need to guess or use a custom helper method in the runtime?
    // But strictly following the prompt to "update code", let's map .Value to .text() as the most common case (TextBox).
    py = py.replace(/\.Value/gi, '.text()');

    // .BackColor -> .setStyleSheet("background-color: ...")
    // This is tricky because existing styles might be overwritten.
    // For now, simple replacement:
    py = py.replace(/\.BackColor\s*=\s*(.+)/gi, '.setStyleSheet(f"background-color: {$1}")');
    // Getter is hard in PyQt (requires parsing stylesheet or palette). 
    // pythonExporter.js mapped .BackColor to .cget("bg").
    // Let's comment this or leave as todo, or map to a helper? 
    // Let's not support getter for BackColor in this simple pass or return empty string.
    py = py.replace(/\.BackColor/gi, '"" # BackColor getter reserved');

    // .ForeColor -> .setStyleSheet("color: ...")
    py = py.replace(/\.ForeColor\s*=\s*(.+)/gi, '.setStyleSheet(f"color: {$1}")');
    py = py.replace(/\.ForeColor/gi, '"" # ForeColor getter reserved');

    // .Enabled
    py = py.replace(/\.Enabled\s*=\s*\.T\./gi, '.setEnabled(True)');
    py = py.replace(/\.Enabled\s*=\s*True/gi, '.setEnabled(True)');
    py = py.replace(/\.Enabled\s*=\s*\.F\./gi, '.setEnabled(False)');
    py = py.replace(/\.Enabled\s*=\s*False/gi, '.setEnabled(False)');

    // .Visible
    py = py.replace(/\.Visible\s*=\s*\.T\./gi, '.setVisible(True)');
    py = py.replace(/\.Visible\s*=\s*True/gi, '.setVisible(True)');
    py = py.replace(/\.Visible\s*=\s*\.F\./gi, '.setVisible(False)');
    py = py.replace(/\.Visible\s*=\s*False/gi, '.setVisible(False)');

    // Control Structures
    py = py.replace(/IF\s+(.+)/gi, 'if $1:');
    py = py.replace(/ELSE/gi, 'else:');
    py = py.replace(/ENDIF/gi, '');

    py = py.replace(/DO CASE/gi, 'if True: # Case start');
    py = py.replace(/CASE\s+(.+)/gi, 'elif $1:');
    py = py.replace(/OTHERWISE/gi, 'else:');
    py = py.replace(/ENDCASE/gi, '');

    py = py.replace(/FOR\s+(.+)\s*=\s*(.+)\s+TO\s+(.+)/gi, 'for $1 in range($2, $3 + 1):');
    py = py.replace(/ENDFOR/gi, '');
    py = py.replace(/NEXT/gi, '');

    // MessageBox
    py = py.replace(/MESSAGEBOX\(([^)]+)\)/gi, 'VFPRuntime.MessageBox($1)');

    // Logical operators
    py = py.replace(/\.T\./gi, 'True');
    py = py.replace(/\.F\./gi, 'False');
    py = py.replace(/\.AND\./gi, 'and');
    py = py.replace(/\.OR\./gi, 'or');
    py = py.replace(/\.NOT\./gi, 'not');
    py = py.replace(/<>/g, '!=');
    // Equality
    py = py.replace(/^(\s*(?:if|elif|while)\s+)(.+)(:)/gmi, (match, start, content, end) => {
        return start + content.replace(/(?<![<>!])=(?!=)/g, '==') + end;
    });

    return py;
};

export const exportToPython = (widgets, customMethods, canvasSize, downloadFile, formEvents = {}, formProps = {}) => {
    let width = parseInt(canvasSize.width);
    let height = parseInt(canvasSize.height);
    let x = formProps.x || 100;
    let y = formProps.y || 100;

    let pyCode = `import sys
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QLabel, QPushButton, 
                             QLineEdit, QTextEdit, QCheckBox, QRadioButton, QComboBox, 
                             QFrame, QSpinBox, QTreeWidget, QTreeWidgetItem, QTabWidget, QMessageBox)
from PyQt6.QtCore import Qt

${VFPRuntimeCodePyQt}

class Application(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setGeometry(${x}, ${y}, ${width}, ${height})
        self.setWindowTitle("${formProps.caption || 'Form1'}")
        self.central_widget = QWidget()
        self.setCentralWidget(self.central_widget)
`;

    if (formProps.maxButton === false) {
        // PyQt doesn't have a direct attribute for this without window flags
        pyCode += `        self.setWindowFlag(Qt.WindowType.WindowMaximizeButtonHint, False)\n`;
    }
    if (formProps.minButton === false) {
        pyCode += `        self.setWindowFlag(Qt.WindowType.WindowMinimizeButtonHint, False)\n`;
    }
    if (formProps.closable === false) {
        pyCode += `        self.setWindowFlag(Qt.WindowType.WindowCloseButtonHint, False)\n`;
    }
    if (formProps.movable === false) {
        pyCode += `        self.setWindowFlag(Qt.WindowType.FramelessWindowHint, True)\n`;
    }

    pyCode += `        self.create_widgets()\n        self.init_custom()\n`;

    // Form Events
    if (formEvents['Form1_Load']) pyCode += `        self.form_load()\n`;
    if (formEvents['Form1_Init']) pyCode += `        self.form_init()\n`;

    pyCode += `\n    def init_custom(self):\n        pass\n\n    def create_widgets(self):\n`;

    // Parent resolution helper
    // In PyQt, we pass parent (QWidget) to constructor.
    // For absolute positioning, widgets are children of central_widget or their container.

    const sortedWidgets = [...widgets].sort((a, b) => {
        const getDepth = (id) => {
            let depth = 0;
            let current = widgets.find(w => w.id === id);
            while (current && current.parentId) {
                depth++;
                current = widgets.find(w => w.id === current.parentId);
            }
            return depth;
        };
        return getDepth(a.id) - getDepth(b.id);
    });

    const idToName = {};

    sortedWidgets.forEach(w => {
        const n = w.props.name || w.name;
        idToName[w.id] = n;

        const p = w.props;
        const style = p.style || {};
        const width = style.width ? parseInt(style.width) : (p.width || 0);
        const height = style.height ? parseInt(style.height) : (p.height || 0);
        const bg = style.backgroundColor || p.bg;
        const color = style.color || p.color;

        // Resolve Parent
        let parentVar = 'self.central_widget';
        if (w.parentId && idToName[w.parentId]) {
            parentVar = `self.${idToName[w.parentId]}`;
        }

        pyCode += `        # ${n} (${w.type})\n`;

        // Helper for style sheet
        let css = "";
        if (bg) css += `background-color: ${bg}; `;
        if (color) css += `color: ${color}; `;

        if (w.type === 'label') {
            pyCode += `        self.${n} = QLabel("${p.text || ''}", ${parentVar})\n`;
        }
        else if (w.type === 'textbox') {
            pyCode += `        self.${n} = QLineEdit(${parentVar})\n`;
            if (p.text) pyCode += `        self.${n}.setText("${p.text}")\n`;
        }
        else if (w.type === 'button') {
            pyCode += `        self.${n} = QPushButton("${p.text || ''}", ${parentVar})\n`;
            if (p.enabled === false) pyCode += `        self.${n}.setEnabled(False)\n`;
            if (p.default) pyCode += `        self.${n}.setDefault(True)\n`;
        }
        else if (w.type === 'checkbox') {
            pyCode += `        self.${n} = QCheckBox("${p.label || ''}", ${parentVar})\n`;
            if (p.checked) pyCode += `        self.${n}.setChecked(True)\n`;
        }
        else if (w.type === 'radio') {
            pyCode += `        self.${n} = QRadioButton("${p.label || ''}", ${parentVar})\n`;
        }
        else if (w.type === 'combobox') {
            pyCode += `        self.${n} = QComboBox(${parentVar})\n`;
            if (p.options) {
                const items = p.options.map(i => `"${i.trim()}"`).join(', ');
                pyCode += `        self.${n}.addItems([${items}])\n`;
            }
        }
        else if (w.type === 'grid') {
            // TreeWidget for grid
            pyCode += `        self.${n} = QTreeWidget(${parentVar})\n`;

            const cols = p.columns || 3;
            let headers = [];
            if (Array.isArray(cols)) {
                headers = cols.map((c, i) => c.header || `Col${i + 1}`);
            } else {
                const count = typeof cols === 'number' ? cols : cols.split(',').length;
                const colIds = typeof cols === 'number' ? Array.from({ length: count }, (_, i) => `Col${i + 1}`) : cols.split(',');
                headers = colIds;
            }
            pyCode += `        self.${n}.setHeaderLabels([${headers.map(h => `"${h}"`).join(', ')}])\n`;
        }
        else if (w.type === 'shape') {
            pyCode += `        self.${n} = QFrame(${parentVar})\n`;
            pyCode += `        self.${n}.setFrameShape(QFrame.Shape.Box)\n`;
        }
        else if (w.type === 'image') {
            pyCode += `        self.${n} = QLabel(${parentVar})\n`;
            pyCode += `        self.${n}.setText("[Image placeholder]")\n`;
            pyCode += `        self.${n}.setStyleSheet("background-color: #ccc; border: 1px solid black")\n`;
        }
        else if (w.type === 'editbox') {
            pyCode += `        self.${n} = QTextEdit(${parentVar})\n`;
            if (p.text) pyCode += `        self.${n}.setText("${p.text.replace(/\n/g, '\\n')}")\n`;
        }
        else if (w.type === 'spinner') {
            pyCode += `        self.${n} = QSpinBox(${parentVar})\n`;
            pyCode += `        self.${n}.setValue(${p.value || 0})\n`;
        }
        else if (w.type === 'container') {
            pyCode += `        self.${n} = QFrame(${parentVar})\n`;
            // Add border to see it
            if (!css.includes('border')) css += `border: 1px solid #ccc; `;
        }
        else if (w.type === 'pageframe') {
            pyCode += `        self.${n} = QTabWidget(${parentVar})\n`;
        }
        else if (w.type === 'page') {
            pyCode += `        self.${n} = QWidget()\n        ${parentVar}.addTab(self.${n}, "${p.caption || p.name}")\n`;
        }

        // Apply Styles
        if (css) {
            pyCode += `        self.${n}.setStyleSheet("${css}")\n`;
        }

        // Geometry (Positioning)
        if (w.type !== 'page') { // Pages are managed by TabWidget
            // Relative positioning inside parent
            // However, VisualFormBuilder uses absolute coordinates relative to Form usually?
            // If nested, w.x/w.y are relative to parent container in the JSON?
            // Assuming w.x, w.y are relative to parent (which VFB usually does for containers),
            // QWidget based parents support manual positioning.
            pyCode += `        self.${n}.setGeometry(${w.x}, ${w.y}, ${width}, ${height})\n`;
        }
        if (w.props.visible === false) {
            pyCode += `        self.${n}.hide()\n`;
        }

        // Events
        const clickCode = formEvents[`${w.id}_Click`] || formEvents[`${w.id}_click`];
        if (clickCode) {
            if (['button', 'checkbox', 'radio'].includes(w.type)) {
                pyCode += `        self.${n}.clicked.connect(self.${n}_click)\n`;
            }
            // For other widgets, we might need eventFilter or mousePressEvent override.
            // Keeping it simple for buttons for now.
        }

        const changeCode = formEvents[`${w.id}_InteractiveChange`] || formEvents[`${w.id}_interactivechange`];
        if (changeCode) {
            if (w.type === 'textbox' || w.type === 'editbox') {
                pyCode += `        self.${n}.textChanged.connect(self.${n}_interactiveChange)\n`;
            } else if (w.type === 'combobox') {
                pyCode += `        self.${n}.currentIndexChanged.connect(self.${n}_interactiveChange)\n`;
            }
        }

        const initCode = formEvents[`${w.id}_Init`] || formEvents[`${w.id}_init`];
        if (initCode) pyCode += `        self.${n}_init()\n`;

        pyCode += `\n`;
    });

    if (widgets.length === 0) {
        pyCode += `        pass\n\n`;
    }

    // Generate Event Handlers
    // Form Events
    if (formEvents['Form1_Load']) {
        const translatedCode = translateVFPtoPython(formEvents['Form1_Load']);
        pyCode += `    def form_load(self):\n` + (translatedCode.split('\n').map(l => `        ${l}`).join('\n') || '        pass') + `\n\n`;
    }
    if (formEvents['Form1_Init']) {
        const translatedCode = translateVFPtoPython(formEvents['Form1_Init']);
        pyCode += `    def form_init(self):\n` + (translatedCode.split('\n').map(l => `        ${l}`).join('\n') || '        pass') + `\n\n`;
    }

    // Widget Events
    widgets.forEach(w => {
        const events = ['Click', 'InteractiveChange', 'Init', 'RightClick', 'GotFocus', 'LostFocus'];
        const wName = w.props.name || w.name;
        events.forEach(evt => {
            const code = formEvents[`${w.id}_${evt}`] || formEvents[`${w.id}_${evt.toLowerCase()}`];
            if (code && code.trim() !== "") {
                const translatedCode = translateVFPtoPython(code);
                pyCode += `    def ${wName}_${evt === 'InteractiveChange' ? 'interactiveChange' : evt.toLowerCase()}(self, event=None):\n` + (translatedCode.split('\n').map(l => `        ${l}`).join('\n') || '        pass') + `\n\n`;
            }
        });
    });

    if (customMethods && customMethods.length > 0) {
        pyCode += `    # --- VLASTNÍ METODY ---\n`;
        customMethods.forEach(m => {
            const translatedCode = translateVFPtoPython(m.code);
            pyCode += `    def ${m.name}(${m.args}):\n` + (translatedCode.split('\n').map(l => `        ${l}`).join('\n') || '        pass') + `\n\n`;
        });
    }

    pyCode += `if __name__ == "__main__":\n    app = QApplication(sys.argv)\n    window = Application()\n    window.show()\n    sys.exit(app.exec())\n`;

    // Enforce CRLF
    const crlfCode = pyCode.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // Wait, CRLF on windows: \r\n. The logic in original file was replacing \r\n with \n then doing nothing? 
    // Actually standard JS strings use \n. 
    // If we want CRLF file, we should replace \n with \r\n. 
    // Original code: `const crlfCode = pyCode.replace(/\r\n/g, '\n').replace(/\r/g, '\n');` 
    // This actually normalized it to LF. I'll stick to LF, it works on python.

    downloadFile('app.py', crlfCode, 'text/plain');
};
