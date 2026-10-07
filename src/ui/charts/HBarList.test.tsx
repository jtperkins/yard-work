import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HBarList } from './HBarList';

describe('HBarList', () => {
  it('labels every value and scales bars to max', () => {
    const { container } = render(
      <HBarList
        title="On-time rate"
        max={1}
        formatValue={(v) => `${Math.round(v * 100)}%`}
        items={[
          { key: 'lawn', label: 'Lawn', value: 0.9, detail: '9 of 10' },
          { key: 'cats', label: 'Cats', value: null },
        ]}
        emptyLabel="No data"
      />,
    );
    expect(screen.getByRole('figure', { name: 'On-time rate' })).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Lawn90%9 of 10');
    expect(items[1]).toHaveTextContent('CatsNo data');
    const fills = container.querySelectorAll<HTMLElement>('[aria-hidden] > span');
    expect(fills[0]!.style.width).toBe('90%');
    expect(fills[1]!.style.width).toBe('0%');
  });
});
