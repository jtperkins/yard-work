import type { Catalog } from '../../domain/catalog';
import type { Completion, PlanItem } from '../../shared/api-schemas';
import { l10n, type Category, type Lang, type Task } from '../../shared/catalog-schema';

/** Display facts about a sign-off or plan item: its name, category and colour token. */
export interface WorkView {
  /** Task name in `lang`, the ad-hoc title, or the raw task id if it left the catalog. */
  title: string;
  /** The catalog task, when the row references one that still exists. */
  task?: Task;
  category?: Category;
  /** Category colour token (e.g. `cat-lawn`); undefined for ad-hoc work. */
  color?: string;
  /** True for ad-hoc work (no catalog task). */
  adHoc: boolean;
}

type CatalogView = Pick<Catalog, 'taskById' | 'house'>;

/** Describes the work a completion or plan item refers to, in the given language. */
export function describeWork(
  row: Pick<Completion | PlanItem, 'taskId' | 'title'>,
  catalog: CatalogView,
  lang: Lang,
): WorkView {
  if (row.taskId === null) return { title: row.title ?? '', adHoc: true };
  const task = catalog.taskById.get(row.taskId);
  if (!task) return { title: row.title ?? row.taskId, adHoc: false };
  return {
    title: l10n(task.name, lang),
    task,
    category: task.category,
    color: catalog.house.categories[task.category].color,
    adHoc: false,
  };
}

/** Category label in `lang` (from house.json). */
export function categoryLabel(catalog: Pick<Catalog, 'house'>, category: Category, lang: Lang) {
  return l10n(catalog.house.categories[category], lang);
}

/** Category colour token (from house.json). */
export function categoryColor(catalog: Pick<Catalog, 'house'>, category: Category): string {
  return catalog.house.categories[category].color;
}
