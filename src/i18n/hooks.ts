import { useCallback, useContext } from 'react';
import { formatDate, type ISODate } from '../shared/dates';
import { LanguageContext, type LanguageContextValue } from './LanguageProvider';
import { translate } from './translate';
import type { Lang, Namespace, TFunction } from './types';

/** Current language and setter. Must be used under `<LanguageProvider>`. */
export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang/useT must be used inside <LanguageProvider>');
  return ctx;
}

/**
 * Translator bound to a namespace: `const t = useT('board'); t('greeting', { name })`.
 * Pass `langOverride` to translate in a fixed language (e.g. WhatsApp share in Spanish).
 */
export function useT<NS extends Namespace>(ns: NS, langOverride?: Lang): TFunction<NS> {
  const { lang } = useLang();
  const effective = langOverride ?? lang;
  return useCallback<TFunction<NS>>(
    (key, vars) => translate(effective, ns, key, vars),
    [effective, ns],
  );
}

/** Date formatter in the current language (CR timezone, never shifts the calendar day). */
export function useFormatDate(): (iso: ISODate, options?: Intl.DateTimeFormatOptions) => string {
  const { lang } = useLang();
  return useCallback((iso, options) => formatDate(iso, lang, options), [lang]);
}
