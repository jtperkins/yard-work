import type { Catalog } from '../../domain/catalog';
import type { Task } from '../../shared/catalog-schema';

/** Lower-case, accent-free text for forgiving search ("jardin" finds "Jardín"). */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * Everything a task can be found by, in both languages: name, category, area and supply names
 * (searching in English while the UI is in Spanish still works).
 */
export function searchText(task: Task, catalog: Pick<Catalog, 'house' | 'supplyById'>): string {
  const { house, supplyById } = catalog;
  const parts: string[] = [
    task.name.en,
    task.name.es,
    house.categories[task.category].en,
    house.categories[task.category].es,
  ];
  const area = house.areas[task.area];
  if (area) parts.push(area.en, area.es);
  for (const { id } of task.supplies) {
    const supply = supplyById.get(id);
    if (supply) parts.push(supply.name.en, supply.name.es);
  }
  return normalize(parts.join(' '));
}

/** Tasks whose search text contains every word of the query. */
export function matchesQuery(haystack: string, query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return words.every((w) => haystack.includes(w));
}
