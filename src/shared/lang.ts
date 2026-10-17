/** Languages and the English-fallback helpers for bilingual task text. */

export const LANGS = ['en', 'es'] as const;
export type Lang = (typeof LANGS)[number];

/** `es` when the language is Spanish and the Spanish text is not blank, else `en`. */
export function localized(en: string, es: string | null | undefined, lang: Lang): string {
  return lang === 'es' && es && es.trim() !== '' ? es : en;
}

/** Spanish steps when the language is Spanish and that list is non-empty, else English. */
export function localizedSteps(
  en: readonly string[],
  es: readonly string[] | null | undefined,
  lang: Lang,
): string[] {
  return lang === 'es' && es && es.length > 0 ? [...es] : [...en];
}
