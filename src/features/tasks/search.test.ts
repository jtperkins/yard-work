import { describe, expect, it } from 'vitest';
import { getCatalog } from '../../domain/catalog';
import { matchesQuery, normalize, searchText } from './search';

describe('task search', () => {
  const catalog = getCatalog();
  const mow = catalog.taskById.get('mow-lawn')!;
  const text = searchText(mow, catalog);

  it('normalises accents and case', () => {
    expect(normalize('  Jardín ÓXIDO ')).toBe('jardin oxido');
  });

  it('finds tasks by either language, area and every query word', () => {
    expect(matchesQuery(text, 'zacate')).toBe(true);
    expect(matchesQuery(text, 'MOW lawn')).toBe(true);
    expect(matchesQuery(text, 'mow gutters')).toBe(false);
    expect(matchesQuery(text, '')).toBe(true);
  });

  it('finds tasks by supply name', () => {
    const rust = catalog.taskById.get('rust-inspection')!;
    expect(matchesQuery(searchText(rust, catalog), 'cepillo de alambre')).toBe(true);
  });
});
