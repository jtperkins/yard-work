import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Lang } from './types';

export const DEFAULT_LANG_STORAGE_KEY = 'yw.lang';

export interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);

function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'es';
}

/** Stored choice → browser languages (first `es*`/`en*` wins) → English. */
export function detectLang(storageKey: string = DEFAULT_LANG_STORAGE_KEY): Lang {
  try {
    const stored = globalThis.localStorage?.getItem(storageKey);
    if (isLang(stored)) return stored;
  } catch {
    // storage blocked (private mode etc.) — fall through
  }
  const nav = globalThis.navigator;
  const prefs = nav ? (nav.languages?.length ? nav.languages : [nav.language]) : [];
  for (const pref of prefs) {
    const base = pref?.toLowerCase().split('-')[0];
    if (isLang(base)) return base;
  }
  return 'en';
}

export interface LanguageProviderProps {
  children: ReactNode;
  /** Force the starting language (tests, storybook). Defaults to `detectLang()`. */
  initialLang?: Lang;
  /** localStorage key for the persisted choice. */
  storageKey?: string;
}

export function LanguageProvider({
  children,
  initialLang,
  storageKey = DEFAULT_LANG_STORAGE_KEY,
}: LanguageProviderProps) {
  const [lang, setLangState] = useState<Lang>(() => initialLang ?? detectLang(storageKey));

  const setLang = useCallback(
    (next: Lang) => {
      setLangState(next);
      try {
        globalThis.localStorage?.setItem(storageKey, next);
      } catch {
        // ignore storage failures; the choice still applies for this session
      }
    },
    [storageKey],
  );

  useEffect(() => {
    document.documentElement.lang = lang === 'es' ? 'es-CR' : 'en';
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
