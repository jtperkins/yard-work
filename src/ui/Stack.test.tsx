import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Grid, Stack } from './Stack';

describe('Stack', () => {
  it('renders a flex column with a gap by default', () => {
    render(<Stack data-testid="s">x</Stack>);
    const el = screen.getByTestId('s');
    expect(el.tagName).toBe('DIV');
    expect(el).toHaveClass('flex', 'flex-col', 'gap-4');
  });

  it('supports row/responsive direction, alignment, wrap and element', () => {
    render(
      <Stack
        as="section"
        data-testid="s"
        direction="responsive"
        align="center"
        justify="between"
        wrap
        gap="sm"
      >
        x
      </Stack>,
    );
    const el = screen.getByTestId('s');
    expect(el.tagName).toBe('SECTION');
    expect(el).toHaveClass(
      'flex-col',
      'sm:flex-row',
      'items-center',
      'justify-between',
      'flex-wrap',
      'gap-2',
    );
  });
});

describe('Stack as a list', () => {
  it('resets list styles for ul/ol', () => {
    render(
      <Stack as="ol" gap="sm" aria-label="notes">
        <li>a</li>
      </Stack>,
    );
    const list = screen.getByRole('list', { name: 'notes' });
    expect(list.tagName).toBe('OL');
    expect(list).toHaveClass('list-none', 'p-0', 'flex-col', 'gap-2');
  });
});

describe('Grid', () => {
  it('maps column props to responsive classes', () => {
    render(
      <Grid data-testid="g" cols={2} mdCols={4} gap="sm">
        x
      </Grid>,
    );
    expect(screen.getByTestId('g')).toHaveClass('grid', 'grid-cols-2', 'md:grid-cols-4', 'gap-2');
  });

  it('gives the first column more room with ratio="wide-first"', () => {
    render(
      <Grid data-testid="g" lgCols={2} ratio="wide-first">
        x
      </Grid>,
    );
    const grid = screen.getByTestId('g');
    expect(grid).toHaveClass('lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]');
    expect(grid).not.toHaveClass('lg:grid-cols-2');
  });

  it('resets list styles when rendered as a list', () => {
    render(
      <Grid as="ul" aria-label="tiles">
        <li>a</li>
      </Grid>,
    );
    expect(screen.getByRole('list', { name: 'tiles' })).toHaveClass('list-none');
  });
});
