import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DetailList } from './DetailList';

describe('DetailList', () => {
  it('renders term/definition pairs', () => {
    render(
      <DetailList
        columns={2}
        items={[
          { key: 'a', label: 'Area', value: 'Lawn' },
          { key: 'b', label: 'Every', value: '7 days' },
        ]}
      />,
    );
    expect(screen.getAllByRole('term').map((t) => t.textContent)).toEqual(['Area', 'Every']);
    expect(screen.getAllByRole('definition').map((d) => d.textContent)).toEqual(['Lawn', '7 days']);
  });
});
