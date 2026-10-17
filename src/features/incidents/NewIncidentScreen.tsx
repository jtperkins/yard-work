import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { paths } from '../../app/paths';
import { isApiRequestError, newId, useCreateIncident, useUploadIncidentFile } from '../../api';
import { useT } from '../../i18n';
import {
  ALLOWED_TYPES,
  INCIDENT_LIMITS,
  INCIDENT_TYPES,
  type IncidentType,
} from '../../shared/api-schemas';
import {
  AttachmentList,
  Button,
  Callout,
  DateInput,
  Field,
  FileInput,
  Input,
  LinkButton,
  PageHeader,
  Select,
  Stack,
  Text,
  Textarea,
  TextLink,
  useToast,
  type AttachmentItem,
} from '../../ui';
import { useErrorMessage } from '../shared/errors';
import { canPreview, fileMediaType, fileProblem, formatBytes } from './mediaType';
import { fromCrLocalInput, toCrLocalInput } from './time';

const MB = 1024 * 1024;
const ACCEPT = [...Object.keys(ALLOWED_TYPES), '.heic', '.heif', '.mov'].join(',');

interface Pending {
  id: string;
  file: File;
  mediaType: string;
  previewSrc?: string;
  status: 'waiting' | 'uploading' | 'failed' | 'done';
}

interface Errors {
  when?: string;
  description?: string;
}

function previewFor(file: File, mediaType: string): string | undefined {
  if (!canPreview(mediaType) || typeof URL.createObjectURL !== 'function') return undefined;
  return URL.createObjectURL(file);
}

