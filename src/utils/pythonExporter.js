import { VFPRuntimeCode } from './templates/VFPRuntime.js';

const translateVFPtoPython = (vfpCode) => {
    if (!vfpCode) return "";
    let py = vfpCode;

    // Comments
    py = py.replace(/^\s*\*/gm, '#');
    py = py.replace(/&&/g, '#');

    // THISFORM replacements
    py = py.replace(/THISFORM\./gi, 'self.');
    py = py.replace(/THIS\./gi, 'self.');

    // Property access (basic heuristic)
    // Distinguish between SET (assignment) and GET (access)

    // .Caption
    py = py.replace(/\.Caption\s*=\s*(.+)/gi, '["text"] = $1');
    py = py.replace(/\.Caption/gi, '.cget("text")');

    // .Value (For Textbox/Editbox mainly)
    // Note: Setting value on Entry/Text is complex in one line without helper.
    // We will assume .get() for access. For assignment, we try to map to .insert if possible, but it's hard.
    // For now, let's map .Value access to .get()
    py = py.replace(/\.Value/gi, '.get()');

    // .BackColor
    py = py.replace(/\.BackColor\s*=\s*(.+)/gi, '["bg"] = $1');
    py = py.replace(/\.BackColor/gi, '.cget("bg")');

    // .ForeColor
    py = py.replace(/\.ForeColor\s*=\s*(.+)/gi, '["fg"] = $1');
    py = py.replace(/\.ForeColor/gi, '.cget("fg")');

    // .Enabled
    py = py.replace(/\.Enabled\s*=\s*\.T\./gi, '.config(state="normal")');
    py = py.replace(/\.Enabled\s*=\s*True/gi, '.config(state="normal")');
    py = py.replace(/\.Enabled\s*=\s*\.F\./gi, '.config(state="disabled")');
    py = py.replace(/\.Enabled\s*=\s*False/gi, '.config(state="disabled")');
    // If assigning variable: .Enabled = var -> complex, skip for now or map to config(state=...)

    // .Visible
    py = py.replace(/\.Visible\s*=\s*\.T\./gi, '.place()');
    py = py.replace(/\.Visible\s*=\s*True/gi, '.place()');
    py = py.replace(/\.Visible\s*=\s*\.F\./gi, '.place_forget()');
    py = py.replace(/\.Visible\s*=\s*False/gi, '.place_forget()');

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
    // Equality in comparisons (contextual)
    // Default is assignment (=), but in IF/ELIF/WHILE we assume comparison (==)
    py = py.replace(/^(\s*(?:if|elif|while)\s+)(.+)(:)/gmi, (match, start, content, end) => {
        return start + content.replace(/(?<![<>!])=(?!=)/g, '==') + end;
    });

    return py;
};

