import type { ReactNode } from 'react';
import { useT } from '../../i18n';
import { ToastProvider } from '../../ui';

/** The ui ToastProvider with translated labels. Mount once inside LanguageProvider. */
export function AppToastProvider({ children }: { children: ReactNode }) {
  const t = useT('common');
  return (
    <ToastProvider
      dismissLabel={t('actions.close')}
      regionLabel={t('a11y.notifications')}
      actionHint={t('a11y.toastActionHint')}
    >
      {children}
    </ToastProvider>
  );
}
