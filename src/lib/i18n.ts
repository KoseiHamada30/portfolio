// UI strings + locale-aware URLs. Every visible string comes from src/i18n/*.json
// or from { en, ja } content fields (CLAUDE.md "i18n").
// en.json / ja.json hold the v1 strings verbatim (original keys) plus dotted UI keys.
import { getRelativeLocaleUrl } from 'astro:i18n';
import en from '../i18n/en.json';
import ja from '../i18n/ja.json';

export const locales = ['en', 'ja'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export type Key = keyof typeof en;

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

/** '/portfolio/ja/work/circula/' → 'work/circula' (no base, no locale prefix, no slashes). */
export function pathWithoutLocale(pathname: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  let path = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  path = path.replace(/^\/+|\/+$/g, '');
  const [first, ...rest] = path.split('/');
  return isLocale(first) && first !== defaultLocale ? rest.join('/') : path;
}

/** Localised field from content frontmatter. */
export type Localized = { en: string; ja: string };
export function pick(locale: Locale, value: Localized): string {
  return value[locale];
}

/** Locale of the page being rendered (Astro.currentLocale), for components used inside MDX. */
export function localeOf(current: string | undefined): Locale {
  return isLocale(current) ? current : defaultLocale;
}

/** A UI key, a { en, ja } pair, or plain text that is the same in both languages. */
export type Text = Key | Localized | string;
export function text(locale: Locale, value: Text): string {
  if (typeof value !== 'string') return value[locale];
  return value in dictionaries.en ? t(locale, value as Key) : value;
}
