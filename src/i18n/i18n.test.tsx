import { act, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider, detectLang, interpolate, l10n, translate, useLang, useT } from '.';
import type { Lang } from '.';

function wrapper(initialLang?: Lang) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <LanguageProvider initialLang={initialLang}>{children}</LanguageProvider>;
  };
}

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('translate', () => {
  it('looks up keys per language', () => {
    expect(translate('en', 'common', 'nav.board')).toBe('Board');
    expect(translate('es', 'common', 'nav.board')).toBe('Tablero');
  });

  it('interpolates {vars}', () => {
    expect(translate('en', 'common', 'nav.signedInAs', { name: 'José' })).toBe('Signed in as José');
  });

  it('chooses plural forms with Intl.PluralRules', () => {
    expect(translate('en', 'common', 'time.daysAgo', { count: 1 })).toBe('1 day ago');
    expect(translate('en', 'common', 'time.daysAgo', { count: 3 })).toBe('3 days ago');
    expect(translate('en', 'common', 'time.daysAgo', { count: 0 })).toBe('0 days ago');
    expect(translate('es', 'common', 'time.daysAgo', { count: 1 })).toBe('hace 1 día');
    expect(translate('es', 'common', 'time.daysAgo', { count: 5 })).toBe('hace 5 días');
  });

  it('falls back to _other for categories without a key (e.g. es "many")', () => {
    const n = 1_000_000; // Intl.PluralRules('es-CR').select(n) === 'many'
    expect(translate('es', 'common', 'time.daysAgo', { count: n })).toBe(
      `hace ${n.toLocaleString('es-CR')} días`,
    );
  });

  it('returns the key when missing', () => {
    // @ts-expect-error unknown key is a type error
    expect(translate('en', 'common', 'nope.missing')).toBe('nope.missing');
  });

  it('leaves unknown placeholders intact', () => {
    expect(interpolate('Hi {name} {other}', { name: 'JT' }, 'en')).toBe('Hi JT {other}');
  });

  it('l10n picks catalog text', () => {
    expect(l10n({ en: 'Mow', es: 'Chapia' }, 'es')).toBe('Chapia');
  });
});

describe('detectLang', () => {
  it('prefers the stored choice', () => {
    localStorage.setItem('yw.lang', 'es');
    expect(detectLang()).toBe('es');
  });

  it('falls back to navigator languages, then English', () => {
    vi.stubGlobal('navigator', { language: 'es-CR', languages: ['es-CR', 'en-US'] });
    expect(detectLang()).toBe('es');
    vi.stubGlobal('navigator', { language: 'fr-FR', languages: ['fr-FR'] });
    expect(detectLang()).toBe('en');
  });
});

describe('LanguageProvider + hooks', () => {
  it('useT translates in the current language and re-renders on setLang', () => {
    function Probe() {
      const t = useT('common');
      const { setLang } = useLang();
      return (
        <>
          <h1>{t('nav.week')}</h1>
          <button onClick={() => setLang('es')}>switch</button>
        </>
      );
    }
    render(<Probe />, { wrapper: wrapper('en') });
    expect(screen.getByRole('heading')).toHaveTextContent('Week');
    act(() => screen.getByRole('button').click());
    expect(screen.getByRole('heading')).toHaveTextContent('Semana');
    expect(localStorage.getItem('yw.lang')).toBe('es');
    expect(document.documentElement.lang).toBe('es-CR');
  });

  it('useT accepts a language override', () => {
    const { result } = renderHook(() => useT('common', 'es'), { wrapper: wrapper('en') });
    expect(result.current('actions.signOff')).toBe('Firmar');
  });

  it('throws outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useLang())).toThrow(/LanguageProvider/);
    spy.mockRestore();
  });
});
