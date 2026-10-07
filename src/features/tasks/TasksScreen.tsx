import { Search } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { paths } from '../../app/paths';
import { useCatalog, useTaskStatuses } from '../../api';
import { useT } from '../../i18n';
import { CATEGORIES, type Category } from '../../shared/catalog-schema';
import {
  Badge,
  Button,
  Card,
  Checklist,
  EmptyState,
  Field,
  Input,
  ListRow,
  PageHeader,
  SectionHeader,
  Stack,
  Text,
  ToggleChip,
} from '../../ui';
import { TaskStatusPill } from '../shared/TaskStatusPill';
import { useTaskText } from '../shared/taskText';
import { useToday } from '../shared/today';
import { matchesQuery, searchText } from './search';

function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

/** Route `/tasks` — the catalog grouped by category, with search and category filters. */
export function TasksScreen() {
  const t = useT('tasks');
  const tc = useT('common');
  const text = useTaskText();
  const today = useToday();
  const catalog = useCatalog();
  const statuses = useTaskStatuses(today);
  const [params, setParams] = useSearchParams();

  const query = params.get('q') ?? '';
  const selected = useMemo(
    () => new Set((params.get('cat') ?? '').split(',').filter(isCategory)),
    [params],
  );

  const update = (next: { q?: string; cats?: Set<Category> }) => {
    const p = new URLSearchParams(params);
    const q = next.q ?? query;
    const cats = next.cats ?? selected;
    if (q) p.set('q', q);
    else p.delete('q');
    if (cats.size > 0) p.set('cat', [...cats].join(','));
    else p.delete('cat');
    setParams(p, { replace: true });
  };

  const index = useMemo(
    () => new Map(catalog.tasks.map((task) => [task.id, searchText(task, catalog)])),
    [catalog],
  );

  const matching = catalog.tasks.filter((task) => matchesQuery(index.get(task.id) ?? '', query));
  const countsByCategory = new Map<Category, number>();
  for (const task of matching) {
    countsByCategory.set(task.category, (countsByCategory.get(task.category) ?? 0) + 1);
  }
  const visible = matching.filter((task) => selected.size === 0 || selected.has(task.category));
  const groups = CATEGORIES.map((category) => ({
    category,
    tasks: visible.filter((task) => task.category === category),
  })).filter((g) => g.tasks.length > 0);

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description', { count: catalog.tasks.length })}
      />
      <Stack gap="xl">
        <Stack gap="md">
          <Field label={t('searchLabel')}>
            <Input
              type="search"
              leadingIcon={Search}
              value={query}
              onValueChange={(q) => update({ q })}
              placeholder={t('searchPlaceholder')}
              autoComplete="off"
            />
          </Field>
          <Stack direction="row" gap="sm" wrap role="group" aria-label={t('filterLabel')}>
            {CATEGORIES.map((category) => (
              <ToggleChip
                key={category}
                label={text.categoryLabel(category)}
                color={text.categoryColor(category)}
                count={countsByCategory.get(category) ?? 0}
                pressed={selected.has(category)}
                onPressedChange={(pressed) => {
                  const cats = new Set(selected);
                  if (pressed) cats.add(category);
                  else cats.delete(category);
                  update({ cats });
                }}
              />
            ))}
          </Stack>
          <Stack direction="row" gap="sm" align="center" justify="between">
            <Text size="sm" tone="muted" aria-live="polite">
              {t('results', { count: visible.length })}
            </Text>
            {(query || selected.size > 0) && (
              <Button variant="ghost" size="sm" onClick={() => update({ q: '', cats: new Set() })}>
                {tc('actions.clearFilters')}
              </Button>
            )}
          </Stack>
        </Stack>

        {groups.length === 0 ? (
          <Card>
            <EmptyState title={t('emptyTitle')} description={t('emptyBody')} icon={Search} />
          </Card>
        ) : (
          groups.map(({ category, tasks }) => {
            const label = text.categoryLabel(category);
            return (
              <section key={category} aria-labelledby={`cat-${category}`}>
                <SectionHeader id={`cat-${category}`} title={label} count={tasks.length} />
                <Checklist label={t('groupList', { category: label })}>
                  {tasks.map((task) => {
                    const status = statuses.data?.byId.get(task.id);
                    const meta = [
                      text.frequencyText(task),
                      text.activeText(task),
                      status ? text.lastDoneText(status, today) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ');
                    return (
                      <ListRow
                        key={task.id}
                        as={Link}
                        to={paths.task(task.id)}
                        title={text.taskName(task)}
                        meta={meta}
                        color={text.categoryColor(task.category)}
                        trailing={
                          <>
                            {status && <TaskStatusPill state={status.state} />}
                            {!task.confirmed && (
                              <Badge variant="stamp" tone="accent" size="sm">
                                {tc('status.draft')}
                              </Badge>
                            )}
                          </>
                        }
                      />
                    );
                  })}
                </Checklist>
              </section>
            );
          })
        )}
      </Stack>
    </>
  );
}
