import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './i18n/en';
import zh from './i18n/zh';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: localStorage.getItem('chordao:lang') || (navigator.language.startsWith('zh') ? 'zh' : 'en'),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
