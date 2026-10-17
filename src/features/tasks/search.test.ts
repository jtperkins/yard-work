import { describe, expect, it } from 'vitest';
import { makeTask } from '../../domain/test-fixtures';
import { matchesQuery, normalize, searchText } from './search';

describe('task search', () => {
  const task = makeTask({
    id: 'chapia',
    title: 'Chapia (mow and weed-eat)',
    titleEs: 'Chapia (cortar el zacate)',
    steps: ['Mow the lawn to about 5 cm.'],
    stepsEs: ['Corte el zacate a unos 5 cm.'],
  });
  const text = searchText(task);

  it('normalises accents and case', () => {
    expect(normalize('  Jardín ÓXIDO ')).toBe('jardin oxido');
  });

  it('finds tasks by either language, title and steps, every query word', () => {
    expect(matchesQuery(text, 'zacate')).toBe(true);
    expect(matchesQuery(text, 'MOW lawn')).toBe(true);
    expect(matchesQuery(text, 'mow gutters')).toBe(false);
    expect(matchesQuery(text, '')).toBe(true);
  });
});
