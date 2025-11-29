import React from 'react';

/**
 * Renders text with a hotkey underlined if present.
 * 
 * @param {string} text - The text to display
 * @param {string} hotkey - The character to underline
 * @returns {React.ReactNode} - The rendered text with underline
 */
export const renderTextWithHotkey = (text, hotkey) => {
    if (!hotkey || !text) return text;
    const index = text.toLowerCase().indexOf(hotkey.toLowerCase());
    if (index === -1) return text;
    return (
        <span>
            {text.substring(0, index)}
            <span className="underline">{text.charAt(index)}</span>
            {text.substring(index + 1)}
        </span>
    );
};
