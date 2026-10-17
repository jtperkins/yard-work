import { ArrowLeft, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { paths } from '../../app/paths';
import { useDeleteIncident, useIncident } from '../../api';
import { useLang, useT } from '../../i18n';
import {
  AttachmentList,
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  DetailList,
  EmptyState,
  PageHeader,
  SkeletonText,
  Stack,
  Text,
  TextLink,
  useToast,
  type AttachmentItem,
} from '../../ui';
import { useErrorMessage } from '../shared/errors';
import { canPreview, formatBytes } from './mediaType';
import { formatWhen } from './time';

/** Route `/incidents/:id` — one report with its attachments. */
export function IncidentDetailScreen() {
  const { id = '' } = useParams<{ id: string }>();
  const t = useT('incidents');
  const tc = useT('common');
  const { lang } = useLang();
  const navigate = useNavigate();
  const { toast } = useToast();
  const errorMessage = useErrorMessage();
  const query = useIncident(id);
  const remove = useDeleteIncident();
  const [confirming, setConfirming] = useState(false);

  const back = (
    <TextLink as={Link} to={paths.incidents()} tone="muted" leadingIcon={ArrowLeft}>
      {t('detail.back')}
    </TextLink>
  );

  if (!query.data) {
    return query.isPending ? (
      <>
        <PageHeader back={back} title="…" />
        <SkeletonText lines={4} />
      </>
    ) : (
      <>
        <PageHeader back={back} title={t('detail.notFoundTitle')} />
        <Card padding="lg">
          <EmptyState title={t('detail.notFoundBody')} />
        </Card>
      </>
    );
  }

  const { incident, files } = query.data;
  const items: AttachmentItem[] = files.map((file) => {
    const href = `/api/incidents/files/${encodeURIComponent(file.id)}`;
    return {
      id: file.id,
      name: file.fileName,
      sizeLabel: formatBytes(file.size),
      href,
      status: 'done',
      ...(canPreview(file.contentType) ? { previewSrc: href } : {}),
    };
  });

  const facts = [
    { key: 'when', label: t('detail.when'), value: formatWhen(incident.occurredAt, lang) },
    ...(incident.location
      ? [{ key: 'where', label: t('detail.where'), value: incident.location }]
      : []),
    ...(incident.people
      ? [{ key: 'people', label: t('detail.people'), value: incident.people }]
      : []),
  ];

  const confirmDelete = () => {
    remove.mutate(incident.id, {
      onSuccess: () => {
        toast({ tone: 'success', title: t('detail.deleted') });
        void navigate(paths.incidents(), { replace: true });
      },
      onError: (error) =>
        toast({
          tone: 'danger',
          title: t('detail.deleteFailed'),
          description: errorMessage(error),
        }),
    });
    setConfirming(false);
  };

  return (
    <>
      <PageHeader
        back={back}
        eyebrow={t('detail.reportedBy', { name: incident.reportedBy })}
        title={t(`type.${incident.type}`)}
        meta={<Badge tone="neutral">{formatWhen(incident.occurredAt, lang)}</Badge>}
        actions={
          <Button variant="ghost" leadingIcon={Trash2} onClick={() => setConfirming(true)}>
            {t('detail.delete')}
          </Button>
        }
      />
      <Stack gap="lg">
        <Card as="section" aria-labelledby="incident-what">
          <CardHeader id="incident-what" title={t('detail.description')} />
          <Stack gap="md">
            <Text>{incident.description}</Text>
            <DetailList items={facts} columns={2} />
          </Stack>
        </Card>

        <Card as="section" aria-labelledby="incident-files">
          <CardHeader id="incident-files" title={t('detail.attachments')} />
          {items.length === 0 ? (
            <Text tone="muted" size="sm">
              {t('detail.noAttachments')}
            </Text>
          ) : (
            <AttachmentList label={t('file.list')} items={items} />
          )}
        </Card>
      </Stack>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={confirmDelete}
        title={t('detail.deleteTitle')}
        description={t('detail.deleteBody')}
        confirmLabel={t('detail.deleteConfirm')}
        cancelLabel={tc('actions.cancel')}
        closeLabel={tc('actions.close')}
      />
    </>
  );
}
