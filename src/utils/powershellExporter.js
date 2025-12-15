
const translateVFPtoPowerShell = (vfpCode) => {
    if (!vfpCode) return "";
    let ps = vfpCode;

    // Comments
    ps = ps.replace(/^\s*\*/gm, '#');
    ps = ps.replace(/&&/g, '#');

    // THISFORM replacements
    // In WinForms: $form
    // In WPF: $window (or $form)
    ps = ps.replace(/THISFORM\./gi, '$form.');
    ps = ps.replace(/THIS\./gi, '$this.');

    // Property access
    // .Caption -> .Text (WinForms) / .Content or .Title (WPF)
    // We will do generic replacements that might work for WinForms primarily
    ps = ps.replace(/\.Caption/gi, '.Text');
    ps = ps.replace(/\.Value/gi, '.Text'); // Basic assumption

    // Logical operators
    ps = ps.replace(/\.T\./gi, '$true');
    ps = ps.replace(/\.F\./gi, '$false');
    ps = ps.replace(/\.AND\./gi, '-and');
    ps = ps.replace(/\.OR\./gi, '-or');
    ps = ps.replace(/\.NOT\./gi, '-not');
    ps = ps.replace(/<>/g, '-ne');
    ps = ps.replace(/=/g, '-eq'); // PowerShell uses -eq for comparison, but = for assignment. This is tricky.
    // We will leave = as is, assuming assignment, and hope user fixes comparisons or we use heuristics.
    // Heuristic: IF x = y -> IF ($x -eq $y)
    ps = ps.replace(/^(\s*(?:if|elseif|while)\s+)(.+)/gmi, (match, start, content) => {
        return start + content.replace(/=/g, '-eq');
    });

    // Control Structures
    ps = ps.replace(/IF\s+(.+)/gi, 'if ($1) {');
    ps = ps.replace(/ELSE/gi, '} else {');
    ps = ps.replace(/ENDIF/gi, '}');

    ps = ps.replace(/DO CASE/gi, '# Switch/Case start');
    ps = ps.replace(/CASE\s+(.+)/gi, 'if ($1) {'); // Naive case mapping
    ps = ps.replace(/ENDCASE/gi, '}');

    ps = ps.replace(/FOR\s+(.+)\s*=\s*(.+)\s+TO\s+(.+)/gi, 'for ($$1 = $2; $$1 -le $3; $$1++) {');
    ps = ps.replace(/ENDFOR/gi, '}');
    ps = ps.replace(/NEXT/gi, '}');

    // MessageBox
    ps = ps.replace(/MESSAGEBOX\(([^)]+)\)/gi, '[System.Windows.Forms.MessageBox]::Show($1)');

    return ps;
};

