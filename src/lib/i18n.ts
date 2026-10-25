// UI strings + locale-aware URLs. Every visible string comes from src/i18n/*.json
// or from { en, ja } content fields (CLAUDE.md "i18n").
import { getRelativeLocaleUrl } from 'astro:i18n';
import en from '../i18n/en.json';
import ja from '../i18n/ja.json';

export const locales = ['en', 'ja'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

type Key = keyof typeof en;

// Compile-time check that ja.json has every key en.json has.
const dictionaries: Record<Locale, Record<Key, string>> = { en, ja };

export function t(locale: Locale, key: Key): string {
  return dictionaries[locale][key];
}

export function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale);
}

/** Base-aware URL for a path in the given locale, e.g. url('ja', 'work/circula'). */
export function url(locale: Locale, path = ''): string {
  return getRelativeLocaleUrl(locale, path);
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'en' ? 'ja' : 'en';
}

/** Localised field from content frontmatter. */
export type Localized = { en: string; ja: string };
export function pick(locale: Locale, value: Localized): string {
  return value[locale];
}
