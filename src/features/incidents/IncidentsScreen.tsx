import { Plus, RefreshCw, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router';
import { paths } from '../../app/paths';
import { useIncidents } from '../../api';
import { useLang, useT } from '../../i18n';
import {
  Badge,
  Button,
  Callout,
  Card,
  Checklist,
  EmptyState,
  LinkButton,
  ListRow,
  PageHeader,
  Skeleton,
  Stack,
} from '../../ui';
import { useErrorMessage } from '../shared/errors';
import { formatWhen } from './time';

/** Route `/incidents` — reports of sightings, people poking around and trespassing. */
export function IncidentsScreen() {
  const t = useT('incidents');
  const tc = useT('common');
  const { lang } = useLang();
  const errorMessage = useErrorMessage();
  const query = useIncidents();

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <LinkButton as={Link} to={paths.incidentNew()} leadingIcon={Plus}>
            {t('report')}
          </LinkButton>
        }
      />
      <Stack gap="lg">
        {query.isError ? (
          <Callout
            tone="danger"
            title={tc('errors.loadFailed')}
            action={
              <Button
                size="sm"
                variant="secondary"
                leadingIcon={RefreshCw}
                onClick={() => void query.refetch()}
              >
                {tc('actions.retry')}
              </Button>
            }
          >
            {errorMessage(query.error)}
          </Callout>
        ) : !query.data ? (
          <Stack gap="sm" aria-busy="true" aria-label={tc('a11y.loading')}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} shape="block" height="4rem" />
            ))}
          </Stack>
        ) : query.data.length === 0 ? (
          <Card>
            <EmptyState icon={ShieldAlert} title={t('emptyTitle')} description={t('emptyBody')} />
          </Card>
        ) : (
          <Checklist label={t('list')}>
            {query.data.map((incident) => (
              <ListRow
                key={incident.id}
                as={Link}
                to={paths.incident(incident.id)}
                title={t(`type.${incident.type}`)}
                meta={[formatWhen(incident.occurredAt, lang), incident.location]
                  .filter(Boolean)
                  .join(' · ')}
                trailing={
                  incident.fileCount > 0 ? (
                    <Badge tone="neutral" size="sm">
                      {t('files', { count: incident.fileCount })}
                    </Badge>
                  ) : undefined
                }
              />
            ))}
          </Checklist>
        )}
      </Stack>
    </>
  );
}
