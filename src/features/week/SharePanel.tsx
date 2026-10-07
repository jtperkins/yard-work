import { MessageCircle, Printer } from 'lucide-react';
import { useT } from '../../i18n';
import type { Lang } from '../../i18n';
import { Button, Card, CardHeader, LanguageToggle, LinkButton, Stack, Text } from '../../ui';
import { whatsAppHref } from './weekText';

export interface SharePanelProps {
  message: string;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  onPrint: () => void;
}

/** WhatsApp share (own language control, Spanish by default) and the print button. */
export function SharePanel({ message, lang, onLangChange, onPrint }: SharePanelProps) {
  const t = useT('week');
  return (
    <Card as="section" aria-labelledby="week-share">
      <CardHeader id="week-share" title={t('share.title')} subtitle={t('share.description')} />
      <Stack gap="md">
        <LanguageToggle<Lang>
          value={lang}
          onChange={onLangChange}
          label={t('share.language')}
          size="sm"
        />
        <Card variant="sunken" padding="sm" aria-label={t('share.preview')} role="group">
          <Text size="sm" tone="muted" preLine lang={lang === 'es' ? 'es-CR' : 'en'}>
            {message}
          </Text>
        </Card>
        <Stack direction="row" gap="sm" wrap>
          <LinkButton
            href={whatsAppHref(message)}
            target="_blank"
            rel="noopener noreferrer"
            leadingIcon={MessageCircle}
            variant="primary"
          >
            {t('share.whatsapp')}
          </LinkButton>
          <Button variant="secondary" leadingIcon={Printer} onClick={onPrint}>
            {t('share.print')}
          </Button>
        </Stack>
      </Stack>
    </Card>
  );
}
