/** Task ids: kebab slugs made from the title. Pure, so it is unit-testable. */

/** Ids the router uses for its own pages (`/tasks/new`, `/tasks/:id/edit`). */
const RESERVED = new Set(['new', 'edit']);

const MAX_SLUG = 50;

function trimDashes(value: string): string {
  return value.replace(/^-+|-+$/g, '');
}

/** Lower-case ascii kebab slug. Never empty and never a reserved word. */
export function slugify(title: string): string {
  let slug = trimDashes(
    title
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-'),
  );
  slug = trimDashes(slug.slice(0, MAX_SLUG));
  if (slug === '') {
    const bytes = crypto.getRandomValues(new Uint8Array(4));
    return `task-${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
  }
  return RESERVED.has(slug) ? `${slug}-task` : slug;
}
