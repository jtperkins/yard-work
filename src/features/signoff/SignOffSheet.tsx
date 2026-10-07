import { Stamp } from 'lucide-react';
import { useId, useMemo, useState, type FormEvent } from 'react';
import {
  newId,
  useCatalog,
  useLatestCompletions,
  useSession,
  useSignOff,
  useUndoSignOff,
} from '../../api';
import { useLang, useT } from '../../i18n';
import { LIMITS } from '../../shared/api-schemas';
import { l10n, type Task } from '../../shared/catalog-schema';
import { compareISODate, isISODate, type ISODate } from '../../shared/dates';
import {
  Badge,
  Button,
  CategoryChip,
  ComboInput,
  DateInput,
  Field,
  Sheet,
  Stack,
  Text,
  Textarea,
  useToast,
} from '../../ui';
import { SignInCta } from '../shared/SignInCta';
import { useErrorMessage } from '../shared/errors';
import { useToday } from '../shared/today';

/**
 * FROZEN PROPS (Phase 1). Owned by feature agent A; agent B imports it. Do not change the prop
 * interface without reporting it — only additive optional props are allowed.
 *
 * Bottom sheet (mobile) / dialog (desktop) for signing off a piece of work:
 * fields "Done by" (default `defaultDoneBy`, else the session name; suggestions from
 * house.people + recent names), "Date" (default today in CR, may be backdated, never future)
 * and an optional "Note". Submitting calls the `useSignOff` mutation (src/api) with a
 * client-generated id, shows an Undo toast, then calls `onClose`.
 *
 * Exactly one of `task` (catalog task) or `adHocTitle` (ad-hoc work) identifies the work.
 *
 * Needs a `ToastProvider` above it (the app mounts `AppToastProvider`).
 */
export interface SignOffSheetProps {
  /** Whether the sheet is shown. */
  open: boolean;
  /** Called when the sheet should close (cancel, Esc, backdrop, or after a successful sign-off). */
  onClose: () => void;
  /** Catalog task being signed off; `null` for ad-hoc work (then `adHocTitle` is required). */
  task: Task | null;
  /** Title of ad-hoc (non-catalog) work, used when `task` is `null`. */
  adHocTitle?: string;
  /** Plan item this sign-off fulfils (Week screen). The server links + marks it done. */
  planItemId?: string;
  /** Pre-filled "Done by" (e.g. the plan item's assignee). Defaults to the session name. */
  defaultDoneBy?: string;
}

export function SignOffSheet(props: SignOffSheetProps) {
  // Mount the form only while open so every opening starts from fresh defaults.
  if (!props.open) return null;
  return <SignOffSheetOpen {...props} />;
}

interface Errors {
  doneBy?: string;
  doneOn?: string;
  note?: string;
}

function SignOffSheetOpen({
  onClose,
  task,
  adHocTitle,
  planItemId,
  defaultDoneBy,
}: SignOffSheetProps) {
  const t = useT('common');
  const { lang } = useLang();
  const { house } = useCatalog();
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
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  const workTitle = task ? l10n(task.name, lang) : (adHocTitle ?? '');
  const category = task ? house.categories[task.category] : undefined;

  const suggestions = useMemo(() => {
    const recent = (latest.data ?? [])
      .slice()
      .sort((a, b) => compareISODate(b.doneOn, a.doneOn))
      .map((c) => c.doneBy);
    return [...(session.name ? [session.name] : []), ...house.people, ...recent];
  }, [latest.data, house.people, session.name]);

  function validate(): Errors {
    const next: Errors = {};
    const who = doneBy.trim();
    if (!who) next.doneBy = t('errors.required');
    else if (who.length > LIMITS.name) next.doneBy = t('errors.tooLong', { max: LIMITS.name });
    if (!doneOn || !isISODate(doneOn)) next.doneOn = t('errors.required');
    else if (compareISODate(doneOn, today) > 0) next.doneOn = t('errors.futureDate');
    if (note.trim().length > LIMITS.note) next.note = t('errors.tooLong', { max: LIMITS.note });
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
        ...(task ? { taskId: task.id } : { title: workTitle }),
        doneOn,
        doneBy: who,
        note: note.trim() || undefined,
        planItemId,
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
      title: t('signOff.toast', { task: workTitle }),
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
              {t('signOff.submit')}
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
            {category ? (
              <CategoryChip label={l10n(category, lang)} color={category.color} size="sm" />
            ) : (
              <Badge tone="neutral" size="sm">
                {t('signOff.adHoc')}
              </Badge>
            )}
            {planItemId && (
              <Badge tone="info" size="sm">
                {t('signOff.fromPlan')}
              </Badge>
            )}
          </Stack>
        </Stack>

        {signedOut ? (
          <Stack gap="md" align="start">
            <Text tone="muted">{t('signOff.signInFirst')}</Text>
            <SignInCta size="md" />
          </Stack>
        ) : (
          <Stack as="form" id={formId} gap="md" onSubmit={submit} noValidate>
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
              label={t('fields.note')}
              optionalLabel={t('fields.optional')}
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