// --- WINFORMS EXPORTER ---
export const exportToPowerShellWinForms = (widgets, customMethods, canvasSize, downloadFile, formEvents = {}, formProps = {}) => {
    const width = parseInt(canvasSize.width);
    const height = parseInt(canvasSize.height);
    const caption = formProps.caption || 'Form1';

    let psCode = `Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.Text = "${caption}"
$form.Size = New-Object System.Drawing.Size(${width}, ${height})
$form.StartPosition = "Manual"
$form.Location = New-Object System.Drawing.Point(${formProps.x || 100}, ${formProps.y || 100})
`;

    if (formProps.maxButton === false) psCode += `$form.MaximizeBox = $false\n`;
    if (formProps.minButton === false) psCode += `$form.MinimizeBox = $false\n`;
    if (formProps.closable === false) psCode += `$form.ControlBox = $false\n`; // Closable usually implies ControlBox or custom handling
    if (formProps.movable === false) psCode += `$form.FormBorderStyle = "None"\n`;

    psCode += `\n# --- Widgets ---\n`;

    widgets.forEach(w => {
        const n = w.props.name || w.name;
        // Sanitized name for variable
        const varName = `$${n}`;

        const p = w.props;
        const style = p.style || {};
        const wWidth = style.width ? parseInt(style.width) : (p.width || 100);
        const wHeight = style.height ? parseInt(style.height) : (p.height || 25);
        const x = w.x;
        const y = w.y;

        // Resolve Parent (Basic container support)
        // PowerShell variables are global in scope unless scoped, so we can refer to parent var
        let parentVar = "$form";
        if (w.parentId) {
            const parentWidget = widgets.find(pw => pw.id === w.parentId);
            if (parentWidget) {
                parentVar = `$${parentWidget.props.name || parentWidget.name}`;
            }
        }

        if (w.type === 'label') {
            psCode += `${varName} = New-Object System.Windows.Forms.Label\n`;
            psCode += `${varName}.Text = "${p.text || ''}"\n`;
        }
        else if (w.type === 'textbox') {
            psCode += `${varName} = New-Object System.Windows.Forms.TextBox\n`;
            if (p.text) psCode += `${varName}.Text = "${p.text}"\n`;
        }
        else if (w.type === 'button') {
            psCode += `${varName} = New-Object System.Windows.Forms.Button\n`;
            psCode += `${varName}.Text = "${p.text || ''}"\n`;
        }
        else if (w.type === 'checkbox') {
            psCode += `${varName} = New-Object System.Windows.Forms.CheckBox\n`;
            psCode += `${varName}.Text = "${p.label || ''}"\n`;
            if (p.checked) psCode += `${varName}.Checked = $true\n`;
        }
        else if (w.type === 'radio') {
            psCode += `${varName} = New-Object System.Windows.Forms.RadioButton\n`;
            psCode += `${varName}.Text = "${p.label || ''}"\n`;
        }
        else if (w.type === 'optiongroup') {
            psCode += `${varName} = New-Object System.Windows.Forms.GroupBox\n`;
            psCode += `${varName}.Text = "${p.label || ''}"\n`;

            if (p.options && Array.isArray(p.options)) {
                p.options.forEach((opt, idx) => {
                    const label = (typeof opt === 'object' && opt !== null) ? (opt.caption || '') : opt;
                    const val = (typeof opt === 'object' && opt !== null && opt.value !== undefined) ? opt.value : idx;
                    const rbName = `${varName}_rb_${idx}`;

                    psCode += `${rbName} = New-Object System.Windows.Forms.RadioButton\n`;
                    psCode += `${rbName}.Text = "${label}"\n`;
                    // Simple vertical layout
                    psCode += `${rbName}.Location = New-Object System.Drawing.Point(10, ${20 + (idx * 25)})\n`;
                    psCode += `${rbName}.Size = New-Object System.Drawing.Size(${wWidth - 20}, 20)\n`;
                    if (p.value == val) psCode += `${rbName}.Checked = $true\n`;

                    psCode += `${varName}.Controls.Add(${rbName})\n`;
                });
            }
        }
        else if (w.type === 'combobox') {
            psCode += `${varName} = New-Object System.Windows.Forms.ComboBox\n`;
            if (p.options && Array.isArray(p.options)) {
                p.options.forEach(opt => {
                    const val = (typeof opt === 'object') ? opt.caption : opt;
                    psCode += `${varName}.Items.Add("${val}") | Out-Null\n`;
                });
            }
        }
        else if (w.type === 'listbox' || w.type === 'list') {
            psCode += `${varName} = New-Object System.Windows.Forms.ListBox\n`;
        }
        else if (w.type === 'grid') {
            psCode += `${varName} = New-Object System.Windows.Forms.ListView\n`;
            psCode += `${varName}.View = [System.Windows.Forms.View]::Details\n`;
            psCode += `${varName}.GridLines = $true\n`;

            const cols = p.columns || 3;
            if (Array.isArray(cols)) {
                cols.forEach(c => {
                    psCode += `${varName}.Columns.Add("${c.header || ''}", ${c.width || 100}) | Out-Null\n`;
                });
            } else {
                const count = typeof cols === 'number' ? cols : cols.split(',').length;
                for (let i = 0; i < count; i++) {
                    psCode += `${varName}.Columns.Add("Col${i + 1}", 100) | Out-Null\n`;
                }
            }
        }
        else if (w.type === 'shape' || w.type === 'container') {
            psCode += `${varName} = New-Object System.Windows.Forms.Panel\n`;
            psCode += `${varName}.BorderStyle = [System.Windows.Forms.BorderStyle]::FixedSingle\n`;
        }
        else if (w.type === 'image') {
            psCode += `${varName} = New-Object System.Windows.Forms.PictureBox\n`;
            psCode += `${varName}.BorderStyle = [System.Windows.Forms.BorderStyle]::FixedSingle\n`;
        }
        else if (w.type === 'editbox') {
            psCode += `${varName} = New-Object System.Windows.Forms.TextBox\n`;
            psCode += `${varName}.Multiline = $true\n`;
            if (p.text) psCode += `${varName}.Text = "${p.text.replace(/\\n/g, '`r`n')}"\n`;
        }
        else {
            // Fallback for unknown
            psCode += `${varName} = New-Object System.Windows.Forms.Label\n`;
            psCode += `${varName}.Text = "[${w.type}: ${n}]"\n`;
        }

        // Common Properties
        psCode += `${varName}.Name = "${n}"\n`;
        psCode += `${varName}.Location = New-Object System.Drawing.Point(${x}, ${y})\n`;
        psCode += `${varName}.Size = New-Object System.Drawing.Size(${wWidth}, ${wHeight})\n`;

        if (p.enabled === false) psCode += `${varName}.Enabled = $false\n`;
        if (p.visible === false) psCode += `${varName}.Visible = $false\n`;

        // Colors
        if (p.back_color || (p.style && p.style.backgroundColor)) {
            const c = p.back_color || p.style.backgroundColor;
            // Naive color map or hex support would be needed. 
            // PowerShell System.Drawing.ColorTranslator::FromHtml('#RRGGBB')
            if (c.startsWith('#')) {
                psCode += `${varName}.BackColor = [System.Drawing.ColorTranslator]::FromHtml("${c}")\n`;
            } else if (c !== 'transparent') {
                psCode += `${varName}.BackColor = [System.Drawing.Color]::FromName("${c}")\n`;
            }
        }

        psCode += `${parentVar}.Controls.Add(${varName})\n\n`;
    });

    // Events (Basic Click)
    widgets.forEach(w => {
        const n = w.props.name || w.name;
        const varName = `$${n}`;

        // Click
        const clickCode = formEvents[`${w.id}_Click`] || formEvents[`${w.id}_click`];
        if (clickCode) {
            // PowerShell event needs a scriptblock
            const translated = translateVFPtoPowerShell(clickCode);
            psCode += `${varName}.Add_Click({\n    # Event: ${n}_Click\n    ${translated}\n})\n\n`;
        }
    });

    psCode += `\n$form.ShowDialog() | Out-Null\n`;

    downloadFile(`${caption}.ps1`, psCode, 'text/plain');
};


