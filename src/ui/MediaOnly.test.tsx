import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MediaOnly } from './MediaOnly';

describe('MediaOnly', () => {
  it('hides print content on screen', () => {
    render(<MediaOnly media="print">paper</MediaOnly>);
    expect(screen.getByText('paper')).toHaveClass('hidden', 'print:block');
  });

  it('hides screen content when printing', () => {
    render(
      <MediaOnly media="screen" as="section">
        screen
      </MediaOnly>,
    );
    const el = screen.getByText('screen');
    expect(el.tagName).toBe('SECTION');
    expect(el).toHaveClass('print:hidden');
  });
});
