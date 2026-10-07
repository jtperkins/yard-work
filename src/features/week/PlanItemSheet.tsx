import { CalendarX2, RotateCcw, Trash2 } from 'lucide-react';
import { useId, useMemo, useState, type FormEvent } from 'react';
import { useCatalog } from '../../api';
import { useT } from '../../i18n';
import { LIMITS, type PlanItem } from '../../shared/api-schemas';
import { Button, ComboInput, Field, Sheet, Stack, Text, Textarea } from '../../ui';
import type { PlanActions } from './usePlanActions';

export interface PlanItemSheetProps {
  item: PlanItem | null;
  title: string;
  /** Names to suggest for the assignee (recent assignees, people). */
  people: readonly string[];
  actions: PlanActions;
  onClose: () => void;
}

/** Edit a planned job: assignee + note, skip / put back, or remove it from the week. */
export function PlanItemSheet(props: PlanItemSheetProps) {
  if (!props.item) return null;
  return <PlanItemSheetOpen {...props} item={props.item} />;
}

function PlanItemSheetOpen({
  item,
  title,
  people,
  actions,
  onClose,
}: PlanItemSheetProps & { item: PlanItem }) {
  const t = useT('week');
  const tc = useT('common');
  const { house } = useCatalog();
  const formId = useId();
  const [assignee, setAssignee] = useState(item.assignee ?? '');
  const [note, setNote] = useState(item.note ?? '');
  const suggestions = useMemo(() => [...house.people, ...people], [house.people, people]);
  const skipped = item.status === 'skipped';

  function save(event: FormEvent<HTMLElement>) {
    event.preventDefault();
    actions.saveDetails(item, { assignee, note });
    onClose();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={t('edit.title')}
      description={title}
      closeLabel={tc('actions.close')}
      footer={
        <>
          <Button type="submit" form={formId}>
            {t('edit.save')}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {tc('actions.cancel')}
          </Button>
        </>
      }
    >
      <Stack gap="lg">
        <Stack as="form" id={formId} gap="md" onSubmit={save} noValidate>
          <Field
            label={tc('fields.assignee')}
            hint={t('edit.assigneeHint')}
            optionalLabel={tc('fields.optional')}
          >
            <ComboInput
              value={assignee}
              onValueChange={setAssignee}
              suggestions={suggestions}
              autoComplete="off"
              maxLength={LIMITS.name}
            />
          </Field>
          <Field label={tc('fields.note')} optionalLabel={tc('fields.optional')}>
            <Textarea
              value={note}
              onValueChange={setNote}
              placeholder={t('edit.notePlaceholder')}
              rows={2}
              maxLength={LIMITS.note}
            />
          </Field>
        </Stack>
        <Stack gap="sm">
          <Text size="xs" tone="subtle" weight="semibold" caps>
            {t('edit.moreActions')}
          </Text>
          <Stack direction="row" gap="sm" wrap>
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={skipped ? RotateCcw : CalendarX2}
              onClick={() => {
                actions.setStatus(item, skipped ? 'planned' : 'skipped');
                onClose();
              }}
            >
              {skipped ? t('edit.unskip') : t('edit.skip')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leadingIcon={Trash2}
              onClick={() => {
                actions.remove(item);
                onClose();
              }}
            >
              {t('edit.remove')}
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Sheet>
  );
}
