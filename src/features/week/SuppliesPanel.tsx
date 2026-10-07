import { ShoppingBasket } from 'lucide-react';
import type { SupplyNeed } from '../../domain/supplies';
import { useLang, useT } from '../../i18n';
import { l10n } from '../../shared/catalog-schema';
import { Badge, Card, CardHeader, Checkbox, EmptyState, Stack } from '../../ui';

export interface SuppliesPanelProps {
  needs: readonly SupplyNeed[];
  ticks: ReadonlySet<string>;
  onToggle: (supplyId: string, have: boolean) => void;
}

/** Shopping / prep list for the plan with local-only "have it" ticks. */
export function SuppliesPanel({ needs, ticks, onToggle }: SuppliesPanelProps) {
  const t = useT('week');
  const { lang } = useLang();
  const ready = needs.filter((n) => ticks.has(n.supply.id)).length;

  return (
    <Card as="section" aria-labelledby="week-supplies">
      <CardHeader
        id="week-supplies"
        title={t('supplies.title')}
        subtitle={t('supplies.description')}
        actions={
          needs.length > 0 ? (
            <Badge tone={ready === needs.length ? 'success' : 'neutral'} size="sm">
              {t('supplies.ready', { ready, total: needs.length })}
            </Badge>
          ) : undefined
        }
      />
      {needs.length === 0 ? (
        <EmptyState
          size="compact"
          icon={ShoppingBasket}
          title={t('supplies.emptyTitle')}
          description={t('supplies.emptyBody')}
        />
      ) : (
        <Stack gap="sm">
          {needs.map(({ supply, tasks }) => {
            const forTasks = tasks
              .map(({ task, note }) =>
                note ? `${l10n(task.name, lang)} (${l10n(note, lang)})` : l10n(task.name, lang),
              )
              .join(', ');
            const description = [
              t('supplies.for', { tasks: forTasks }),
              supply.whereToBuy ? t('supplies.whereToBuy', { where: supply.whereToBuy }) : null,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <Checkbox
                key={supply.id}
                checked={ticks.has(supply.id)}
                onCheckedChange={(have) => onToggle(supply.id, have)}
                label={l10n(supply.name, lang)}
                description={description}
                strikeWhenChecked
              />
            );
          })}
        </Stack>
      )}
    </Card>
  );
}
