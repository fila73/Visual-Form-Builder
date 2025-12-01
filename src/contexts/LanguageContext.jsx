import React, { createContext, useState, useContext, useEffect } from 'react';
import { translations } from '../data/translations';
import { useSettings } from '../hooks/useSettings';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [language, setLanguageState] = useState('cs'); // Default to Czech
    const { getSetting, setSetting } = useSettings();

    useEffect(() => {
        const loadLang = async () => {
            const savedLang = await getSetting('language', 'cs');
            setLanguageState(savedLang);
        };
        loadLang();
    }, []);

    const setLanguage = (lang) => {
        setLanguageState(lang);
        setSetting('language', lang);
    };

    const t = (key, params = {}) => {
        const langData = translations[language] || translations['cs'];
        let text = langData[key] || key;

        // Replace parameters like {name}
        Object.keys(params).forEach(param => {
            text = text.replace(`{${param}}`, params[param]);
        });

        return text;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
