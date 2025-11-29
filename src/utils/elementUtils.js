/**
 * Reparents elements based on their position and containment.
 * 
 * @param {Array} elements - List of all form elements
 * @param {Array} modifiedIds - List of IDs that were modified (moved/resized)
 * @returns {Array} - New list of elements with updated parentId and relative coordinates
 */
export const reparentElements = (elements, modifiedIds) => {
    // Helper to get absolute bounds
    const getAbsoluteBounds = (els) => {
        const bounds = {};
        const compute = (elId, xOffset, yOffset) => {
            const el = els.find(e => e.id === elId);
            if (!el) return;
            const absX = xOffset + el.x;
            const absY = yOffset + el.y;
            bounds[el.id] = { x: absX, y: absY, w: el.props.width, h: el.props.height, el };
            els.filter(c => c.parentId === el.id).forEach(child => compute(child.id, absX, absY));
        };
        els.filter(e => !e.parentId).forEach(root => compute(root.id, 0, 0));
        return bounds;
    };

    const absBounds = getAbsoluteBounds(elements);
    let newElements = [...elements];
    let changed = false;

    // Only process modified elements that are "roots" of the modification (not children of other modified elements)
    const topLevelModified = modifiedIds.filter(id => {
        const el = elements.find(e => e.id === id);
        if (!el || !el.parentId) return true;
        let parent = elements.find(p => p.id === el.parentId);
        while (parent) {
            if (modifiedIds.includes(parent.id)) return false;
            parent = elements.find(p => p.id === parent.parentId);
        }
        return true;
    });

    topLevelModified.forEach(id => {
        const bound = absBounds[id];
        if (!bound) return;

        const widgetRect = { x: bound.x, y: bound.y, w: bound.w, h: bound.h };
        let bestParent = null;

        // Helper to check containment
        const contains = (container, rect) => {
            const cRight = container.x + (container.props.width || 0);
            const cBottom = container.y + (container.props.height || 0);
            const wRight = rect.x + rect.w;
            const wBottom = rect.y + rect.h;
            return (
                rect.x >= container.x &&
                rect.y >= container.y &&
                wRight <= cRight &&
                wBottom <= cBottom
            );
        };

        Object.values(absBounds).forEach(targetBound => {
            if (targetBound.el.type === 'container' && targetBound.el.id !== id) {
                // Check if target is descendant of current widget
                let isChild = false;
                let p = targetBound.el;
                while (p.parentId) {
                    if (p.parentId === id) { isChild = true; break; }
                    p = elements.find(e => e.id === p.parentId);
                    if (!p) break;
                }
                if (isChild) return;

                if (contains({ x: targetBound.x, y: targetBound.y, props: { width: targetBound.w, height: targetBound.h } }, widgetRect)) {
                    if (!bestParent || (targetBound.w * targetBound.h < bestParent.w * bestParent.h)) {
                        bestParent = targetBound;
                    }
                }
            }
        });

        const elIndex = newElements.findIndex(e => e.id === id);
        if (elIndex === -1) return;
        const el = newElements[elIndex];

        if (bestParent) {
            if (el.parentId !== bestParent.el.id) {
                newElements[elIndex] = {
                    ...el,
                    parentId: bestParent.el.id,
                    x: widgetRect.x - bestParent.x,
                    y: widgetRect.y - bestParent.y
                };
                changed = true;
            }
        } else {
            if (el.parentId) {
                newElements[elIndex] = {
                    ...el,
                    parentId: null,
                    x: widgetRect.x,
                    y: widgetRect.y
                };
                changed = true;
            }
        }
    });

    return changed ? newElements : elements;
};
