import { useCallback } from 'react';
import { isApiRequestError, isConflict, isNetworkError, isUnauthorized } from '../../api';
import { useT } from '../../i18n';

/** Maps an API/mutation error to a translated, human sentence (common namespace). */
export function useErrorMessage(): (error: unknown) => string {
  const t = useT('common');
  return useCallback(
    (error: unknown) => {
      if (isUnauthorized(error)) return t('errors.unauthorized');
      if (isNetworkError(error)) return t('errors.network');
      if (isConflict(error)) return t('errors.conflict');
      if (isApiRequestError(error) && error.status === 404) return t('errors.notFound');
      return t('errors.generic');
    },
    [t],
  );
}
