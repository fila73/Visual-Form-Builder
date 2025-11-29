import { useState } from 'react';

export const useClipboard = ({ formElements, setFormElements, selectedIds, setSelectedIds, formEvents, setFormEvents }) => {

    const copyToClipboard = async () => {
        if (selectedIds.length === 0) return;
        const selectedElements = formElements.filter(el => selectedIds.includes(el.id));

        // Collect events for selected elements
        const eventsToCopy = {};
        selectedElements.forEach(el => {
            Object.keys(formEvents).forEach(key => {
                if (key.startsWith(`${el.id}_`)) {
                    eventsToCopy[key] = formEvents[key];
                }
            });
        });

        const payload = {
            widgets: selectedElements,
            events: eventsToCopy
        };

        const json = JSON.stringify(payload, null, 2);
        try {
            await navigator.clipboard.writeText(json);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const cutToClipboard = async () => {
        await copyToClipboard();
        setFormElements(prev => prev.filter(el => !selectedIds.includes(el.id)));
        setSelectedIds([]);
    };

    const pasteFromClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText();
            let clipboardData;
            try {
                clipboardData = JSON.parse(text);
            } catch (e) { return; }

            let widgets = [];
            let events = {};

            // Handle both old format (array of widgets) and new format (object)
            if (Array.isArray(clipboardData)) {
                widgets = clipboardData;
            } else if (clipboardData.widgets && Array.isArray(clipboardData.widgets)) {
                widgets = clipboardData.widgets;
                events = clipboardData.events || {};
            } else {
                return;
            }

            // Generate Unique Name Helper
            const getUniqueName = (type, elements) => {
                const baseNameMap = {
                    'label': 'Label',
                    'textbox': 'Text',
                    'editbox': 'Edit',
                    'button': 'Command',
                    'checkbox': 'Check',
                    'radio': 'Option',
                    'spinner': 'Spinner',
                    'combobox': 'Combo',
                    'grid': 'Grid',
                    'shape': 'Shape',
                    'image': 'Image',
                    'container': 'Container'
                };
                const base = baseNameMap[type] || 'Object';
                let counter = 1;
                while (true) {
                    const name = `${base}${counter}`;
                    const exists = elements.some(el => (el.props.name || el.name) === name);
                    if (!exists) return name;
                    counter++;
                }
            };

            const newWidgets = [];
            const newIds = [];

            // Check for position collisions
            const offset = { x: 0, y: 0 };
            const firstWidget = widgets[0];
            if (firstWidget) {
                const existsAtPos = formElements.some(el =>
                    Math.abs(el.x - firstWidget.x) < 5 && Math.abs(el.y - firstWidget.y) < 5
                );
                if (existsAtPos) {
                    offset.x = 10;
                    offset.y = 10;
                }
            }

            // Process widgets
            let currentElements = [...formElements];

            widgets.forEach(w => {
                const newId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const uniqueName = getUniqueName(w.type, currentElements);

                const newWidget = {
                    ...w,
                    id: newId,
                    x: w.x + offset.x,
                    y: w.y + offset.y,
                    props: { ...w.props, name: uniqueName }
                };

                newWidgets.push(newWidget);
                newIds.push(newId);
                currentElements.push(newWidget);
            });

            // Fix parentIds for pasted group
            const idMap = {};
            widgets.forEach((w, i) => {
                idMap[w.id] = newWidgets[i].id;
            });

            newWidgets.forEach(w => {
                if (w.parentId && idMap[w.parentId]) {
                    w.parentId = idMap[w.parentId];
                }
            });

            // Process Events
            const newEvents = {};
            Object.entries(events).forEach(([key, code]) => {
                const parts = key.split('_');
                const oldId = Object.keys(idMap).find(oid => key.startsWith(oid + '_'));

                if (oldId) {
                    const eventName = key.substring(oldId.length + 1);
                    const newId = idMap[oldId];
                    newEvents[`${newId}_${eventName}`] = code;
                }
            });

            setFormElements(prev => [...prev, ...newWidgets]);
            setFormEvents(prev => ({ ...prev, ...newEvents }));
            setSelectedIds(newIds);

        } catch (err) {
            console.error('Failed to paste:', err);
        }
    };

    return {
        copyToClipboard,
        cutToClipboard,
        pasteFromClipboard
    };
};
