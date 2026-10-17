import { Stamp } from 'lucide-react';
import { useId, useMemo, useState, type FormEvent } from 'react';
import { newId, useLatestCompletions, useSession, useSignOff, useUndoSignOff } from '../../api';
import { useT } from '../../i18n';
import { LIMITS, type Task } from '../../shared/api-schemas';
import { compareISODate, isISODate, type ISODate } from '../../shared/dates';
import { KNOWN_PEOPLE } from '../../shared/people';
import {
  Badge,
  Button,
  ComboInput,
  DateInput,
  Field,
  Sheet,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
  useToast,
} from '../../ui';
import { SignInCta } from '../shared/SignInCta';
import { useErrorMessage } from '../shared/errors';
import { useTaskText } from '../shared/taskText';
import { useToday } from '../shared/today';

/**
 * FROZEN PROPS (Phase 1). Owned by feature agent A; agent B imports it. Do not change the prop
 * interface without reporting it — only additive optional props are allowed.
 *
 * Bottom sheet (mobile) / dialog (desktop) for signing off a piece of work:
 * fields "Done by" (default `defaultDoneBy`, else the session name; suggestions from
 * KNOWN_PEOPLE + recent names), "Date" (default today in CR, may be backdated, never future)
 * and a "Note". "Partially done" records progress without finishing the task and needs a note
 * saying what is left. Submitting calls the `useSignOff` mutation (src/api) with a
 * client-generated id, shows an Undo toast, then calls `onClose`.
 *
 * Needs a `ToastProvider` above it (the app mounts `AppToastProvider`).
 */
export interface SignOffSheetProps {
  /** Whether the sheet is shown. */
  open: boolean;
  /** Called when the sheet should close (cancel, Esc, backdrop, or after a successful sign-off). */
  onClose: () => void;
  /** Task being signed off (nothing is rendered while `null`). */
  task: Task | null;
  /** Pre-filled "Done by". Defaults to the session name. */
  defaultDoneBy?: string;
}

export function SignOffSheet(props: SignOffSheetProps) {
  // Mount the form only while open so every opening starts from fresh defaults.
  if (!props.open || !props.task) return null;
  return <SignOffSheetOpen {...props} task={props.task} />;
}

interface Errors {
  doneBy?: string;
  doneOn?: string;
  note?: string;
}

