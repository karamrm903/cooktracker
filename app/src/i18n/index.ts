import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import de from './locales/de.json';

export const SUPPORTED_LANGUAGES = ['en', 'fr', 'es', 'de'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const LANGUAGE_STORAGE_KEY = '@nutrily_language';

export const LANGUAGE_META: Record<SupportedLanguage, { flag: string; label: string; nativeLabel: string }> = {
  en: { flag: '🇬🇧', label: 'English',  nativeLabel: 'English'  },
  fr: { flag: '🇫🇷', label: 'French',   nativeLabel: 'Français' },
  es: { flag: '🇪🇸', label: 'Spanish',  nativeLabel: 'Español'  },
  de: { flag: '🇩🇪', label: 'German',   nativeLabel: 'Deutsch'  },
};

export async function detectInitialLanguage(): Promise<SupportedLanguage> {
  const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved && SUPPORTED_LANGUAGES.includes(saved as SupportedLanguage)) {
    return saved as SupportedLanguage;
  }
  return 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    es: { translation: es },
    de: { translation: de },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
