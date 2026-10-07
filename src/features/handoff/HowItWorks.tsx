import { useT, type TKey } from '../../i18n';
import { Card, CardHeader, StepList } from '../../ui';

const STEPS = ['signOff', 'plan', 'track', 'notes', 'catalog', 'access'] as const;

/** Static "How this works" guide for whoever looks after the place next. */
export function HowItWorks() {
  const t = useT('handoff');
  return (
    <Card as="section" padding="md" aria-labelledby="handoff-how">
      <CardHeader id="handoff-how" as="h2" title={t('how.title')} subtitle={t('how.description')} />
      <StepList
        headingLevel="h3"
        columns={2}
        steps={STEPS.map((step) => ({
          title: t(`how.${step}.title` as TKey<'handoff'>),
          description: t(`how.${step}.body` as TKey<'handoff'>),
        }))}
      />
    </Card>
  );
}
