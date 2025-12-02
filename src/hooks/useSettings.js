import { useState, useEffect } from 'react';
import { store as tauriStore } from '../services/tauri';

const store = new tauriStore.LazyStore('settings.json');

export const useSettings = () => {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                // Ensure store is loaded
                await store.init();
                setLoading(false);
            } catch (err) {
                console.error('Failed to load settings store:', err);
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    const getSetting = async (key, defaultValue) => {
        try {
            const val = await store.get(key);
            return val !== null && val !== undefined ? val : defaultValue;
        } catch (err) {
            console.error(`Error getting setting ${key}:`, err);
            return defaultValue;
        }
    };

    const setSetting = async (key, value) => {
        try {
            await store.set(key, value);
            await store.save(); // Persist immediately
        } catch (err) {
            console.error(`Error setting setting ${key}:`, err);
        }
    };

    return {
        getSetting,
        setSetting,
        loading
    };
};
