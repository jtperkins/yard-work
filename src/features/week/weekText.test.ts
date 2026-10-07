import { describe, expect, it } from 'vitest';
import { buildShareText, formatWeekRange, whatsAppHref } from './weekText';

describe('formatWeekRange', () => {
  it('formats Monday–Sunday in each language', () => {
    expect(formatWeekRange('2026-10-05', 'en')).toMatch(/Oct 5\s*–\s*11/);
    expect(formatWeekRange('2026-10-05', 'es')).toMatch(/5\s*–\s*11 (de )?oct/);
    expect(formatWeekRange('2026-09-28', 'en')).toMatch(/Sep 28\s*–\s*Oct 4/);
  });
});

describe('buildShareText', () => {
  const base = {
    appName: 'Yard Work',
    weekStart: '2026-10-05',
    items: [
      { title: 'Cortar el zacate', assignee: 'Luis', done: false },
      { title: 'Limpiar canoas', done: false },
      { title: 'Revisión de óxido', done: true },
    ],
    supplies: [
      { name: 'Hilo para orilladora', have: false },
      { name: 'Guantes', have: true },
    ],
    url: 'https://yard-work.pages.dev/week/2026-10-05',
  };

  it('writes the plan and supplies in Spanish', () => {
    const text = buildShareText({ ...base, lang: 'es', yardDay: 'jueves 9' });
    expect(text.split('\n')).toEqual([
      expect.stringMatching(/^\*Yard Work — 5\s*–\s*11 (de )?oct\*$/),
      'Día del jardinero: jueves 9',
      '',
      '*Trabajos*',
      '☐ Cortar el zacate — Luis',
      '☐ Limpiar canoas',
      '✅ Revisión de óxido — listo ✔',
      '',
      '*Materiales*',
      '• Hilo para orilladora',
      '• Guantes (ya hay)',
      '',
      'Firme aquí: https://yard-work.pages.dev/week/2026-10-05',
    ]);
  });

  it('writes English, and says when nothing is planned', () => {
    const text = buildShareText({ ...base, lang: 'en', items: [], supplies: [] });
    expect(text).toContain('*Jobs*\n(nothing planned yet)');
    expect(text).not.toContain('Supplies');
    expect(text).not.toContain('Yard day');
  });

  it('builds a wa.me link', () => {
    expect(whatsAppHref('Hola *equipo*\n✅')).toBe(
      'https://wa.me/?text=Hola%20*equipo*%0A%E2%9C%85',
    );
  });
});
