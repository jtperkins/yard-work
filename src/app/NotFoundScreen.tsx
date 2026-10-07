import { MapPinOff } from 'lucide-react';
import { Link } from 'react-router';
import { useT } from '../i18n';
import { Card, EmptyState, LinkButton, PageHeader } from '../ui';
import { paths } from './paths';

/** Catch-all route. */
export function NotFoundScreen() {
  const t = useT('common');
  return (
    <>
      <PageHeader title={t('notFound.title')} />
      <Card padding="lg">
        <EmptyState
          icon={MapPinOff}
          title={t('notFound.body')}
          action={
            <LinkButton as={Link} to={paths.board()} variant="primary">
              {t('notFound.home')}
            </LinkButton>
          }
        />
      </Card>
    </>
  );
}
