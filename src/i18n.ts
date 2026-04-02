import en from './i18n/en';
import zh from './i18n/zh';
import { notify } from './useLang';

export type TranslationKeys = keyof typeof en;

const LANGS: Record<string, Record<TranslationKeys, string>> = { en, zh };
type Lang = keyof typeof LANGS;

let currentLang: string = localStorage.getItem('chordao:lang') || (navigator.language.startsWith('zh') ? 'zh' : 'en');

export function t(key: TranslationKeys): string {
  return (LANGS[currentLang] ?? LANGS.en)[key];
}

export function getLang(): string { return currentLang; }
export type { Lang };

export function setLang(lang: string) {
  currentLang = lang;
  localStorage.setItem('chordao:lang', lang);
  notify();
}
