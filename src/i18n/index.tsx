import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupportedLanguage, Translations, AVAILABLE_LANGUAGES, LanguageInfo } from './types';
import { getTranslations, getDefaultLanguage } from './translations';

const LANGUAGE_STORAGE_KEY = '@pastella_language';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  t: Translations;
  availableLanguages: LanguageInfo[];
  formatString: (key: string, values?: Record<string, string | number>) => string;
  isReady: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * Get nested object value by path
 * Example: getNestedValue(obj, 'a.b.c') returns obj.a.b.c
 */
function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((current, key) => current?.[key], obj) || path;
}

/**
 * Interpolate values into a string
 * Example: formatString('Hello {name}', { name: 'World' }) returns 'Hello World'
 * Supports both {key} and {{key}} formats
 */
function formatString(template: string, values?: Record<string, string | number>): string {
  if (!values) return template;
  // Try single curly braces first {key}, then double {{key}}
  let result = template.replace(/\{(\w+)\}/g, (match, key) => {
    return values[key]?.toString() || match;
  });
  // If no replacements were made, try double curly braces format
  if (result === template) {
    result = template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return values[key]?.toString() || match;
    });
  }
  return result;
}

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  // Always initialize with valid English translations
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    const defaultLang = getDefaultLanguage();
    return defaultLang;
  });
  const [translations, setTranslations] = useState<Translations>(() => {
    const defaultLang = getDefaultLanguage();
    const defaultTranslations = getTranslations(defaultLang);
    if (!defaultTranslations) {
      console.error('[LanguageProvider] CRITICAL: Default translations are undefined!');
      return {} as Translations;
    }
    return defaultTranslations;
  });
  const [isReady, setIsReady] = useState(false);

  // Initialize translations on mount
  useEffect(() => {
    const initTranslations = async () => {
      try {
        const savedLang = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        const lang: SupportedLanguage = (savedLang === 'en' || savedLang === 'nl' || savedLang === 'de') ? savedLang : getDefaultLanguage();
        const translationsData = getTranslations(lang);

        if (!translationsData || Object.keys(translationsData).length === 0) {
          console.error('[LanguageProvider] Failed to load translations for:', lang);
          setIsReady(true);
          return;
        }

        setLanguageState(lang);
        setTranslations(translationsData);
        setIsReady(true);
      } catch (error) {
        console.error('[LanguageProvider] Failed to initialize translations:', error);
        setIsReady(true);
      }
    };

    initTranslations();
  }, []);

  const setLanguage = useCallback(async (lang: SupportedLanguage) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      const translationsData = getTranslations(lang);
      if (!translationsData || Object.keys(translationsData).length === 0) {
        console.error('[LanguageProvider] Failed to load translations for:', lang);
        return;
      }
      setLanguageState(lang);
      setTranslations(translationsData);
    } catch (error) {
      console.error('Failed to save language:', error);
    }
  }, []);

  // Helper function to get translation with interpolation
  const formatStringHelper = useCallback((key: string, values?: Record<string, string | number>): string => {
    const template = getNestedValue(translations, key);
    return formatString(template, values);
  }, [translations]);

  // Memoize context value so React detects changes properly
  const value: LanguageContextType = useMemo(() => ({
    language,
    setLanguage,
    t: translations,
    availableLanguages: AVAILABLE_LANGUAGES,
    formatString: formatStringHelper,
    isReady,
  }), [language, translations, formatStringHelper, isReady]);

  // Show loading indicator while translations are being initialized
  if (!isReady) {
    return (
      <LanguageContext.Provider value={value}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
          <ActivityIndicator size="large" color="#FF8CFA" />
        </View>
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

/**
 * Hook to use the language context
 * @returns Language context with translations and language setter
 * @throws Error if used outside LanguageProvider
 */
export function useTranslation(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}

/**
 * Convenience hook to get just the translations
 * Returns an object with a `t` property for destructuring: const { t } = useTranslations()
 */
export function useTranslations(): { t: Translations } {
  const context = useTranslation();

  if (!context) {
    throw new Error('Translations are not available. Make sure LanguageProvider is properly initialized.');
  }

  if (!context.isReady) {
    throw new Error('Translations are still loading. Please wait for initialization to complete.');
  }

  if (!context.t || Object.keys(context.t).length === 0) {
    throw new Error('Translations are not available. Make sure LanguageProvider is properly initialized.');
  }

  // Return object with t property so components can destructure: const { t } = useTranslations()
  return { t: context.t };
}

export default LanguageProvider;