function SignOffSheetOpen({ onClose, task, defaultDoneBy }: SignOffSheetProps & { task: Task }) {
  const t = useT('common');
  const text = useTaskText();
  const session = useSession();
  const latest = useLatestCompletions();
  const signOff = useSignOff();
  const undo = useUndoSignOff();
  const { toast } = useToast();
  const errorMessage = useErrorMessage();
  const today = useToday();
  const formId = useId();

  // `null` until edited, so the session name can fill in once /api/me answers.
  const [doneByInput, setDoneBy] = useState<string | null>(null);
  const doneBy = doneByInput ?? defaultDoneBy ?? session.name ?? '';
  const [doneOn, setDoneOn] = useState<ISODate>(today);
  const [kind, setKind] = useState<'done' | 'partial'>('done');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  const workTitle = text.taskName(task);
  const partial = kind === 'partial';

  const suggestions = useMemo(() => {
    const recent = (latest.data ?? [])
      .slice()
      .sort((a, b) => compareISODate(b.doneOn, a.doneOn))
      .map((c) => c.doneBy);
    return [...(session.name ? [session.name] : []), ...KNOWN_PEOPLE, ...recent];
  }, [latest.data, session.name]);

  function validate(): Errors {
    const next: Errors = {};
    const who = doneBy.trim();
    if (!who) next.doneBy = t('errors.required');
    else if (who.length > LIMITS.name) next.doneBy = t('errors.tooLong', { max: LIMITS.name });
    if (!doneOn || !isISODate(doneOn)) next.doneOn = t('errors.required');
    else if (compareISODate(doneOn, today) > 0) next.doneOn = t('errors.futureDate');
    if (partial && !note.trim()) next.note = t('signOff.whatsLeftRequired');
    else if (note.trim().length > LIMITS.note)
      next.note = t('errors.tooLong', { max: LIMITS.note });
    return next;
  }

  function submit(event: FormEvent<HTMLElement>) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const id = newId();
    const who = doneBy.trim();
    const saved = signOff
      .mutateAsync({
        id,
        taskId: task.id,
        doneOn,
        doneBy: who,
        note: note.trim() || undefined,
        ...(partial ? { partial: true } : {}),
      })
      .then(
        () => true,
        (error: unknown) => {
          toast({
            tone: 'danger',
            title: t('signOff.failed'),
            description: errorMessage(error),
          });
          return false;
        },
      );

    toast({
      tone: 'success',
      title: t(partial ? 'signOff.toastPartial' : 'signOff.toast', { task: workTitle }),
      description: t('signOff.toastBy', { name: who }),
      action: {
        label: t('actions.undo'),
        onAction: () => {
          // Wait for the POST to land so the DELETE can't overtake it on a slow connection.
          void saved.then((ok) => {
            if (!ok) return;
            undo.mutateAsync(id).then(
              () => toast({ title: t('toast.undone') }),
              (error: unknown) =>
                toast({
                  tone: 'danger',
                  title: t('signOff.undoFailed'),
                  description: errorMessage(error),
                }),
            );
          });
        },
      },
    });
    onClose();
  }

  const signedOut = !session.isPending && !session.isSignedIn;

  return (
    <Sheet
      open
      onClose={onClose}
      title={t('signOff.title')}
      closeLabel={t('actions.close')}
      footer={
        signedOut ? undefined : (
          <>
            <Button type="submit" form={formId} leadingIcon={Stamp} disabled={session.isPending}>
              {t(partial ? 'signOff.submitPartial' : 'signOff.submit')}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              {t('actions.cancel')}
            </Button>
          </>
        )
      }
    >
      <Stack gap="lg">
        <Stack gap="sm">
          <Text size="lg" weight="semibold" display>
            {workTitle}
          </Text>
          <Stack direction="row" gap="sm" wrap align="center">
            <Badge tone="neutral" size="sm">
              {text.frequencyText(task)}
            </Badge>
          </Stack>
        </Stack>

        {signedOut ? (
          <Stack gap="md" align="start">
            <Text tone="muted">{t('signOff.signInFirst')}</Text>
            <SignInCta size="md" />
          </Stack>
        ) : (
          <Stack as="form" id={formId} gap="md" onSubmit={submit} noValidate>
            <SegmentedControl
              label={t('signOff.kind')}
              value={kind}
              onChange={setKind}
              fullWidth
              options={[
                { value: 'done', label: t('signOff.kindDone') },
                { value: 'partial', label: t('signOff.kindPartial') },
              ]}
            />
            <Field
              label={t('fields.doneBy')}
              hint={t('signOff.doneByHint')}
              error={errors.doneBy}
              required
            >
              <ComboInput
                value={doneBy}
                onValueChange={setDoneBy}
                suggestions={suggestions}
                autoComplete="off"
                maxLength={LIMITS.name}
              />
            </Field>
            <Field
              label={t('fields.date')}
              hint={t('signOff.dateHint')}
              error={errors.doneOn}
              required
            >
              <DateInput value={doneOn} onValueChange={setDoneOn} max={today} />
            </Field>
            <Field
              label={partial ? t('signOff.whatsLeft') : t('fields.note')}
              hint={partial ? t('signOff.whatsLeftHint') : undefined}
              optionalLabel={partial ? undefined : t('fields.optional')}
              required={partial}
              error={errors.note}
            >
              <Textarea
                value={note}
                onValueChange={setNote}
                placeholder={t('signOff.notePlaceholder')}
                rows={3}
                maxLength={LIMITS.note}
              />
            </Field>
          </Stack>
        )}
      </Stack>
    </Sheet>
  );
}
