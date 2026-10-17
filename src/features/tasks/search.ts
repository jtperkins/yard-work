import type { Task } from '../../shared/api-schemas';

/** Lower-case, accent-free text for forgiving search ("jardin" finds "Jardín"). */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * Everything a task can be found by, in both languages: title and steps (searching in English
 * while the UI is in Spanish still works).
 */
export function searchText(task: Task): string {
  return normalize(
    [task.title, task.titleEs ?? '', ...task.steps, ...(task.stepsEs ?? [])].join(' '),
  );
}

/** Tasks whose search text contains every word of the query. */
export function matchesQuery(haystack: string, query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return words.every((w) => haystack.includes(w));
}
