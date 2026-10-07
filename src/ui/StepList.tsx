import { isValidElement, type ReactNode } from 'react';
import { cx } from './cx';

/** A step with its own title line and an optional explanation underneath. */
export interface TitledStep {
  title: ReactNode;
  description?: ReactNode;
}

export interface StepListProps {
  /**
   * One entry per step, in order. The component numbers them; don't put numbers in the text.
   * Either plain content, or `{ title, description? }` for a titled step.
   */
  steps: readonly (ReactNode | TitledStep)[];
  /** Accessible name of the list. */
  label?: string;
  /** Render titled steps' titles as headings of this level (so they show in a heading outline). */
  headingLevel?: 'h3' | 'h4';
  /** `2` lays the steps out in two columns from 768px (the dashed rule is then dropped). */
  columns?: 1 | 2;
  className?: string;
}

function isTitledStep(step: ReactNode | TitledStep): step is TitledStep {
  return typeof step === 'object' && step !== null && !isValidElement(step) && 'title' in step;
}

/** Numbered how-to steps, journal style: inked numerals on a dashed rule. */
export function StepList({ steps, label, headingLevel, columns = 1, className }: StepListProps) {
  const twoCols = columns === 2;
  const Title = headingLevel ?? 'span';
  return (
    <ol
      aria-label={label}
      className={cx(
        'm-0 flex list-none flex-col p-0',
        twoCols && 'md:grid md:grid-cols-2 md:gap-x-6 md:gap-y-4',
        className,
      )}
    >
      {steps.map((step, i) => (
        <li key={i} className={cx('relative flex gap-3 pb-4 last:pb-0', twoCols && 'md:pb-0')}>
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className={cx(
                'absolute bottom-0 left-[13px] top-8 border-l border-dashed border-line-strong',
                twoCols && 'md:hidden',
              )}
            />
          )}
          <span
            aria-hidden
            className="grid size-7 shrink-0 place-items-center rounded-full border border-primary/40 bg-primary-soft font-display text-sm font-semibold text-primary-soft-ink"
          >
            {i + 1}
          </span>
          {isTitledStep(step) ? (
            <div className="min-w-0 pt-0.5">
              <Title className="m-0 block font-display text-base font-semibold leading-snug text-ink">
                {step.title}
              </Title>
              {step.description !== undefined && (
                <span className="mt-0.5 block text-pretty text-sm text-ink-muted">
                  {step.description}
                </span>
              )}
            </div>
          ) : (
            <div className="min-w-0 pt-0.5 text-pretty leading-relaxed text-ink">{step}</div>
          )}
        </li>
      ))}
    </ol>
  );
}