// --- WPF EXPORTER ---
export const exportToPowerShellWPF = (widgets, customMethods, canvasSize, downloadFile, formEvents = {}, formProps = {}) => {
    const width = parseInt(canvasSize.width);
    const height = parseInt(canvasSize.height);
    const caption = formProps.caption || 'Form1';

    // Helper to generate XAML
    let xaml = `<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="${caption}" Height="${height}" Width="${width}"
        WindowStartupLocation="Manual" Left="${formProps.x || 100}" Top="${formProps.y || 100}"`;

    if (formProps.maxButton === false) xaml += ` ResizeMode="CanMinimize"`; // Approx
    if (formProps.movable === false) xaml += ` WindowStyle="None"`;

    xaml += `>\n    <Canvas Name="MainCanvas">\n`;

    widgets.forEach(w => {
        const n = w.props.name || w.name;
        const p = w.props;
        const style = p.style || {};
        const wWidth = style.width ? parseInt(style.width) : (p.width || 100);
        const wHeight = style.height ? parseInt(style.height) : (p.height || 25);
        const x = w.x;
        const y = w.y;

        let tag = "";
        let content = "";
        let props = `Name="${n}" Canvas.Left="${x}" Canvas.Top="${y}" Width="${wWidth}" Height="${wHeight}"`;

        if (p.enabled === false) props += ` IsEnabled="False"`;
        if (p.visible === false) props += ` Visibility="Hidden"`;

        if (p.back_color || (p.style && p.style.backgroundColor)) {
            const c = p.back_color || p.style.backgroundColor;
            props += ` Background="${c}"`;
        }

        if (w.type === 'label') {
            tag = "Label";
            content = p.text || "";
        }
        else if (w.type === 'textbox') {
            tag = "TextBox";
            props += ` Text="${p.text || ''}"`;
        }
        else if (w.type === 'button') {
            tag = "Button";
            content = p.text || "";
        }
        else if (w.type === 'checkbox') {
            tag = "CheckBox";
            content = p.label || "";
            if (p.checked) props += ` IsChecked="True"`;
        }
        else if (w.type === 'radio') {
            tag = "RadioButton";
            content = p.label || "";
        }
        else if (w.type === 'optiongroup') {
            tag = "GroupBox";
            props += ` Header="${p.label || ''}"`;

            content += `<StackPanel Margin="5">`;
            if (p.options && Array.isArray(p.options)) {
                p.options.forEach((opt, idx) => {
                    const label = (typeof opt === 'object' && opt !== null) ? (opt.caption || '') : opt;
                    const val = (typeof opt === 'object' && opt !== null && opt.value !== undefined) ? opt.value : idx;
                    let rbProps = `Content="${label}" Margin="0,2,0,2"`;
                    if (p.value == val) rbProps += ` IsChecked="True"`;
                    content += `<RadioButton ${rbProps}/>`;
                });
            }
            content += `</StackPanel>`;
        }
        else if (w.type === 'combobox') {
            tag = "ComboBox";
            // Items need to be added as children or basic string items
        }
        else if (w.type === 'grid') {
            tag = "ListView";
            // Columns are complex in XAML string building if we want to nest them.
            // Simplified placeholder
        }
        else if (w.type === 'shape' || w.type === 'container') {
            tag = "Border";
            props += ` BorderBrush="Black" BorderThickness="1"`;
        }
        else if (w.type === 'editbox') {
            tag = "TextBox";
            props += ` TextWrapping="Wrap" AcceptsReturn="True"`;
            props += ` Text="${(p.text || '').replace(/\n/g, '&#x0a;')}"`;
        }
        else {
            tag = "Label";
            content = `[${w.type}]`;
        }

        if (tag) {
            xaml += `        <${tag} ${props}`;

            if (content || (w.type === 'combobox' && p.options)) {
                xaml += `>\n`;
                if (content) xaml += `            ${content}\n`;
                if (w.type === 'combobox' && p.options) {
                    p.options.forEach(opt => {
                        const val = (typeof opt === 'object') ? opt.caption : opt;
                        xaml += `            <ComboBoxItem Content="${val}"/>\n`;
                    });
                }
                xaml += `        </${tag}>\n`;
            } else {
                xaml += ` />\n`;
            }
        }
    });

    xaml += `    </Canvas>\n</Window>`;

    let psCode = `Add-Type -AssemblyName PresentationFramework

[xml]$xaml = @"
${xaml}
"@

$reader = (New-Object System.Xml.XmlNodeReader $xaml)
$window = [Windows.Markup.XamlReader]::Load($reader)

# --- Events ---
`;

    // Events logic would require finding the element in the window by name
    widgets.forEach(w => {
        const n = w.props.name || w.name;
        // Find control
        // PowerShell WPF event binding usually works by $window.FindName("Name").Add_Click(...)

        const clickCode = formEvents[`${w.id}_Click`] || formEvents[`${w.id}_click`];
        if (clickCode) {
            const translated = translateVFPtoPowerShell(clickCode);
            psCode += `
$ctrl_${n} = $window.FindName("${n}")
if ($ctrl_${n}) {
    $ctrl_${n}.Add_Click({
        # Event: ${n}_Click
        ${translated}
    })
}
`;
        }
    });

    psCode += `\n$window.ShowDialog() | Out-Null\n`;

    downloadFile(`${caption}.ps1`, psCode, 'text/plain');
};
