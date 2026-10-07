import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DayMark, DayMarkLegend, DayMarks } from './DayMarks';

describe('DayMark', () => {
  it('is decorative without a label and an img with one', () => {
    const { container, rerender } = render(<DayMark kind="done" color="cat-lawn" />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    rerender(<DayMark kind="due" color="cat-lawn" label="Projected due" />);
    expect(screen.getByRole('img', { name: 'Projected due' })).toHaveAttribute('data-kind', 'due');
  });

  it('exposes the colour token as --swatch', () => {
    const { container } = render(<DayMark kind="planned" color="cat-cats" />);
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue('--swatch')).toBe(
      'var(--cat-cats)',
    );
  });
});

describe('DayMarks', () => {
  it('renders nothing for no marks', () => {
    const { container } = render(<DayMarks marks={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('draws every mark when within the limit', () => {
    const { container } = render(
      <DayMarks
        marks={[
          { key: 'a', kind: 'done', color: 'cat-lawn' },
          { key: 'b', kind: 'due' },
        ]}
      />,
    );
    expect(container.querySelectorAll('[data-kind]')).toHaveLength(2);
    expect(container.textContent).toBe('');
  });

  it('collapses overflow into a +n tally', () => {
    const marks = Array.from({ length: 7 }, (_, i) => ({ key: String(i), kind: 'done' as const }));
    const { container } = render(<DayMarks marks={marks} max={4} />);
    expect(container.querySelectorAll('[data-kind]')).toHaveLength(3);
    expect(container.textContent).toBe('+4');
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('DayMarkLegend', () => {
  it('lists each kind with its mark and caption', () => {
    render(
      <DayMarkLegend
        label="Legend"
        items={[
          { kind: 'done', label: 'Signed off' },
          { kind: 'due', label: 'Comes due' },
        ]}
      />,
    );
    const rows = within(screen.getByRole('list', { name: 'Legend' })).getAllByRole('listitem');
    expect(rows.map((r) => r.textContent)).toEqual(['Signed off', 'Comes due']);
    expect(rows[1]?.querySelector('[data-kind="due"]')).not.toBeNull();
  });
});
