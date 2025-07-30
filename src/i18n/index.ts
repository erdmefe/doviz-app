import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import enTranslations from './locales/en.json';
import trTranslations from './locales/tr.json';

const resources = {
  en: {
    translation: enTranslations,
  },
  tr: {
    translation: trTranslations,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getLocales()[0]?.languageCode === 'tr' ? 'tr' : 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;