export const exportToPython = (widgets, customMethods, canvasSize, downloadFile, formEvents = {}, formProps = {}) => {
    let geometry = `${canvasSize.width}x${canvasSize.height}`;
    if (formProps.x || formProps.y) {
        geometry += `+${formProps.x || 0}+${formProps.y || 0}`;
    }
    let pyCode = `import tkinter as tk\nfrom tkinter import ttk\nfrom tkinter import messagebox\n\n${VFPRuntimeCode}\n\nclass Application(tk.Tk):\n    def __init__(self):\n        super().__init__()\n        self.geometry("${geometry}")\n        self.title("${formProps.caption || 'Form1'}")\n`;

    if (formProps.maxButton === false) {
        pyCode += `        self.resizable(False, False)\n`;
    }
    if (formProps.minButton === false) {
        pyCode += `        self.attributes('-toolwindow', True)\n`;
    }
    if (formProps.closable === false) {
        pyCode += `        self.protocol("WM_DELETE_WINDOW", lambda: None)\n`;
    }
    if (formProps.movable === false) {
        pyCode += `        self.overrideredirect(True)\n`;
    }

    pyCode += `        self.create_widgets()\n        self.init_custom()\n`;

    // Form Events (Load/Init)
    if (formEvents['Form1_Load']) pyCode += `        self.form_load()\n`;
    if (formEvents['Form1_Init']) pyCode += `        self.form_init()\n`;

    pyCode += `\n    def init_custom(self):\n        pass\n\n    def create_widgets(self):\n`;

    // Sort widgets to ensure parents are created before children
    const sortedWidgets = [...widgets].sort((a, b) => {
        // Simple depth check: roots first, then children
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

    // Map ID to Name for parent resolution
    const idToName = {};

    sortedWidgets.forEach(w => {
        // Use name from props if available (editable), fallback to internal name
        const n = w.props.name || w.name;
        idToName[w.id] = n;

        const p = w.props;
        // Extract style props if available, or fall back to direct props
        const style = p.style || {};
        const width = style.width ? parseInt(style.width) : (p.width || 0);
        const height = style.height ? parseInt(style.height) : (p.height || 0);
        const bg = style.backgroundColor || p.bg;
        const color = style.color || p.color;

        // Resolve Parent
        let parentVar = 'self';
        if (w.parentId && idToName[w.parentId]) {
            parentVar = `self.${idToName[w.parentId]}`;
        }

        pyCode += `        # ${n} (${w.type})\n`;
        if (w.type === 'label') pyCode += `        self.${n} = tk.Label(${parentVar}, text="${p.text}", fg="${color}")\n`;
        else if (w.type === 'textbox') { pyCode += `        self.${n} = tk.Entry(${parentVar})\n`; if (p.text) pyCode += `        self.${n}.insert(0, "${p.text}")\n`; }
        else if (w.type === 'button') {
            let opts = `text="${p.text}", bg="${bg}"`;
            if (p.enabled === false || p.disabled) opts += `, state="disabled"`;
            if (p.default) opts += `, default="active"`;
            if (p.hotkey && p.text) {
                const idx = p.text.toLowerCase().indexOf(p.hotkey.toLowerCase());
                if (idx !== -1) opts += `, underline=${idx}`;
            }
            pyCode += `        self.${n} = tk.Button(${parentVar}, ${opts})\n`;
            if (p.cancel) pyCode += `        self.bind('<Escape>', lambda e: self.${n}.invoke())\n`;
            if (p.default) pyCode += `        self.bind('<Return>', lambda e: self.${n}.invoke())\n`;
            if (p.hotkey) {
                pyCode += `        self.bind('<Alt-${p.hotkey.toLowerCase()}>', lambda e: self.${n}.invoke())\n`;
                pyCode += `        self.bind('<Alt-${p.hotkey.toUpperCase()}>', lambda e: self.${n}.invoke())\n`;
            }
        }
        else if (w.type === 'checkbox') {
            let opts = `text="${p.label}", variable=self.${n}_var`;
            if (p.enabled === false || p.disabled) opts += `, state="disabled"`;
            if (p.hotkey && p.label) {
                const idx = p.label.toLowerCase().indexOf(p.hotkey.toLowerCase());
                if (idx !== -1) opts += `, underline=${idx}`;
            }
            pyCode += `        self.${n}_var = tk.BooleanVar(value=${p.checked ? 'True' : 'False'})\n        self.${n} = tk.Checkbutton(${parentVar}, ${opts})\n`;
            if (p.hotkey) {
                pyCode += `        self.bind('<Alt-${p.hotkey.toLowerCase()}>', lambda e: self.${n}.invoke())\n`;
                pyCode += `        self.bind('<Alt-${p.hotkey.toUpperCase()}>', lambda e: self.${n}.invoke())\n`;
            }
        }
        else if (w.type === 'radio') {
            let opts = `text="${p.label}", value="${n}"`;
            if (p.enabled === false || p.disabled) opts += `, state="disabled"`;
            if (p.hotkey && p.label) {
                const idx = p.label.toLowerCase().indexOf(p.hotkey.toLowerCase());
                if (idx !== -1) opts += `, underline=${idx}`;
            }
            pyCode += `        self.${n} = tk.Radiobutton(${parentVar}, ${opts})\n`;
            if (p.hotkey) {
                pyCode += `        self.bind('<Alt-${p.hotkey.toLowerCase()}>', lambda e: self.${n}.invoke())\n`;
                pyCode += `        self.bind('<Alt-${p.hotkey.toUpperCase()}>', lambda e: self.${n}.invoke())\n`;
            }
        }
        else if (w.type === 'combobox') pyCode += `        self.${n} = ttk.Combobox(${parentVar}, values=[${p.options ? p.options.map(i => `"${i.trim()}"`).join(', ') : ''}])\n`;
        else if (w.type === 'grid') {
            const cols = p.columns || 3;
            let colIds = [];
            let headers = [];

            if (Array.isArray(cols)) {
                // Detailed columns
                colIds = cols.map((c, i) => `col${i + 1}`);
                headers = cols.map(c => c.header || `Col${i + 1}`);
            } else {
                // Simple number or string
                const count = typeof cols === 'number' ? cols : cols.split(',').length;
                colIds = Array.from({ length: count }, (_, i) => `col${i + 1}`);
                headers = typeof cols === 'number' ? colIds.map(c => c) : cols.split(',');
            }

            pyCode += `        self.${n}_frame = tk.Frame(${parentVar})\n        self.${n} = ttk.Treeview(self.${n}_frame, columns=(${colIds.map(c => `"${c}"`).join(',')}), show='headings')\n`;

            // Set headers
            colIds.forEach((id, i) => {
                pyCode += `        self.${n}.heading("${id}", text="${headers[i]}")\n`;
                if (Array.isArray(cols) && cols[i].width) {
                    pyCode += `        self.${n}.column("${id}", width=${cols[i].width})\n`;
                }
            });

            pyCode += `        self.${n}.pack(fill='both', expand=True)\n`;
        }
        else if (w.type === 'shape') pyCode += `        self.${n} = tk.Frame(${parentVar}, bg="${bg}")\n`;
        else if (w.type === 'image') pyCode += `        self.${n}_lbl = tk.Label(${parentVar}, text="[Image]", bg="#ccc")\n`;
        else if (w.type === 'editbox') { pyCode += `        self.${n} = tk.Text(${parentVar})\n`; if (p.text) pyCode += `        self.${n}.insert("1.0", "${p.text.replace(/\n/g, '\\n')}")\n`; }
        else if (w.type === 'spinner') { pyCode += `        self.${n} = tk.Spinbox(${parentVar}, from_=0, to=100)\n        self.${n}.delete(0,"end")\n        self.${n}.insert(0, "${p.value || 0}")\n`; }
        else if (w.type === 'container') {
            const bgParam = bg && bg !== 'transparent' ? `, bg="${bg}"` : '';
            pyCode += `        self.${n} = tk.Frame(${parentVar}${bgParam}, highlightbackground="#ccc", highlightthickness=1)\n`;
        }
        else if (w.type === 'pageframe') {
            pyCode += `        self.${n} = ttk.Notebook(${parentVar})\n`;
        }
        else if (w.type === 'page') {
            pyCode += `        self.${n} = tk.Frame(${parentVar})\n        ${parentVar}.add(self.${n}, text="${p.caption || p.name}")\n`;
        }

        const target = (w.type === 'grid') ? `${n}_frame` : (w.type === 'image' ? `${n}_lbl` : n);
        if (w.props.enabled === false) pyCode += `        try: self.${target}.config(state='disabled')\n        except: pass\n`;

        // Bind Events
        const clickCode = formEvents[`${w.id}_Click`] || formEvents[`${w.id}_click`];
        if (clickCode) {
            if (['button', 'checkbox', 'radio'].includes(w.type)) {
                pyCode += `        self.${n}.config(command=self.${n}_click)\n`;
            } else {
                pyCode += `        self.${n}.bind('<Button-1>', self.${n}_click)\n`;
            }
        }

        const changeCode = formEvents[`${w.id}_InteractiveChange`] || formEvents[`${w.id}_interactivechange`];
        if (changeCode) {
            if (['textbox', 'editbox', 'spinner'].includes(w.type)) pyCode += `        self.${n}.bind('<KeyRelease>', self.${n}_interactiveChange)\n`;
            else if (w.type === 'combobox') pyCode += `        self.${n}.bind('<<ComboboxSelected>>', self.${n}_interactiveChange)\n`;
        }

        const initCode = formEvents[`${w.id}_Init`] || formEvents[`${w.id}_init`];
        if (initCode) pyCode += `        self.${n}_init()\n`;


        if (w.props.visible !== false && w.type !== 'page') pyCode += `        self.${target}.place(x=${w.x}, y=${w.y}, width=${width}, height=${height})\n\n`;
    });

    if (widgets.length === 0) {
        pyCode += `        pass\n\n`;
    }

    // Generate Event Handlers
    // 1. Form Events
    if (formEvents['Form1_Load']) {
        const translatedCode = translateVFPtoPython(formEvents['Form1_Load']);
        pyCode += `    def form_load(self):\n` + (translatedCode.split('\n').map(l => `        ${l}`).join('\n') || '        pass') + `\n\n`;
    }
    if (formEvents['Form1_Init']) {
        const translatedCode = translateVFPtoPython(formEvents['Form1_Init']);
        pyCode += `    def form_init(self):\n` + (translatedCode.split('\n').map(l => `        ${l}`).join('\n') || '        pass') + `\n\n`;
    }

    // 2. Widget Events
    widgets.forEach(w => {
        const events = ['Click', 'InteractiveChange', 'Init', 'RightClick', 'GotFocus', 'LostFocus'];
        const wName = w.props.name || w.name;
        events.forEach(evt => {
            const code = formEvents[`${w.id}_${evt}`] || formEvents[`${w.id}_${evt.toLowerCase()}`];
            if (code && code.trim() !== "") {
                const translatedCode = translateVFPtoPython(code);
                // Python method name: widgetName_event
                // Note: InteractiveChange -> interactiveChange (camelCase in VFP usually, but let's stick to one convention)
                // Let's use the event name as suffix
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

    pyCode += `if __name__ == "__main__":\n    app = Application()\n    app.mainloop()\n`;

    // Enforce CRLF
    const crlfCode = pyCode.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    downloadFile('app.py', crlfCode, 'text/plain');
};
