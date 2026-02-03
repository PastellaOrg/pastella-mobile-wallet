import { Translations, SupportedLanguage } from './types';
import enTranslations from './locales/en.json';
import nlTranslations from './locales/nl.json';
import deTranslations from './locales/de.json';

/**
 * Type guard to ensure JSON imports match Translations type
 */
function validateTranslations(data: any): Translations {
  return data as Translations;
}

/**
 * All translations dictionary
 */
export const translations: Record<SupportedLanguage, Translations> = {
  en: validateTranslations(enTranslations),
  nl: validateTranslations(nlTranslations),
  de: validateTranslations(deTranslations),
};

/**
 * Get translations for a specific language
 */
export function getTranslations(lang: SupportedLanguage): Translations {
  return translations[lang];
}

/**
 * Get the default language
 */
export function getDefaultLanguage(): SupportedLanguage {
  return 'en';
}
