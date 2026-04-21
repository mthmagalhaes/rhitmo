import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ptBR from './locales/pt-BR.json';
import en from './locales/en.json';
import es from './locales/es.json';
import rhitmoPt from './locales/rhitmo-pt.json';
import rhitmoEn from './locales/rhitmo-en.json';
import rhitmoEs from './locales/rhitmo-es.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'pt-BR', label: 'Português', flag: '🇧🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]['code'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': { translation: ptBR, rhitmo: rhitmoPt },
      en: { translation: en, rhitmo: rhitmoEn },
      es: { translation: es, rhitmo: rhitmoEs },
    },
    ns: ['translation', 'rhitmo'],
    defaultNS: 'translation',
    fallbackLng: 'pt-BR',
    supportedLngs: ['pt-BR', 'en', 'es'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'rhitmo_locale',
      caches: ['localStorage'],
    },
  });

export default i18n;
