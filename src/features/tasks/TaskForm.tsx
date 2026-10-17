import { useId, useState, type FormEvent } from 'react';
import { useT } from '../../i18n';
import {
  INTERVAL_UNITS,
  LIMITS,
  PRIORITIES,
  type IntervalUnit,
  type Priority,
  type Task,
  type TaskInput,
  type TaskKind,
} from '../../shared/api-schemas';
import {
  Button,
  DateInput,
  Disclosure,
  Field,
  Input,
  SegmentedControl,
  Select,
  Stack,
  Textarea,
} from '../../ui';

export interface TaskFormProps {
  /** The task being edited; omit for a new one. */
  initial?: Task;
  submitLabel: string;
  submitting?: boolean;
  onSubmit: (input: TaskInput) => void;
  onCancel: () => void;
}

interface Errors {
  title?: string;
  interval?: string;
  steps?: string;
  stepsEs?: string;
}

const UNIT_LABEL_KEY = {
  day: 'form.unitDay',
  week: 'form.unitWeek',
  month: 'form.unitMonth',
} as const satisfies Record<IntervalUnit, string>;

const lines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

function validateSteps(
  steps: string[],
  message: (key: 'errorSteps' | 'errorStep') => string,
): string | undefined {
  if (steps.length > LIMITS.steps) return message('errorSteps');
  if (steps.some((s) => s.length > LIMITS.step)) return message('errorStep');
  return undefined;
}

/**
 * Create / edit form for a task. It validates, then hands a complete `TaskInput` to `onSubmit`
 * (switching the kind sends explicit nulls for the fields that no longer apply).
 */
export function TaskForm({
  initial,
  submitLabel,
  submitting = false,
  onSubmit,
  onCancel,
}: TaskFormProps) {
  const t = useT('tasks');
  const tc = useT('common');
  const formId = useId();

  const [title, setTitle] = useState(initial?.title ?? '');
  const [kind, setKind] = useState<TaskKind>(initial?.kind ?? 'once');
  const [count, setCount] = useState(String(initial?.intervalCount ?? 1));
  const [unit, setUnit] = useState<IntervalUnit>(initial?.intervalUnit ?? 'week');
  const [dueOn, setDueOn] = useState(initial?.dueOn ?? '');
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'normal');
  const [steps, setSteps] = useState((initial?.steps ?? []).join('\n'));
  const [safety, setSafety] = useState(initial?.safety ?? '');
  const [titleEs, setTitleEs] = useState(initial?.titleEs ?? '');
  const [stepsEs, setStepsEs] = useState((initial?.stepsEs ?? []).join('\n'));
  const [errors, setErrors] = useState<Errors>({});

  function submit(event: FormEvent<HTMLElement>) {
    event.preventDefault();
    const found: Errors = {};
    const name = title.trim();
    if (!name) found.title = t('form.errorTitle');
    else if (name.length > LIMITS.title) found.title = tc('errors.tooLong', { max: LIMITS.title });
    const intervalCount = Number(count);
    if (
      kind === 'recurring' &&
      (!Number.isInteger(intervalCount) || intervalCount < 1 || intervalCount > 365)
    ) {
      found.interval = t('form.errorInterval');
    }
    const stepLines = lines(steps);
    const stepsEsLines = lines(stepsEs);
    const stepsMessage = (key: 'errorSteps' | 'errorStep') =>
      t(`form.${key}`, { max: key === 'errorSteps' ? LIMITS.steps : LIMITS.step });
    found.steps = validateSteps(stepLines, stepsMessage);
    found.stepsEs = validateSteps(stepsEsLines, stepsMessage);
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    onSubmit({
      title: name,
      titleEs: titleEs.trim() || null,
      steps: stepLines,
      stepsEs: stepsEsLines.length > 0 ? stepsEsLines : null,
      safety: safety.trim() || null,
      priority,
      ...(kind === 'recurring'
        ? { kind, intervalCount, intervalUnit: unit, dueOn: null }
        : { kind, intervalCount: null, intervalUnit: null, dueOn: dueOn || null }),
    });
  }

  return (
    <Stack as="form" id={formId} gap="lg" onSubmit={submit} noValidate>
      <Field label={t('form.title')} hint={t('form.titleHint')} error={errors.title} required>
        <Input value={title} onValueChange={setTitle} maxLength={LIMITS.title} autoComplete="off" />
      </Field>

      <SegmentedControl
        label={t('form.kind')}
        value={kind}
        onChange={setKind}
        options={[
          { value: 'once', label: t('form.kindOnce') },
          { value: 'recurring', label: t('form.kindRecurring') },
        ]}
      />

      {kind === 'recurring' ? (
        <Stack direction="row" gap="md" align="start" wrap>
          <Field label={t('form.every')} error={errors.interval} required>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={365}
              value={count}
              onValueChange={setCount}
              aria-label={t('form.intervalCount')}
            />
          </Field>
          <Field label={t('form.intervalUnit')}>
            <Select
              value={unit}
              onValueChange={(value) => setUnit(value as IntervalUnit)}
              options={INTERVAL_UNITS.map((u) => ({
                value: u,
                label: t(UNIT_LABEL_KEY[u]),
              }))}
            />
          </Field>
        </Stack>
      ) : (
        <Field label={t('form.dueOn')} hint={t('form.dueOnHint')}>
          <DateInput value={dueOn} onValueChange={setDueOn} />
        </Field>
      )}

      <Field label={t('form.priority')}>
        <Select
          value={priority}
          onValueChange={(value) => setPriority(value as Priority)}
          options={PRIORITIES.map((p) => ({ value: p, label: tc(`priority.${p}`) }))}
        />
      </Field>

      <Field label={t('form.steps')} hint={t('form.stepsHint')} error={errors.steps}>
        <Textarea value={steps} onValueChange={setSteps} rows={6} />
      </Field>

      <Field
        label={t('form.safety')}
        hint={t('form.safetyHint')}
        optionalLabel={tc('fields.optional')}
      >
        <Textarea value={safety} onValueChange={setSafety} rows={2} maxLength={LIMITS.safety} />
      </Field>

      <Disclosure
        summary={t('form.spanish')}
        defaultOpen={Boolean(initial?.titleEs || initial?.stepsEs?.length)}
      >
        <Field label={t('form.titleEs')} hint={t('form.spanishHint')}>
          <Input value={titleEs} onValueChange={setTitleEs} maxLength={LIMITS.title} />
        </Field>
        <Field label={t('form.stepsEs')} hint={t('form.stepsHint')} error={errors.stepsEs}>
          <Textarea value={stepsEs} onValueChange={setStepsEs} rows={6} />
        </Field>
      </Disclosure>

      <Stack direction="row" gap="sm" wrap>
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {tc('actions.cancel')}
        </Button>
      </Stack>
    </Stack>
  );
}
