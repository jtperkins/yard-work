import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Text } from './Text';

describe('Text', () => {
  it('renders a paragraph with default tone', () => {
    render(<Text>Hello</Text>);
    const el = screen.getByText('Hello');
    expect(el.tagName).toBe('P');
    expect(el).toHaveClass('text-ink', 'text-base');
  });

  it('applies size, tone, weight and line-preserving options', () => {
    render(
      <Text as="span" size="sm" tone="muted" weight="semibold" preLine tabular caps italic>
        Hi
      </Text>,
    );
    const el = screen.getByText('Hi');
    expect(el.tagName).toBe('SPAN');
    expect(el).toHaveClass(
      'text-sm',
      'text-ink-muted',
      'font-semibold',
      'whitespace-pre-line',
      'tabular-nums',
      'uppercase',
      'italic',
    );
  });

  it('keeps typed spacing and breaks long words when asked', () => {
    render(
      <Text preWrap breakWords>
        {'a  b'}
      </Text>,
    );
    expect(screen.getByText('a b', { normalizer: (t) => t.replace(/\s+/g, ' ') })).toHaveClass(
      'whitespace-pre-wrap',
      'break-words',
    );
  });

  it('puts a decorative icon before the text', () => {
    const Icon = (props: { className?: string }) => <svg data-testid="icon" {...props} />;
    render(
      <Text size="xs" icon={Icon}>
        Private
      </Text>,
    );
    expect(screen.getByTestId('icon')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Private')).toHaveClass('flex', 'items-center');
  });
});
