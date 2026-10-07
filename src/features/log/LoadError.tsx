import { CloudOff } from 'lucide-react';
import { useT } from '../../i18n';
import { Button, EmptyState } from '../../ui';

export interface LoadErrorProps {
  /** What failed, e.g. "Couldn't load the log." Defaults to the generic load error. */
  title?: string;
  onRetry: () => void;
}

/** Inline "couldn't load" state with a retry action, shared by the B-agent screens. */
export function LoadError({ title, onRetry }: LoadErrorProps) {
  const tc = useT('common');
  return (
    <div role="alert">
      <EmptyState
        size="compact"
        icon={CloudOff}
        title={title ?? tc('errors.loadFailed')}
        description={title ? tc('errors.loadFailed') : undefined}
        action={
          <Button size="sm" variant="secondary" onClick={onRetry}>
            {tc('actions.retry')}
          </Button>
        }
      />
    </div>
  );
}
