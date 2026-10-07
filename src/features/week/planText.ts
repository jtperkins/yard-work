import { useCallback } from 'react';
import { useCatalog } from '../../api';
import { useLang } from '../../i18n';
import type { PlanItem } from '../../shared/api-schemas';
import { l10n, type Task } from '../../shared/catalog-schema';

/** The catalog task behind a plan item (undefined for ad-hoc items or retired task ids). */
export function usePlanItemTask(): (item: PlanItem) => Task | undefined {
  const { taskById } = useCatalog();
  return useCallback(
    (item: PlanItem) => (item.taskId ? taskById.get(item.taskId) : undefined),
    [taskById],
  );
}

/** Display title of a plan item in the current (or a given) language. */
export function usePlanItemTitle(): (item: PlanItem, lang?: 'en' | 'es') => string {
  const { taskById } = useCatalog();
  const { lang: uiLang } = useLang();
  return useCallback(
    (item: PlanItem, lang = uiLang) => {
      const task = item.taskId ? taskById.get(item.taskId) : undefined;
      if (task) return l10n(task.name, lang);
      return item.title ?? item.taskId ?? '';
    },
    [taskById, uiLang],
  );
}
