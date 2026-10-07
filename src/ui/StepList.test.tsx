import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StepList } from './StepList';

describe('StepList', () => {
  it('renders an ordered list with one item per step and decorative numerals', () => {
    render(<StepList label="How to" steps={['Brush', 'Prime', 'Paint']} />);
    const list = screen.getByRole('list', { name: 'How to' });
    expect(list.tagName).toBe('OL');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[1]).toHaveTextContent('2Prime');
    expect(within(items[0]!).getByText('1')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('StepList titled steps', () => {
  it('renders titles as headings when asked, with descriptions', () => {
    render(
      <StepList
        label="How this works"
        headingLevel="h3"
        columns={2}
        steps={[{ title: 'Sign off', description: 'Tap the button.' }, { title: 'Plan the week' }]}
      />,
    );
    const list = screen.getByRole('list', { name: 'How this works' });
    expect(list).toHaveClass('md:grid-cols-2');
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Sign off',
      'Plan the week',
    ]);
    expect(within(list).getAllByRole('listitem')[0]).toHaveTextContent('Tap the button.');
  });

  it('keeps element steps as plain content', () => {
    render(<StepList steps={[<strong key="a">Bold step</strong>]} />);
    expect(screen.getByText('Bold step').tagName).toBe('STRONG');
    expect(screen.queryByRole('heading')).toBeNull();
  });
});