/** Route `/incidents/new` — what happened, who was involved and photos, videos or files. */
export function NewIncidentScreen() {
  const t = useT('incidents');
  const tc = useT('common');
  const navigate = useNavigate();
  const { toast } = useToast();
  const errorMessage = useErrorMessage();
  const create = useCreateIncident();
  const upload = useUploadIncidentFile();

  const [maxWhen] = useState(() => toCrLocalInput(new Date()));
  const [when, setWhen] = useState(maxWhen);
  const [type, setType] = useState<IncidentType>('sighting');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [people, setPeople] = useState('');
  const [files, setFiles] = useState<Pending[]>([]);
  const [fileError, setFileError] = useState<string>();
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  /** Set once the report itself is saved: from then on only the files can be retried. */
  const [savedId, setSavedId] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  // Free the object URLs used for thumbnails when the screen goes away.
  const previews = useRef<string[]>([]);
  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((url) => URL.revokeObjectURL?.(url));
  }, []);

  const patchFile = (id: string, status: Pending['status']) =>
    setFiles((list) => list.map((f) => (f.id === id ? { ...f, status } : f)));

  function addFiles(picked: File[]) {
    const problems: string[] = [];
    const accepted: Pending[] = [];
    let room = INCIDENT_LIMITS.maxFiles - files.length;
    for (const file of picked) {
      const problem = fileProblem(file);
      if (problem?.kind === 'type') {
        problems.push(t('file.typeNotAllowed', { name: file.name }));
      } else if (problem?.kind === 'size') {
        problems.push(
          t('file.tooLarge', { name: file.name, max: Math.round(problem.maxBytes / MB) }),
        );
      } else if (room <= 0) {
        problems.push(t('file.tooMany', { count: INCIDENT_LIMITS.maxFiles }));
        break;
      } else {
        room -= 1;
        const mediaType = fileMediaType(file);
        const previewSrc = previewFor(file, mediaType);
        if (previewSrc) previews.current.push(previewSrc);
        accepted.push({
          id: newId(),
          file,
          mediaType,
          status: 'waiting',
          ...(previewSrc ? { previewSrc } : {}),
        });
      }
    }
    setFileError(problems.length > 0 ? [...new Set(problems)].join(' ') : undefined);
    if (accepted.length > 0) setFiles((list) => [...list, ...accepted]);
  }

  async function uploadOne(incidentId: string, item: Pending): Promise<boolean> {
    patchFile(item.id, 'uploading');
    try {
      await upload.mutateAsync({ incidentId, file: item.file, mediaType: item.mediaType });
      patchFile(item.id, 'done');
      setUploadErrors(({ [item.id]: _gone, ...rest }) => rest);
      return true;
    } catch (error) {
      patchFile(item.id, 'failed');
      // A 413 carries a readable reason from the server ("Max 10 files…", "File too large").
      const message =
        isApiRequestError(error) && error.status === 413 ? error.message : errorMessage(error);
      setUploadErrors((errs) => ({ ...errs, [item.id]: message }));
      return false;
    }
  }

  async function submit(event: FormEvent<HTMLElement>) {
    event.preventDefault();
    if (busy || savedId) return;
    const found: Errors = {};
    const occurredAt = fromCrLocalInput(when);
    if (!occurredAt) found.when = t('form.errorWhen');
    else if (when > maxWhen) found.when = t('form.errorFuture');
    if (!description.trim()) found.description = t('form.errorWhat');
    setErrors(found);
    if (found.when || found.description || !occurredAt) return;

    setBusy(true);
    try {
      const saved = await create.mutateAsync({
        id: newId(),
        occurredAt,
        type,
        location: location.trim() || undefined,
        description: description.trim(),
        people: people.trim() || undefined,
      });
      const incidentId = saved.incident.id;
      setSavedId(incidentId);
      let failed = 0;
      for (const item of files) {
        if (!(await uploadOne(incidentId, item))) failed += 1;
      }
      if (failed === 0) void navigate(paths.incident(incidentId));
    } catch (error) {
      toast({ tone: 'danger', title: t('form.failed'), description: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  async function retry(id: string) {
    const item = files.find((f) => f.id === id);
    if (!item || !savedId) return;
    const ok = await uploadOne(savedId, item);
    if (ok && files.every((f) => f.id === id || f.status === 'done')) {
      void navigate(paths.incident(savedId));
    }
  }

  const items: AttachmentItem[] = files.map((f) => ({
    id: f.id,
    name: f.file.name,
    sizeLabel: formatBytes(f.file.size),
    ...(f.previewSrc ? { previewSrc: f.previewSrc } : {}),
    ...(f.status === 'uploading' || f.status === 'failed' || f.status === 'done'
      ? { status: f.status }
      : {}),
  }));
  const anyFailed = files.some((f) => f.status === 'failed');

  return (
    <>
      <PageHeader
        back={
          <TextLink as={Link} to={paths.incidents()} tone="muted" leadingIcon={ArrowLeft}>
            {t('form.back')}
          </TextLink>
        }
        title={t('form.title')}
      />
      <Stack as="form" gap="lg" onSubmit={(e) => void submit(e)} noValidate>
        {savedId && (
          <Callout
            tone={anyFailed ? 'warning' : 'success'}
            title={t('saved.title')}
            action={
              <LinkButton as={Link} to={paths.incident(savedId)} size="sm" variant="secondary">
                {t('saved.open')}
              </LinkButton>
            }
          >
            {anyFailed ? t('saved.failedBody') : undefined}
          </Callout>
        )}

        <Field label={t('form.when')} hint={t('form.whenHint')} error={errors.when} required>
          <DateInput
            withTime
            value={when}
            max={maxWhen}
            onValueChange={setWhen}
            disabled={savedId !== null}
          />
        </Field>
        <Field label={t('form.type')}>
          <Select
            value={type}
            onValueChange={(value) => setType(value as IncidentType)}
            disabled={savedId !== null}
            options={INCIDENT_TYPES.map((value) => ({ value, label: t(`type.${value}`) }))}
          />
        </Field>
        <Field label={t('form.where')} optionalLabel={tc('fields.optional')}>
          <Input
            value={location}
            onValueChange={setLocation}
            maxLength={INCIDENT_LIMITS.location}
            placeholder={t('form.wherePlaceholder')}
            disabled={savedId !== null}
          />
        </Field>
        <Field label={t('form.what')} hint={t('form.whatHint')} error={errors.description} required>
          <Textarea
            value={description}
            onValueChange={setDescription}
            rows={5}
            maxLength={INCIDENT_LIMITS.description}
            disabled={savedId !== null}
          />
        </Field>
        <Field label={t('form.people')} optionalLabel={tc('fields.optional')}>
          <Textarea
            value={people}
            onValueChange={setPeople}
            rows={3}
            maxLength={INCIDENT_LIMITS.people}
            placeholder={t('form.peoplePlaceholder')}
            disabled={savedId !== null}
          />
        </Field>

        <Stack gap="sm" align="start">
          <Text weight="semibold">{t('form.attachments')}</Text>
          <Text size="sm" tone="muted">
            {t('form.attachHint', {
              count: INCIDENT_LIMITS.maxFiles,
              image: INCIDENT_LIMITS.imageBytes / MB,
              video: INCIDENT_LIMITS.videoBytes / MB,
            })}
          </Text>
          <FileInput
            label={t('form.addFiles')}
            accept={ACCEPT}
            multiple
            onFiles={addFiles}
            disabled={busy || savedId !== null}
          />
          {fileError && (
            <Callout tone="danger" className="w-full">
              {fileError}
            </Callout>
          )}
          {items.length > 0 && (
            <AttachmentList
              className="w-full"
              label={t('file.list')}
              items={items}
              onRemove={
                savedId === null && !busy
                  ? (id) => setFiles((list) => list.filter((f) => f.id !== id))
                  : undefined
              }
              onRetry={(id) => void retry(id)}
              uploadingLabel={t('file.uploading')}
              failedLabel={t('file.failed')}
              removeLabel={t('file.remove')}
              retryLabel={t('file.retry')}
            />
          )}
          {Object.values(uploadErrors).map((message, i) => (
            <Text key={i} size="sm" tone="danger">
              {message}
            </Text>
          ))}
        </Stack>

        {savedId === null && (
          <Stack direction="row" gap="sm" wrap>
            <Button type="submit" loading={busy}>
              {t('form.submit')}
            </Button>
            <LinkButton as={Link} to={paths.incidents()} variant="ghost">
              {tc('actions.cancel')}
            </LinkButton>
          </Stack>
        )}
      </Stack>
    </>
  );
}
