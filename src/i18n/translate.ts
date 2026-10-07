import { localeFor } from '../shared/dates';
import { en } from './en';
import { es } from './es';
import type { Dictionaries, Lang, Namespace, TKey, TVars } from './types';

export const dictionaries: Record<Lang, Dictionaries> = { en, es };

const pluralRulesCache = new Map<Lang, Intl.PluralRules>();
function pluralRules(lang: Lang): Intl.PluralRules {
  let rules = pluralRulesCache.get(lang);
  if (!rules) {
    rules = new Intl.PluralRules(localeFor(lang));
    pluralRulesCache.set(lang, rules);
  }
  return rules;
}

function lookup(lang: Lang, ns: Namespace, key: string, vars?: TVars): string | undefined {
  const dict = dictionaries[lang][ns] as Record<string, string | undefined>;
  const count = vars?.count;
  if (typeof count === 'number') {
    const form = pluralRules(lang).select(count);
    const plural = dict[`${key}_${form}`] ?? dict[`${key}_other`];
    if (plural !== undefined) return plural;
  }
  return dict[key];
}

/** Replaces `{var}` placeholders; numbers are locale-formatted; unknown placeholders are kept. */
export function interpolate(template: string, vars: TVars | undefined, lang: Lang): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    if (value === undefined) return match;
    return typeof value === 'number' ? value.toLocaleString(localeFor(lang)) : value;
  });
}

/**
 * Pure translation (no React) — e.g. for WhatsApp share text in a chosen language.
 * Falls back to English, then to the key itself.
 */
export function translate<NS extends Namespace>(
  lang: Lang,
  ns: NS,
  key: TKey<NS>,
  vars?: TVars,
): string {
  const template = lookup(lang, ns, key, vars) ?? lookup('en', ns, key, vars) ?? key;
  return interpolate(template, vars, lang);
}
