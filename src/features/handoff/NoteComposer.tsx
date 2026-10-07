import { useState, type FormEvent } from 'react';
import { FileText, Lock, Send } from 'lucide-react';
import { useAddNote } from '../../api';
import { useT } from '../../i18n';
import { LIMITS } from '../../shared/api-schemas';
import {
  Button,
  Card,
  CardHeader,
  Checkbox,
  Field,
  Stack,
  Text,
  Textarea,
  useToast,
} from '../../ui';

/** Writes a new handoff note (optionally pinned). The note appears at once (optimistic). */
export function NoteComposer() {
  const t = useT('handoff');
  const tc = useT('common');
  const { toast } = useToast();
  const addNote = useAddNote();
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent<HTMLElement>) => {
    event.preventDefault();
    const text = body.trim();
    if (!text) {
      setError(tc('errors.required'));
      return;
    }
    if (text.length > LIMITS.noteBody) {
      setError(tc('errors.tooLong', { max: LIMITS.noteBody }));
      return;
    }
    const draft = { body, pinned };
    addNote.mutate(
      { body: text, pinned },
      {
        onSuccess: () => toast({ title: t('composer.posted'), tone: 'success' }),
        onError: () => {
          toast({ title: t('composer.failed'), tone: 'danger' });
          // Give the text back unless something new was typed meanwhile.
          setBody((current) => (current === '' ? draft.body : current));
          setPinned((current) => current || draft.pinned);
        },
      },
    );
    setBody('');
    setPinned(false);
    setError(null);
  };

  return (
    <Card as="section" padding="md" aria-labelledby="handoff-composer">
      <CardHeader id="handoff-composer" as="h2" title={t('composer.title')} />
      <Stack as="form" gap="md" onSubmit={submit} noValidate>
        <Field label={t('composer.label')} error={error ?? undefined}>
          <Textarea
            rows={6}
            value={body}
            maxLength={LIMITS.noteBody}
            placeholder={t('composer.placeholder')}
            onValueChange={(value) => {
              setBody(value);
              if (error) setError(null);
            }}
          />
        </Field>
        {body === '' && (
          <Stack direction="row">
            <Button
              variant="ghost"
              size="sm"
              leadingIcon={FileText}
              onClick={() => setBody(t('composer.template'))}
            >
              {t('composer.useTemplate')}
            </Button>
          </Stack>
        )}
        <Checkbox
          checked={pinned}
          onCheckedChange={setPinned}
          label={t('composer.pin')}
          description={t('composer.pinHint')}
        />
        <Button type="submit" leadingIcon={Send} fullWidth>
          {t('composer.submit')}
        </Button>
        <Text size="xs" tone="subtle" icon={Lock}>
          {t('composer.privacy')}
        </Text>
      </Stack>
    </Card>
  );
}
