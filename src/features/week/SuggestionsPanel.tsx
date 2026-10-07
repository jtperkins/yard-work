import { ListPlus, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { paths } from '../../app/paths';
import type { WeekSuggestion } from '../../domain/week';
import { useT } from '../../i18n';
import { LIMITS } from '../../shared/api-schemas';
import type { ISODate } from '../../shared/dates';
import {
  Button,
  Card,
  CardHeader,
  Checklist,
  ChecklistRow,
  EmptyState,
  Field,
  Input,
  SkeletonText,
  Stack,
  Text,
  TextLink,
} from '../../ui';
import { SignInCta } from '../shared/SignInCta';
import { TaskStatusPill } from '../shared/TaskStatusPill';
import { useTaskText } from '../shared/taskText';
import type { PlanActions } from './usePlanActions';

const INITIAL = 6;

export interface SuggestionsPanelProps {
  suggestions: readonly WeekSuggestion[] | undefined;
  today: ISODate;
  signedIn: boolean;
  sessionPending: boolean;
  actions: PlanActions;
}

/** Catalog jobs due by Sunday that aren't planned yet (one-tap add), plus an ad-hoc job form. */
export function SuggestionsPanel({
  suggestions,
  today,
  signedIn,
  sessionPending,
  actions,
}: SuggestionsPanelProps) {
  const t = useT('week');
  const tc = useT('common');
  const text = useTaskText();
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState<string>();

  const list = suggestions ?? [];
  const shown = expanded ? list : list.slice(0, INITIAL);
  const hidden = list.length - shown.length;

  function addAdHoc(event: FormEvent<HTMLElement>) {
    event.preventDefault();
    const value = title.trim();
    if (!value) {
      setTitleError(tc('errors.required'));
      return;
    }
    actions.addAdHoc(value);
    setTitle('');
    setTitleError(undefined);
  }

  return (
    <Card as="section" aria-labelledby="week-suggestions">
      <CardHeader
        id="week-suggestions"
        title={t('suggest.title')}
        subtitle={t('suggest.description')}
        actions={
          signedIn && list.length > 1 ? (
            <Button
              size="sm"
              variant="secondary"
              leadingIcon={ListPlus}
              onClick={() =>
                actions.addTasks(
                  list.map((s) => s.task),
                  t('toast.addedMany', { count: list.length }),
                )
              }
            >
              {t('suggest.addAll')}
            </Button>
          ) : undefined
        }
      />
      <Stack gap="md">
        {suggestions === undefined ? (
          <SkeletonText lines={4} />
        ) : list.length === 0 ? (
          <EmptyState
            size="compact"
            title={t('suggest.emptyTitle')}
            description={t('suggest.emptyBody')}
          />
        ) : (
          <>
            <Checklist label={t('suggest.list')}>
              {shown.map(({ task, status }) => {
                const name = text.taskName(task);
                const meta = [
                  text.dueText(status, today),
                  tc(`who.${task.who}`),
                  text.minutes(task.estimatedMinutes),
                ].join(' · ');
                return (
                  <ChecklistRow
                    key={task.id}
                    title={
                      <TextLink as={Link} to={paths.task(task.id)}>
                        {name}
                      </TextLink>
                    }
                    meta={meta}
                    status={<TaskStatusPill state={status.state} />}
                    color={text.categoryColor(task.category)}
                    action={
                      signedIn ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          leadingIcon={Plus}
                          aria-label={t('suggest.addTask', { task: name })}
                          onClick={() => actions.addTasks([task])}
                        >
                          {t('suggest.add')}
                        </Button>
                      ) : undefined
                    }
                  />
                );
              })}
            </Checklist>
            {hidden > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setExpanded(true)}>
                {t('suggest.showAll', { count: hidden })}
              </Button>
            )}
          </>
        )}

        {signedIn ? (
          <Stack as="form" gap="sm" onSubmit={addAdHoc} noValidate aria-label={t('adhoc.label')}>
            <Field label={t('adhoc.label')} hint={t('adhoc.hint')} error={titleError}>
              <Input
                value={title}
                onValueChange={(v) => {
                  setTitle(v);
                  if (titleError) setTitleError(undefined);
                }}
                placeholder={t('adhoc.placeholder')}
                maxLength={LIMITS.title}
              />
            </Field>
            <Stack direction="row" justify="end">
              <Button type="submit" variant="secondary" size="sm" leadingIcon={Plus}>
                {t('adhoc.submit')}
              </Button>
            </Stack>
          </Stack>
        ) : (
          !sessionPending && (
            <Stack direction="responsive" gap="sm" align="center" justify="between">
              <Text size="sm" tone="muted">
                {t('suggest.readOnly')}
              </Text>
              <SignInCta label={tc('nav.signIn')} />
            </Stack>
          )
        )}
      </Stack>
    </Card>
  );
}
