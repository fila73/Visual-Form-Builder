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
    // .Value -> .get() for input widgets (simplified)
    py = py.replace(/\.Value/gi, '.get()');
    py = py.replace(/\.Caption/gi, '.cget("text")');
    py = py.replace(/\.Enabled\s*=\s*\.T\./gi, '.config(state="normal")');
    py = py.replace(/\.Enabled\s*=\s*\.F\./gi, '.config(state="disabled")');
    py = py.replace(/\.Visible\s*=\s*\.T\./gi, '.place()'); // Complex to handle perfectly, placeholder
    py = py.replace(/\.Visible\s*=\s*\.F\./gi, '.place_forget()');

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
    py = py.replace(/MESSAGEBOX\(([^,]+)(?:,\s*[^,]+)?(?:,\s*[^,]+)?\)/gi, 'messagebox.showinfo("Info", $1)');

    // Logical operators
    py = py.replace(/\.T\./gi, 'True');
    py = py.replace(/\.F\./gi, 'False');
    py = py.replace(/\.AND\./gi, 'and');
    py = py.replace(/\.OR\./gi, 'or');
    py = py.replace(/\.NOT\./gi, 'not');
    py = py.replace(/<>/g, '!=');
    py = py.replace(/=/g, '=='); // Careful with assignment vs equality, this is risky but VFP uses = for both. 
    // Contextual fix: if line starts with var =, it's assignment.
    py = py.replace(/^(\s*\w+)\s*==\s*(.+)/gm, '$1 = $2'); // Revert assignment back to =

    return py;
};

export const exportToPython = (widgets, customMethods, canvasSize, downloadFile) => {
    let pyCode = `import tkinter as tk\nfrom tkinter import ttk\nfrom tkinter import messagebox\n\nclass Application(tk.Tk):\n    def __init__(self):\n        super().__init__()\n        self.geometry("${canvasSize.width}x${canvasSize.height}")\n        self.create_widgets()\n        self.init_custom()\n\n    def init_custom(self):\n        pass\n\n    def create_widgets(self):\n`;

    widgets.forEach(w => {
        const n = w.name; const p = w.props;
        pyCode += `        # ${n} (${w.type})\n`;
        if (w.type === 'LABEL') pyCode += `        self.${n} = tk.Label(self, text="${p.text}", fg="${p.color}")\n`;
        else if (w.type === 'TEXTBOX') { pyCode += `        self.${n} = tk.Entry(self)\n`; if (p.text) pyCode += `        self.${n}.insert(0, "${p.text}")\n`; }
        else if (w.type === 'BUTTON') { pyCode += `        self.${n} = tk.Button(self, text="${p.text}", bg="${p.bg}")\n`; }
        else if (w.type === 'CHECKBOX') { pyCode += `        self.${n}_var = tk.BooleanVar(value=${p.checked ? 'True' : 'False'})\n        self.${n} = tk.Checkbutton(self, text="${p.text}", variable=self.${n}_var)\n`; }
        else if (w.type === 'RADIO') pyCode += `        self.${n} = tk.Radiobutton(self, text="${p.text}", value="${n}")\n`;
        else if (w.type === 'COMBO') pyCode += `        self.${n} = ttk.Combobox(self, values=[${p.items.split(',').map(i => `"${i.trim()}"`).join(', ')}])\n`;
        else if (w.type === 'GRID') { pyCode += `        self.${n}_frame = tk.Frame(self)\n        self.${n} = ttk.Treeview(self.${n}_frame, columns=(${p.columns.split(',').map(c => `"${c.trim()}"`).join(',')}), show='headings')\n`; p.columns.split(',').forEach(c => pyCode += `        self.${n}.heading("${c.trim()}", text="${c.trim()}")\n`); pyCode += `        self.${n}.pack(fill='both', expand=True)\n`; }
        else if (w.type === 'SHAPE') pyCode += `        self.${n} = tk.Frame(self, bg="${p.bg}")\n`;
        else if (w.type === 'IMAGE') pyCode += `        self.${n}_lbl = tk.Label(self, text="[Image]", bg="#ccc")\n`;
        else if (w.type === 'EDITBOX') { pyCode += `        self.${n} = tk.Text(self)\n`; if (p.text) pyCode += `        self.${n}.insert("1.0", "${p.text.replace(/\n/g, '\\n')}")\n`; }
        else if (w.type === 'SPINNER') { pyCode += `        self.${n} = tk.Spinbox(self, from_=0, to=100)\n        self.${n}.delete(0,"end")\n        self.${n}.insert(0, "${p.text}")\n`; }
        else if (w.type === 'CONTAINER') {
            const bgParam = p.bg && p.bg !== 'transparent' ? `, bg="${p.bg}"` : '';
            pyCode += `        self.${n} = tk.Frame(self${bgParam}, highlightbackground="#ccc", highlightthickness=${p.borderWidth})\n`;
        }

        const target = (w.type === 'GRID') ? `${n}_frame` : (w.type === 'IMAGE' ? `${n}_lbl` : n);
        if (w.props.enabled === false) pyCode += `        try: self.${target}.config(state='disabled')\n        except: pass\n`;

        if (w.events) {
            if (w.events.click) {
                if (['BUTTON', 'CHECKBOX', 'RADIO'].includes(w.type)) {
                    pyCode += `        self.${n}.config(command=self.${n}_click)\n`;
                } else {
                    pyCode += `        self.${n}.bind('<Button-1>', self.${n}_click)\n`;
                }
            }
            if (w.events.interactiveChange) {
                if (['TEXTBOX', 'EDITBOX', 'SPINNER'].includes(w.type)) pyCode += `        self.${n}.bind('<KeyRelease>', self.${n}_interactiveChange)\n`;
                else if (w.type === 'COMBO') pyCode += `        self.${n}.bind('<<ComboboxSelected>>', self.${n}_interactiveChange)\n`;
            }
            if (w.events.init) pyCode += `        self.${n}_init()\n`;
        }

        if (w.props.visible !== false) pyCode += `        self.${target}.place(x=${w.x}, y=${w.y}, width=${p.width}, height=${p.height})\n\n`;
    });

    widgets.forEach(w => {
        if (w.events) {
            Object.keys(w.events).forEach(evt => {
                if (w.events[evt] && w.events[evt].trim() !== "") {
                    const translatedCode = translateVFPtoPython(w.events[evt]);
                    pyCode += `    def ${w.name}_${evt}(self, event=None):\n` + (translatedCode.split('\n').map(l => `        ${l}`).join('\n') || '        pass') + `\n\n`;
                }
            });
        }
    });

    if (customMethods.length > 0) {
        pyCode += `    # --- VLASTNÍ METODY ---\n`;
        customMethods.forEach(m => {
            const translatedCode = translateVFPtoPython(m.code);
            pyCode += `    def ${m.name}(${m.args}):\n` + (translatedCode.split('\n').map(l => `        ${l}`).join('\n') || '        pass') + `\n\n`;
        });
    }

    pyCode += `if __name__ == "__main__":\n    app = Application()\n    app.mainloop()\n`;
    downloadFile('app.py', pyCode, 'text/plain');
};
