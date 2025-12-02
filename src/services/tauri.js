
// Detect if we are running in a Tauri environment
// window.__TAURI_INTERNALS__ is injected by Tauri
const isTauri = !!window.__TAURI_INTERNALS__;

// --- Real Tauri Imports ---
// We use dynamic imports or assume these are available if isTauri is true.
// However, since we are using Vite, we can just import them. 
// If we are in web mode, these might fail if they rely on window.__TAURI_IPC__, 
// but the imports themselves usually succeed in a bundler.
// To be safe and avoid "module not found" or runtime errors during import in pure web,
// we can wrap them or just import them and only use them if isTauri is true.
// But standard Tauri v2 plugins are npm packages.

import * as dialogPlugin from '@tauri-apps/plugin-dialog';
import * as fsPlugin from '@tauri-apps/plugin-fs';
import * as shellPlugin from '@tauri-apps/plugin-shell';
import * as storePlugin from '@tauri-apps/plugin-store';

// --- Mock Implementations for Web ---

const mockDialog = {
    save: async (options) => {
        // In web mode, we don't "save" to a path. We return a special marker or just the filename.
        // The caller (useProjectIO) expects a path to write to.
        // We will return a fake path that triggers our mock writeTextFile to download.
        const filename = options.defaultPath || 'download';
        return `WEB_DOWNLOAD:${filename}`;
    },
    ask: async (message, options) => {
        return window.confirm(message);
    },
    open: async (options) => {
        alert("File opening is handled via standard <input type='file'> in web mode.");
        return null;
    }
};

const mockFs = {
    writeTextFile: async (path, contents) => {
        if (path.startsWith('WEB_DOWNLOAD:')) {
            const filename = path.replace('WEB_DOWNLOAD:', '');
            const blob = new Blob([contents], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return;
        }
        console.warn('writeTextFile called with non-download path in web mode:', path);
    },
    readTextFile: async (path) => {
        console.warn('readTextFile not fully supported in web mode without File API interaction');
        return "";
    }
};

const mockShell = {
    Command: {
        create: (cmd, args) => {
            return {
                execute: async () => {
                    console.warn(`Shell command '${cmd}' ignored in web mode.`);
                    return { stdout: '', stderr: 'Shell commands not supported in web mode.' };
                }
            };
        }
    }
};

// Mock Store using localStorage
class MockLazyStore {
    constructor(filename) {
        this.key = `tauri-store-${filename}`;
        this.cache = {};
    }

    async init() {
        try {
            const data = localStorage.getItem(this.key);
            if (data) {
                this.cache = JSON.parse(data);
            }
        } catch (e) {
            console.error("Failed to load settings from localStorage", e);
        }
    }

    async get(key) {
        return this.cache[key];
    }

    async set(key, value) {
        this.cache[key] = value;
    }

    async save() {
        localStorage.setItem(this.key, JSON.stringify(this.cache));
    }
}

const mockStore = {
    LazyStore: MockLazyStore
};

// --- Exported Abstraction ---

export const dialog = isTauri ? dialogPlugin : mockDialog;
export const fs = isTauri ? fsPlugin : mockFs;
export const shell = isTauri ? shellPlugin : mockShell;
export const store = isTauri ? storePlugin : mockStore;

export const isWebMode = !isTauri;
